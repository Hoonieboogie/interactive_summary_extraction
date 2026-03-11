# Pipeline v2 — Map-Reduce Summarization Design

**Goal:** Extract 3-line Korean summaries and up to 10 keywords from 300K+ interactive educational content folders using local LLMs.

**Problem:** Educational content folders contain many files (HTML, JS, JSON, etc.) whose combined size can exceed the model's context window. Content can appear in any file at any position, so naive truncation risks missing educational material entirely.

**Solution:** Map-reduce approach — summarize each file individually (map), then recursively merge per-file summaries into a final result (reduce). Self-correcting retry handles context overflow without fixed token estimates.

---

## JSON Parsing (Lenient)

All LLM responses that expect JSON (Stage 1 ordering, Stage 2 per-file, Stage 3 merge) use the same lenient parser:
1. Find the first `{` and last `}` in the response, extract that substring (for object responses)
2. If no braces found, find the first `[` and last `]` (for array responses)
3. `json.loads()` the extracted substring
4. If nothing found or parse fails → fallback behavior depends on the stage (see each stage for details)

---

## Architecture Overview

```
Content Folder
  → Stage 1: File Discovery & Ordering
       - Try reading all files as text (skip binary)
       - LLM call to infer reading order from file list
  → Stage 2: Per-File Summarization (map)
       - Each file → LLM call with path + position context
       - Context overflow → chunk → summarize chunks → merge chunk summaries
       - Self-correcting: halve chunk size on overflow, retry
  → Stage 3: Recursive Merge (reduce)
       - Try merging all per-file summaries at once
       - Context overflow → pairwise tree merge (self-correcting)
  → Stage 4: Output
       - Save one JSON file per content to output directory
```

---

## Stage 1 — File Discovery & Ordering

### File Discovery
- Walk the content directory recursively
- Try reading every file as text: attempt UTF-8 first, then auto-detect encoding via `charset-normalizer` (handles EUC-KR, Shift_JIS, ISO-8859-1, etc.)
- Skip only files that fail all decode attempts (truly binary)
- Files that fail to decode are logged: `"<filepath>: cannot read as text (binary or encoding error)"`
- Read raw content — no regex stripping, no density checks, no filename-based filtering. The LLM handles all content filtering
- If a content folder has **zero readable text files**, log it to `skipped_contents.json` only. No output JSON is produced — the routing system handles these for future processing (Flash decompiler, Vision LLM, etc.).

### Sequence Ordering
A dedicated LLM call determines reading order:

1. Send the full list of discovered filenames (paths only, no content) to the LLM
2. The LLM returns a JSON object with files in optimal reading order:
   ```json
   {"ordered_files": ["intro.html", "page_01.html", "page_02.html", "quiz.html"]}
   ```
3. The LLM infers order from patterns like numbering (`page_01`, `slide_02`), naming conventions (`intro`, `activity`, `quiz`), and directory hierarchy — no hardcoded rules
4. **Validation:** After parsing, verify the response against the discovered file list. Filenames not in the discovered list are ignored. Discovered files missing from the response are appended at the end.
5. **Fallback:** If the ordering call returns unparseable output, retry once. If still unparseable, use alphabetical sort of file paths

### Output
Ordered list of `FileEntry(position, filepath, raw_content)`.

---

## Stage 2 — Per-File Summarization (Map)

For each file, send to the LLM with positional context:

```
[파일 정보]
경로: lesson/page_02.html
위치: 2 / 12

[파일 내용]
<raw file content>
```

### Per-File Prompt
The LLM is instructed to respond in JSON:

```json
{"has_educational_content": true, "summary": "이 파일은 분수의 덧셈과 뺄셈을 설명하며, 통분 개념을 단계별로 소개한다."}
```

Or for non-educational files:

```json
{"has_educational_content": false, "summary": "이 파일은 CSS/JS/설정 코드만 포함"}
```

The LLM acts as both filter and summarizer — no rule-based pre-filtering.

**Parse fallback:** If the response is unparseable, retry once. If still unparseable, treat the entire response as `{"has_educational_content": true, "summary": "<entire response>"}` (safe default — don't lose content).

### Context Overflow Handling (Self-Correcting)

Unified flow for all LLM calls in this stage:

1. Try sending the **entire file** to the LLM
2. If the LLM returns HTTP 400 "context too long":
   a. Split the file by character count at newline boundaries into chunks (start at 500K chars)
   b. Summarize each chunk with a **chunk prompt**: "Summarize the following portion of a file. Focus on any educational content. Respond with a plain text summary." If a chunk still overflows → halve chunk size, retry. Individual chunk summaries are internal plain text — no structured format required.
   c. Merge all chunk summaries into one file-level summary via an additional LLM call (chunk merge prompt: "Combine these chunk summaries into a single coherent summary for this file. Preserve all educational content."). The chunk merge returns the same per-file format: `{"has_educational_content": ..., "summary": "..."}`.
3. No fixed chars-per-token estimate — the retry loop handles varying token density (Korean ~1-2 chars/token, English ~4, code ~3-4)

No content is ever truncated or skipped.

---

## Stage 3 — Recursive Merge (Reduce)

### Standard Case
Send all per-file summaries (in sequence order, including non-educational) to the LLM. The LLM produces:
```json
{
  "summary": "첫째 줄. 둘째 줄. 셋째 줄",
  "keywords": ["키워드1", "키워드2", ...]
}
```

### Context Overflow Handling (Hybrid Merge)
If all per-file summaries fit in context → single merge call (standard case above).

If the LLM returns HTTP 400 "context too long" → fall back to pairwise tree merge:
1. Pair adjacent summaries: (summary_1 + summary_2) → merged_1_2, (summary_3 + summary_4) → merged_3_4, ... If odd number, the last unpaired summary carries forward to the next round as-is (no extra LLM call).
2. Each intermediate merge uses an **intermediate merge prompt**: "combine these summaries into a paragraph-length summary and extract keywords"
3. Each intermediate merge returns: `{"summary": "paragraph-length combined summary", "keywords": [...]}`
4. All keywords from every intermediate merge are accumulated
5. Merge pairs into the next level: (merged_1_2 + merged_3_4) → merged_1_2_3_4, ...
6. Repeat until a single final summary remains
7. Final merge uses a **final merge prompt**: "condense this summary into exactly 3 lines and select the best up to 10 keywords from the accumulated keyword pool"
8. Final merge receives the last intermediate summary + all accumulated keywords

**Parse fallback:** If a merge response is unparseable, retry once. If still unparseable, treat as `{"summary": "<entire response>", "keywords": []}`.

### No Educational Content
If all files return `has_educational_content: false`:
- Output: `{ "summary": "교육 및 학습과 관련된 내용이 없는 콘텐츠입니다.", "keywords": [] }`
- Skip the merge call entirely

---

## Stage 4 — Output

- Save one JSON file per content: `<output-dir>/<model>/<content_id>.json`
- Each file contains the per-content result (see Output Format below)
- The pipeline runs with a single model per invocation, selected via `--model`

---

## Output Format

### Per-content result
```json
{
  "content_id": "2018sah401_0301_0607",
  "model": "qwen3.5-27b",
  "summary": "첫째 줄. 둘째 줄. 셋째 줄",
  "keywords": ["키워드1", "키워드2", ...]
}
```

`content_id` is the folder name under `--content-dir` (e.g., `sample_contents/2018sah401_0301_0607/` → `"2018sah401_0301_0607"`).

---

## CLI Interface

```
uv run main.py --content-dir <path>           # Required: path to content folders
               --output-dir <path>            # Default: ./results
               --model <name>                 # Default: qwen3.5-27b
               --content-ids <id> [id]        # Specific content folders (default: all)
               --num-gpus <N>                 # Default: 1
               --skip-server                  # Use existing vLLM server
```

---

## Non-Text Content Logging

Content folders with zero readable text files are logged to `<output-dir>/skipped_contents.json`:

```json
[
  {
    "content_id": "flash_only_content",
    "reason": "no_text_files",
    "file_types_found": [".swf", ".fla", ".png"]
  }
]
```

---

## Known Limitations

| Gap | Reason | Future Approach |
|---|---|---|
| Flash binary (SWF/FLA) | Text compiled in binary, not readable as text | Flash decompiler or Vision LLM |
| Image-only content | Text baked into images/diagrams | Vision LLM |
| Audio-only content | Narration without transcript | Speech-to-text (Whisper) |

These content types are logged to `skipped_contents.json` by the non-text content logging system for future routing to appropriate extraction modules.

---

## Model

| Model | HuggingFace ID | Architecture | Context | VRAM (FP8) | License |
|---|---|---|---|---|---|
| Qwen3.5-27B | `Qwen/Qwen3.5-27B-FP8` | Dense, 27B | 262K tokens | ~31 GB | Apache 2.0 |

### Deployment
- Requires **vLLM nightly** build
- FP8 quantization (~31 GB) fits on single H100 80GB with ~49 GB left for KV cache
- `--num-gpus` for multi-GPU tensor parallelism

### Modular Config
Model configuration is defined in a single config module (`config.py`). Each model is a dataclass entry with: name, HuggingFace ID, max-model-len, vLLM serve arguments. Adding a new model = adding a new entry. The pipeline code never references a specific model — it reads from config.
