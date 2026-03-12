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

## Chunking Infinite Loop (TODO)

**Problem**: `_summarize_chunks` in `stage2_map.py` enters infinite recursion on large files (`data.js`). The halving always logs `687424` — the sub-chunk size is not actually decreasing across recursive calls. Needs investigation and fix.
