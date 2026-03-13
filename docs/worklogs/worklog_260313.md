# Worklog 2026-03-13

## First Full Pipeline Test (Content: `2018sah401_0301_0607`)

Ran the pipeline end-to-end on a single content using Qwen3.5-27B-FP8 on H100 80GB.

**Result**: Pipeline completed without fatal errors (59 LLM calls, zero aborts), but the output is **functionally broken**.

---

## Pipeline Run Observations & Analysis

Performed real-time monitoring of the pipeline run via vLLM Prometheus metrics, then compared against actual pipeline metrics after completion. Full observations and analysis saved to `pipeline_test/run_test1/`.

### Key Findings

1. **Qwen3.5 Thinking Token Leak (CRITICAL)**: The final `summary` field contains ~15K chars of chain-of-thought reasoning ("Thinking Process: ...") instead of the expected 3-line Korean summary. `keywords` array is empty. Root cause: Qwen3.5 emits `<think>...</think>` blocks by default, and `parse_merge_result()` in stage3_reduce.py can't parse the mixed output as JSON.

2. **Map phase is the real bottleneck**: Actual wall clock — ordering 475s (10%), **map 4147s / 69 min (87%)**, reduce 139s (3%). Initial monitoring incorrectly attributed the bottleneck to reduce phase.

3. **37% overflow retry rate**: 22 of 59 LLM calls were overflow retries during map. This is the primary driver of the 69-min map phase.

4. **Monitoring vs. reality mismatch**: vLLM Prometheus metrics cannot distinguish pipeline stages without explicit stage markers. The monitoring-inferred timeline was significantly wrong about which stage was running.

### Performance Metrics

| Metric | Value |
|--------|-------|
| Total wall time | 4761s (~79 min) |
| LLM calls | 59 (37 useful + 22 retries) |
| Total tokens | 1.88M (1.63M prompt + 248K gen) |
| Avg latency | 44.4s/call |
| Max latency | 87.8s |

---

## File Organization

- Created `pipeline_test/run_test1/` directory structure for test results
- Moved `pipeline/pipeline_v2/pipeline_run_observations.md` to `pipeline_test/run_test1/`
- Created `pipeline_test/run_test1/analysis.md` with full root cause analysis and priority action items

---

## Next Steps (Priority Order)

1. **P0**: Fix thinking token leak — `enable_thinking=false` or strip `<think>` blocks
2. **P1**: Reduce overflow retries — better content chunking or context budget estimation
3. **P2**: Pre-compile flashinfer kernels in Docker image
4. **P3**: Add stage-level metrics labels to LLM calls
