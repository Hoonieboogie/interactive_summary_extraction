# Run Test 2 — Analysis (2026-03-13)

## Error Analysis

### Known Errors (from terminal output)

1. **`data.js` — Empty content (thinking-only response)**
   - Overflowed context → chunked → a chunk's LLM response used entire generation budget on thinking tokens → `content` field empty → `ValueError`
   - `finished_reason=length` in vLLM metrics (1 occurrence)
   - Error handler in `main.py:84` treats `ValueError` as "unexpected" (logs full traceback). Should be expected.

2. **`aspen-runscript-1.0.js` — Read timeout (3/3 retries exhausted)**
   - Large JS file, chunked, chunk call exceeded 300s HTTP timeout
   - 3 retry attempts, all timed out

### Inferred Errors (from vLLM metrics gap)

| Metric | Count |
|--------|-------|
| TTFT events (requests started) | 46 |
| E2E completions | 41 |
| Successful (stop) | 40 |
| Truncated (length) | 1 |
| **Requests never completed (likely timeouts)** | **5** |

- `aspen-runscript-1.0.js` accounts for 3 of the 5 (3 retry attempts).
- **2 additional timed-out requests are unidentifiable** — terminal output scrolled off.
- Pipeline result JSON reports only 32 LLM calls and 7 overflow retries — timeouts and empty-content errors are not reflected in these counts.

### Root Causes

1. **Thinking token budget exhaustion**: `--reasoning-parser qwen3` separates thinking from content, but both share the same generation token budget (`max_model_len - prompt_tokens`). Large prompts leave little room → model thinks too long → truncated before producing content.

2. **300s HTTP timeout too tight**: With reasoning-parser, large-prompt requests take longer (extensive thinking + prefill). 300s is insufficient for the largest files.

3. **No persistent logging**: Pipeline logs only to stdout. Terminal scrollback lost critical error information.

## Action Items

### Must Fix
- [ ] Add file logging to pipeline (write to `<output_dir>/<content_id>.log` alongside JSON result)
- [ ] Add `ValueError` to expected error list in `main.py:84`
- [ ] Set explicit `max_tokens` or `max_completion_tokens` to reserve generation budget for content after thinking

### Should Fix
- [ ] Increase HTTP timeout for chunked calls (300s → 600s), or make it configurable
- [ ] Log skipped files and failure reasons in the result JSON (currently invisible)

### Nice to Have
- [ ] Retry with `enable_thinking=false` as fallback when content is empty
- [ ] Add per-file status tracking in result JSON (success/skipped/error per file)
