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
