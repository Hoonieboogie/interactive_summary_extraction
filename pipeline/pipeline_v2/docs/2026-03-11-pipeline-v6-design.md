# Pipeline v6.0 — Map-Reduce Summarization Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace truncation-based single-call summarization with a map-reduce approach that sees all content without loss.

**Problem:** v5.0 truncates content at 80K chars to fit 32K token context. Pre-filtered content ranges from 130K to 994K chars — truncation loses 40-92% of text. Educational material could be anywhere in the files, so truncation risks missing it entirely.

**Architecture:** Per-file LLM summarization with LLM-inferred sequence ordering, recursive merging, and self-correcting context overflow handling. No pre-filter — the LLM handles all noise filtering.

---

## Architecture Overview

```
Content Folder
  → Stage 1: File Discovery & Ordering
       - Read all text-based files
       - LLM call to infer reading order from file list
  → Stage 2: Per-File Summarization (map)
       - Each file → LLM call with path + position context
       - Oversized files → chunk → summarize → merge chunk summaries
       - Context overflow → retry with smaller chunks (self-correcting)
  → Stage 3: Recursive Merge (reduce)
       - Per-file summaries → batch merge → ... → final 3-line summary + keywords
       - Recursive if summaries exceed context
  → Stage 4: Comparison Report
```

---

## Stage 1 — File Discovery & Ordering

### File Discovery
- Walk the content directory recursively
- Read all text-based files: .html, .htm, .js, .json, .asp, .xml, .txt, .csv, .php, .jsp, .xhtml, .svg
- Skip: binary files, .min.js, .min.css, node_modules
- Read raw content — no regex stripping, no density checks, no pre-filter
- If a content folder has **zero text-based files**, log it for future routing to a non-text extraction module (Vision LLM, Flash decompiler, etc.) and output a fixed message

### Sequence Ordering
A dedicated LLM call determines reading order:

1. Send the full list of discovered filenames (paths only, no content) to the LLM
2. Ask the LLM to return the files in optimal reading order based on naming patterns, directory structure, and conventions
3. The LLM infers order from patterns like numbering (`page_01`, `slide_02`), naming conventions (`intro`, `activity`, `quiz`), and directory hierarchy — no hardcoded rules

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
The LLM responds with:
- `has_educational_content: true/false`
- `summary`: educational content summary, or "이 파일은 CSS/JS/설정 코드만 포함"

The LLM acts as both filter and summarizer — no rule-based pre-filtering.

### Oversized File Handling
If a file exceeds the model's context limit:
1. Split by character count at newline boundaries into chunks
2. Summarize each chunk with the per-file prompt
3. Merge chunk summaries into one file-level summary via an additional LLM call

### Context Overflow Retry (Self-Correcting)
The system does NOT use a fixed chars-per-token estimate. Instead:
1. Start with an initial chunk size estimate (e.g., 80K chars)
2. If the LLM returns HTTP 400 "context too long", reduce chunk size (e.g., halve it) and retry
3. This handles varying token density (Korean ~1-2 chars/token, English ~4, code ~3-4) without guessing

No content is ever truncated or skipped.

---

## Stage 3 — Recursive Merge (Reduce)

### Standard Case
Send all per-file summaries (in sequence order) to the LLM. The LLM produces:
```json
{
  "summary": "첫째 줄. 둘째 줄. 셋째 줄",
  "keywords": ["키워드1", "키워드2", ...]
}
```

### Recursive Merge (for many files)
If the combined per-file summaries exceed the model's context:
1. Split summaries into batches that fit in context
2. Merge each batch into an intermediate summary
3. Repeat until all intermediate summaries fit in a single final merge call
4. Final call produces the 3-line summary + up to 10 keywords

### No Educational Content
If all files return `has_educational_content: false`:
- Output: `{ "summary": "교육 및 학습과 관련된 내용이 없는 콘텐츠입니다.", "keywords": [] }`
- Skip the merge call entirely

---

## Stage 4 — Comparison Report

- Run Stages 1-3 for each selected model sequentially
- Generate terminal table (Rich) + HTML report
- Per-model JSON output with per-file summaries, keywords, LLM call counts, latency

---

## Output Format

### Per-content result
```json
{
  "content_id": "2018sah401_0301_0607",
  "summary": "첫째 줄. 둘째 줄. 셋째 줄",
  "keywords": ["키워드1", "키워드2", ...],
  "file_summaries": [
    {
      "file_path": "index.html",
      "position": 1,
      "has_educational_content": true,
      "summary": "..."
    }
  ],
  "total_files": 14,
  "llm_calls": 16,
  "prompt_tokens": 45000,
  "completion_tokens": 500,
  "latency_ms": 12000
}
```

---

## CLI Interface

```
uv run main.py --content-dir <path>           # Required: path to content folders
               --output-dir <path>            # Default: ./results
               --models <name> [name]         # Default: all three models
               --content-ids <id> [id]        # Specific content folders (default: all)
               --num-gpus <N>                 # Default: 1
               --skip-server                  # Use existing vLLM server
```

---

## Non-Text Content Logging

Content folders with zero text-based files are logged to `<output-dir>/skipped_contents.json`:

```json
[
  {
    "content_id": "flash_only_content",
    "reason": "no_text_files",
    "file_types_found": [".swf", ".fla", ".png"]
  }
]
```

These contents are candidates for a future non-text extraction module (Vision LLM, Flash decompiler, speech-to-text).

---

## Changes vs v5.0

| Aspect | v5.0 | v6.0 |
|---|---|---|
| Pre-filter | Regex stripping + density check | None — LLM handles all filtering |
| LLM calls per content | 1 | 1 ordering + N files + merge calls |
| Truncation | Hard cut at 80K chars | Never — retry with smaller chunks |
| Context overflow | Fatal error | Self-correcting retry |
| Sequence awareness | None | LLM-inferred reading order |
| Merge strategy | N/A (single call) | Recursive merge for large file sets |
| Output | Summary only | Summary + up to 10 keywords |
| Content selection | All only | All or specific via `--content-ids` |
| Non-text content | Silently skipped | Logged for future routing |

## Known Limitations (Carried from v5)

| Gap | Reason | Future Approach |
|---|---|---|
| Flash binary (SWF/FLA) | Text compiled in binary, not readable as text | Flash decompiler or Vision LLM |
| Image-only content | Text baked into images/diagrams | Vision LLM |
| Audio-only content | Narration without transcript | Speech-to-text (Whisper) |

These content types will be detected by the non-text content logging system and routed to appropriate extraction modules when available.

## Models

| Model | Context Limit | max-model-len (config) |
|---|---|---|
| EXAONE 4.0 32B | 32K tokens | 32768 |
| Qwen3-32B | 32K tokens (131K native) | 32768 |
| Qwen3.5-35B-A3B | 32K tokens (256K native) | 32768 |

Note: max-model-len is set to 32K for VRAM constraints on single H100 80GB. Can be increased with multi-GPU using `--num-gpus`.
