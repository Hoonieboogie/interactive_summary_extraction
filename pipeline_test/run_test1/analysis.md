# Run Test 1 — Analysis

## Run Info
- **Date**: 2026-03-13
- **Content ID**: `2018sah401_0301_0607`
- **Model**: Qwen/Qwen3.5-27B-FP8 (vLLM)
- **GPU**: H100 80GB (74.8GB VRAM used)

## Result: Functionally Broken Output

The pipeline completed without crashing (zero fatal errors, 59 LLM calls), but **the output is unusable**:

- **`summary`**: Contains ~15K chars of Qwen3.5's internal chain-of-thought reasoning ("Thinking Process: 1. Analyze the Request...") instead of the expected 3-line Korean summary.
- **`keywords`**: Empty array `[]` — extraction failed entirely.

The model *did* arrive at a correct summary in its reasoning (the drafted Korean sentences are visible deep inside the thinking block), but the pipeline never extracted it.

## Root Cause Analysis

### 1. Qwen3.5 Thinking Token Leak (CRITICAL)

Qwen3.5 is a reasoning model — it emits `<think>...</think>` blocks by default. The `parse_merge_result()` in `stage3_reduce.py` expects clean JSON but receives thinking tokens + JSON mixed output. It can't parse it, so it falls back to dumping raw text as `summary`.

**Fix options** (pick one):
1. Pass `enable_thinking=false` in the vLLM chat completion parameters (cleanest)
2. Strip `<think>...</think>` blocks before JSON parsing
3. Post-process: regex-extract the JSON object from within the reasoning output

### 2. Map Phase Is the Real Bottleneck (Not Reduce)

Monitoring initially pointed at reduce, but actual pipeline metrics tell a very different story:

| Stage | Wall Clock | % of Total |
|-------|-----------|------------|
| Ordering | 475s (8 min) | 10% |
| **Map** | **4147s (69 min)** | **87%** |
| Reduce | 139s (2.3 min) | 3% |

**22 overflow retries** (37% of all 59 calls) during map are the culprit. Files that exceed the context window get retried with truncated content, and each retry is another full LLM round-trip at ~44s average.

### 3. Monitoring vs. Reality Mismatch

vLLM Prometheus metrics (request counts, token counts) were used to infer which pipeline stage was running, but they **cannot distinguish stages**. The initial hypothesis (reduce = bottleneck) was wrong by a factor of 30x (69 min map vs 2.3 min reduce).

**Implication for production**: Explicit stage markers/labels are needed in logging or metrics to monitor correctly at scale.

## Quantitative Summary

| Metric | Value | Concern Level |
|--------|-------|--------------|
| Total wall time | 79 min (1 content) | High — 300K contents = impractical |
| LLM calls | 59 | Moderate — 37 useful + 22 retries |
| Overflow retry rate | 37% | **High** — wasted compute |
| Total tokens | 1.88M (1.63M prompt + 248K gen) | High cost per content |
| Output quality | Broken (thinking leak) | **Critical** |

## Priority Action Items

1. **P0 — Fix thinking token leak**: `enable_thinking=false` or strip `<think>` blocks. Without this, every result is garbage.
2. **P1 — Reduce overflow retries**: Better upfront content chunking or context budget estimation before sending to the LLM. Cutting retries from 22 to ~5 could halve map time.
3. **P2 — Pre-compile flashinfer kernels**: Bake into Docker image to eliminate 7-min cold start.
4. **P3 — Add stage-level metrics**: Tag LLM calls with stage labels so monitoring actually reflects reality.
5. **P3 — Write intermediate results**: Crash recovery + debuggability for a 79-min pipeline.

## Production Viability Estimate

At current performance (79 min/content, 1.88M tokens), processing 300K contents would take:
- **~395K GPU-hours** (single-threaded)
- **~$1.5M+ in compute** at typical H100 rates

Fixing the overflow retry issue alone (P1) could bring this to ~40 min/content, cutting cost roughly in half. The thinking token fix (P0) doesn't affect runtime but is required for any output to be usable.
