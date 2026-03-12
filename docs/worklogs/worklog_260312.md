# Worklog 2026-03-12

## CUDA 12.8 Upgrade for flashinfer Compatibility

**Problem**: vLLM server crashed on first inference request with flashinfer 0.6.4 JIT compilation errors:
```
namespace "cuda::ptx" has no member "tensormap_replace_global_dim"
namespace "cuda::ptx" has no member "fence_proxy_tensormap_generic"
namespace "cuda::ptx" has no member "n32_t"
```

**Investigation**:
- The 500 error from vLLM was actually a flashinfer JIT compilation failure, not an OOM or generation error
- flashinfer 0.6.4 uses PTX ISA 83 APIs (`tensormap_replace_global_dim`, `fence_proxy_tensormap_generic`, `n32_t`) that require CUDA 12.8+
- RunPod default template ships with CUDA 12.4
- `VLLM_ATTENTION_BACKEND=FLASH_ATTN` and `VLLM_DISABLE_FLASHINFER=1` did NOT help — vLLM 0.17.1 uses flashinfer for Qwen3.5's GDN (Gated Delta Network) attention kernels, not just the attention backend
- Downgrading flashinfer to 0.5.x also failed — `flashinfer.gdn_prefill` module only exists in 0.6.x+
- NVIDIA driver 580.x already supports CUDA 12.8+ runtime — only the toolkit (nvcc/headers) needed upgrading

**Fix**:
- Installed minimal CUDA 12.8 toolkit: `cuda-nvcc-12-8`, `cuda-cudart-dev-12-8`, `cuda-cccl-12-8`
- Cleared stale flashinfer JIT cache (`/root/.cache/flashinfer`)
- Updated `pipeline/setup_runpod.sh` to auto-detect CUDA version and upgrade to 12.8 if needed
- Updated README with CUDA 12.8 requirement note

**Result**: vLLM server starts successfully, flashinfer JIT compiles cleanly, inference returns 200 OK.

---

## vLLM 500 Error Retry Logic

**Problem**: Pipeline crashed on any 500 error from vLLM with no retry.

**Fix** (`llm_client.py`):
- Added retry logic with exponential backoff (3 attempts, 5s/10s/20s delays) for 500+ server errors
- Check both 400 and 500 responses for context overflow keywords (vLLM inconsistently uses either)
- Log the response body on server errors for diagnosis
- Extracted helper functions `_extract_error_message()` and `_is_context_overflow()` for cleaner error handling

---

## Claude Code Setup Script

Created `pipeline/setup_claude.sh` — separate from pipeline deps:
- Installs Claude Code via npm
- Persists SSH key to `/workspace/.ssh/` (network volume) and restores on pod recreation
- Sets git identity and switches remote to SSH

---

## README Overhaul

- Rewrote all setup/run instructions as single-line copy-paste commands
- Separated first-time setup vs pod recreation flows with clear steps
- Updated project structure to include new files

---

## Chunking Infinite Loop (FIXED)

**Problem**: `_summarize_chunks` in `stage2_map.py` enters infinite recursion on large files (`data.js` in content `2018sah401_0301_0607`). The chunk size never converges — each recursion level halves once then recurses, resetting `chunk_size = len(chunk)` at the top. Logged `687424` indefinitely.

**Fix**: Two changes:
1. Replaced recursive `_summarize_chunks` with iterative work queue — overflowing chunks get halved and prepended back to the queue. Added `MIN_CHUNK_SIZE = 10_000` floor.
2. Fixed `split_into_chunks` to force-split lines longer than `chunk_size` (e.g. minified JS). Previously, a single long line would pass through unsplit, causing the chunk size to never decrease.

**Verified**: Pipeline successfully processed `data.js` — chunked to 65536 chars, multiple chunks got 200 OK. No infinite loop.

**Details**: See `pipeline/pipeline_v2/error_log.md` for full root cause analysis.

---

## LLM Call Count Tracking

Added `llm_calls` field to the per-content output JSON. Accumulates all LLM calls across ordering, per-file summarization, and merge stages.

---

## httpx.ReadTimeout on Large Chunks (TESTING)

**Problem**: After chunking fix, pipeline crashed with `httpx.ReadTimeout` on ~65K-char chunks. `initial_chunk_size = max_model_len * 2 = 131072` chars meant that after halving on overflow, chunks were ~65K chars — nearly filling the entire 65536-token context window. This left almost no room for output tokens, making vLLM inference extremely slow (>300s).

**Root cause**: Static `initial_chunk_size` assumed fixed char-to-token ratio, but this varies widely (English ~4 chars/token, Korean ~2-3, minified JS ~3-4).

**Fix attempt 1 — Dynamic chunk sizing (FAILED)**: Parsed actual token count from vLLM overflow errors to compute real `chars_per_token` ratio. However, vLLM clips reported tokens to `max_model_len + 1` (always `65537`) regardless of actual input, making the ratio wrong. Chunks only shrank by ~6% per retry (30+ retries to converge). Still timed out.

**Fix attempt 2 — Clipped token detection + ReadTimeout retry (TESTING)**:
1. Detect clipped token counts: if `chars_per_token > 4`, fall back to halving (fast convergence in ~4 steps)
2. Added `httpx.ReadTimeout` retry (3 attempts, exponential backoff) in `llm_client.py`
3. Removed static `initial_chunk_size` — chunk size computed dynamically from overflow errors
4. Reserves 4096 tokens for system prompt + model output (intermediate summaries can be lengthy)

---

## Pipeline Performance Metrics

Added content-agnostic performance metrics to the pipeline output JSON. These measure pipeline/LLM behavior regardless of input content structure or file formats.

**Three metric groups (all fixed-size output, no per-call bloat):**

1. **`wall_clock_seconds`** — `{total, ordering, map, reduce}`: end-to-end and per-stage wall-clock timing via `time.monotonic()`
2. **`overflow_retries`** — single int: count of `ContextOverflowError` retries across all stages (measures chunk sizing efficiency)
3. **`latency_stats`** — `{total, avg, max, min}`: aggregated LLM call durations

**Changes:**
- `llm_client.py`: added `duration_seconds` field to `LLMResponse`, timed around each HTTP call
- `stage2_map.py`: `_summarize_chunks` and `summarize_file` now return `overflow_retries` count as third element
- `main.py`: times each stage, aggregates latency stats from all `LLMResponse` durations, passes `metrics` dict to output
- `stage4_output.py`: `save_result` accepts optional `metrics` dict, includes in output JSON
- `docs/2026-03-11-pipeline-v2-design.md`: updated Output Format section with metrics schema and descriptions
