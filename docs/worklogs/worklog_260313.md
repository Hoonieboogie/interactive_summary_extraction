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

| Metric          | Value                           |
| --------------- | ------------------------------- |
| Total wall time | 4761s (~79 min)                 |
| LLM calls       | 59 (37 useful + 22 retries)     |
| Total tokens    | 1.88M (1.63M prompt + 248K gen) |
| Avg latency     | 44.4s/call                      |
| Max latency     | 87.8s                           |

---

## File Organization

- Created `pipeline_test/run_test1/` directory structure for test results
- Moved `pipeline/pipeline_v2/pipeline_run_observations.md` to `pipeline_test/run_test1/`
- Created `pipeline_test/run_test1/analysis.md` with full root cause analysis and priority action items

---

## Optimization Strategy Discussion

Reviewed all improvement options against project constraints (universal/structure-agnostic pipeline, unknown content formats, correctness first).

### Decisions Made

1. **Thinking token fix — use `--reasoning-parser qwen3` server flag**

   - Disabling thinking (`enable_thinking=false`) risks degrading output quality since Qwen3.5 uses chain-of-thought to reason through complex tasks.
   - Stripping `<think>` blocks post-hoc is fragile and wasteful (tokens generated then discarded).
   - Best approach: `--reasoning-parser qwen3` on vLLM server — cleanly separates thinking into `reasoning_content` field and answer into `content` field. Zero quality risk, minimal code change.
2. **Pre-filtering files — deferred**

   - Heuristic-based filtering contradicts the project's core premise (structure-agnostic, universal extractor for unknown content formats).
   - A two-pass LLM approach (cheap classification pass → expensive summarization pass) is viable but adds complexity. Defer until correctness is validated.
3. **Token pre-estimation — approved**

   - Load Qwen3.5 tokenizer at startup, count tokens before each LLM call, pre-chunk to fit within `max_context * 0.6`.
   - Eliminates the 22 overflow retries (37% of calls) that dominated map phase runtime.
4. **Parallel map — approved**

   - Files in map phase are independent. Use `asyncio` + semaphore (concurrency ~4) with vLLM's continuous batching.
5. **Single-pass shortcut for small contents — approved**

   - If all files in a content fit in one context window, skip map-reduce entirely. One LLM call instead of dozens.
   - Many of the 300K contents are likely small enough for this fast path.
6. **Two-tier model — rejected**

   - Risk of smaller model missing educational content in code files outweighs speed gain. Not worth the complexity now.

### Rejected / Deferred

- Content-level parallelism (E) — deferred until single-content output is validated
- Two-tier model (G) — rejected for quality risk
- Heuristic file pre-filtering (B) — contradicts universal approach

---

## P0 Fix: Reasoning Parser for Thinking Token Separation (DONE)

**Research**: Confirmed via official Qwen3.5 model card and vLLM docs that Qwen3.5 uses `<think>...</think>` tags. Without `--reasoning-parser`, vLLM dumps everything into `content`. With `--reasoning-parser qwen3`, thinking goes to `reasoning_content` and the answer to `content`.

**Changes (TDD)**:

- `config.py`: Added `["--reasoning-parser", "qwen3"]` to `vllm_args`
- `llm_client.py`: Added null guard — raises `ValueError` if `content` is empty/None
- 4 new tests, all passing. 82/83 total green (1 pre-existing failure in test_stage2_map).

---

## P2: Parallel Map Implementation (DONE)

Replaced sequential `for` loop in `process_content()` with `asyncio.gather` + `asyncio.Semaphore`.

**Changes:**
- `main.py`: Added `--map-concurrency` CLI flag (default 4), `map_concurrency` param on `process_content()`, semaphore-gated `asyncio.gather(return_exceptions=True)`
- Error handling: expected errors (httpx, overflow, OS) → warning; unexpected errors → error with traceback
- 1 new test (`test_parallel_map_respects_concurrency`), all 10 tests in test_main.py passing

**Design decisions:**
- Per-file parallelism (not per-chunk) — keeps vLLM saturated for ~92%+ of map phase; per-chunk adds complexity/memory risk for marginal tail benefit
- `asyncio.gather` over `TaskGroup` — TaskGroup cancels all on first failure, violating error isolation
- `return_exceptions=True` — failed files become Exception objects in results, others continue unaffected

---

## Next Steps (Priority Order)

1. ~~**P1**: Add single-pass shortcut for small contents~~ — **Skipped for now**
2. ~~**P2**: Parallel map calls with asyncio semaphore~~ — **Done**
3. **P3**: Token pre-estimation — demoted; overflow retries cost ~1.6% of map time (66s/4147s). A simple char-based pre-chunk threshold (~117K chars) can be folded in as needed.
