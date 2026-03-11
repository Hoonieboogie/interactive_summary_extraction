# Pipeline v6.0 — Map-Reduce Summarization Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace truncation-based single-call summarization with a map-reduce approach that sees all content without loss.

**Problem:** v5.0 truncates content at 80K chars to fit 32K token context. Pre-filtered content ranges from 130K to 994K chars — truncation loses 40-92% of text. Educational material could be anywhere in the files, so truncation risks missing it entirely.

**Architecture:** Per-file LLM summarization with sequence awareness, followed by a merge step. No pre-filter — the LLM handles all noise filtering. Oversized files are chunked and summarized hierarchically.

---

## Architecture Overview

```
Content Folder
  → Stage 1: File Discovery & Sequencing
       - Read all text-based files
       - Detect reading order (manifest or LLM-inferred)
  → Stage 2: Per-File Summarization (map)
       - Each file → LLM call with path + position context
       - Oversized files → chunk → summarize → merge chunk summaries
  → Stage 3: Final Merge (reduce)
       - All per-file summaries → LLM → 3-line educational summary
  → Stage 4: Comparison Report (unchanged)
```

---

## Stage 1 — File Discovery & Sequencing

### File Discovery
- Read all text-based files from the content directory
- Target extensions: .html, .htm, .js, .json, .asp, .xml, .txt, .csv, .php, .jsp
- Skip: binary files, .min.js, node_modules
- Read raw content — no regex stripping, no density checks

### Sequence Detection
Two strategies, tried in order:

1. **Manifest parsing**: Look for index.html or JSON config files that reference other files in the directory. Parse to extract page ordering (e.g., slide sequence, navigation order).
2. **LLM-inferred**: If no manifest found, pass the file list (names only) to the LLM and ask it to infer the reading order from naming patterns.

### Output
Ordered list of `(position, filepath, raw_content)` for each file.

---

## Stage 2 — Per-File Summarization (Map)

For each file, send to the LLM with positional context:

```json
{
  "file_path": "lesson/page_02.html",
  "position": "2 of 12",
  "total_files": 12,
  "content": "<raw file content>"
}
```

### Per-File Prompt
The LLM should respond with either:
- Educational content summary (what this file teaches)
- "This file contains only CSS/JS/styling/code — no educational content"

This makes the LLM the filter AND the summarizer.

### Oversized File Handling
If a single file exceeds the model's safe input limit (context - output tokens - system prompt):
1. Split the file by character count into chunks that fit
2. Summarize each chunk with the same per-file prompt
3. Merge chunk summaries into one file-level summary via an additional LLM call

No content is ever truncated or skipped.

---

## Stage 3 — Final Merge (Reduce)

Send all per-file summaries (in sequence order) to the LLM with the existing Korean 3-line summary prompt.

Since per-file summaries are short text, this always fits within context.

### Output
```json
{ "summary": "첫째 줄. 둘째 줄. 셋째 줄" }
```

---

## Stage 4 — Comparison Report (Unchanged)

- Run Stages 1-3 for each selected model sequentially
- Generate terminal table (Rich) + HTML report
- Per-model JSON output

---

## CLI Interface

```
uv run main.py --content-dir <path>           # Required: path to content folders
               --output-dir <path>            # Default: ./results
               --models <name> [name]         # Default: all three models
               --content-ids <id> [id]        # Default: all contents in content-dir
               --num-gpus <N>                 # Default: 1
               --skip-server                  # Use existing vLLM server
```

New option: `--content-ids` to select specific content folders instead of processing all.

---

## Changes vs v5.0

| Aspect | v5.0 (current) | v6.0 (proposed) |
|---|---|---|
| Pre-filter | Regex stripping + density check | None — LLM handles all filtering |
| LLM calls per content | 1 | N files + 1 merge (+ chunk calls if oversized) |
| Truncation | Hard cut at 80K chars | Never — all content is seen |
| Sequence awareness | None | Manifest-based or LLM-inferred |
| Per-file output | None | Per-file summary with path info |
| Content selection | All contents only | All or specific via `--content-ids` |

## What Stays the Same

- 3-model sequential comparison with `--models` selection
- vLLM server management (start/stop per model)
- `config.py` model definitions (ModelConfig, MODELS, VLLM_PORT, etc.)
- HTML + terminal comparison report generation
- Test infrastructure

## Models

| Model | Context Limit | Safe Input (minus output + system) |
|---|---|---|
| EXAONE 4.0 32B | 32K tokens | ~31K tokens |
| Qwen3-32B | 32K tokens | ~31K tokens |
| Qwen3.5-35B-A3B | 32K tokens (config) | ~31K tokens |

Note: Qwen3 supports 131K and Qwen3.5 supports 256K natively, but max-model-len is set to 32K for VRAM constraints. Can be increased with multi-GPU.
