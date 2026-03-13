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

---

## Run Test 2 — Deep Analysis

Second pipeline run on same content (`2018sah401_0301_0607`) with P0 (`--reasoning-parser qwen3`) and P2 (parallel map) fixes applied. Full observations and analysis saved to `pipeline_test/run_test2/`.

### Results: P0 and P2 Validated

| Metric | Run 1 | Run 2 | Change |
|---|---|---|---|
| **Total wall time** | 4761s (79 min) | **1576s (26 min)** | **3.0x faster** |
| Ordering | 475s | 386s | 1.2x faster |
| **Map** | 4147s (69 min) | **1136s (19 min)** | **3.65x faster** |
| Reduce | 139s | 53s | 2.6x faster |
| LLM calls (reported) | 59 | 32 | 46% fewer |
| Overflow retries | 22 (37%) | 7 (22%) | 68% fewer |
| Total tokens | 1.88M | ~1.14M | 39% fewer |
| Avg latency/call | 44.4s | 52.0s | 17% slower (GPU shared) |
| Output quality | **Broken** (thinking leak) | **Correct** (clean Korean) | Fixed |

Parallel map scaling: near-linear at concurrency 4 (3.65x speedup, 91% efficiency). vLLM continuous batching handled it with 0 queue wait, 0 preemptions, KV cache peaked at 31.5%.

### New Failure Modes Discovered

#### 1. Thinking Token Budget Exhaustion (`data.js`)

`data.js` (1.3 MB, the most important file — contains serialized lesson structure) overflowed → chunked → a chunk's response exhausted the entire generation budget on thinking tokens → `content` empty → `ValueError`.

Root cause chain:
- No `max_tokens` in API call (`llm_client.py:80-87`) → vLLM defaults to `max_model_len - prompt_tokens`
- With reasoning-parser, thinking + content share this budget
- Large-prompt chunks leave little room → model thinks too long → truncated before producing JSON
- `finished_reason=length` in vLLM metrics (1 occurrence)

**Critical impact**: `data.js` contains the actual educational content. Its failure means the summary describes framework code instead of lesson content. The summary is technically correct for what was processed, but misses the content's educational purpose entirely.

#### 2. HTTP Timeout Exhaustion (`aspen-runscript-1.0.js`)

Large JS file, chunked, chunk call exceeded 300s HTTP timeout. All 3 retries timed out. With reasoning-parser, the model generates extensive thinking tokens before content — 300s is now too tight.

#### 3. Phantom Requests — 5 of 46 vLLM Requests Never Completed

- 3 from `aspen-runscript-1.0.js` timeout retries
- 2 unidentifiable (terminal scrollback lost — no persistent logging)

### Metrics Integrity Problem

The result JSON **undercounts** actual work:

| What JSON reports | What actually happened | Gap |
|---|---|---|
| 32 LLM calls | 46 vLLM requests started | 14 invisible |
| 7 overflow retries | 7 overflow retries | — |
| — | 5 timed-out requests | Not tracked |
| — | 1 empty-content ValueError | Not tracked |
| — | 2 skipped files | Not tracked |

When `asyncio.gather` catches an exception at `main.py:81-91`, the `(summary, responses, overflow_retries)` tuple is lost entirely. Partial responses from successful chunks before a failure are discarded. Latency stats exclude the slowest calls, token consumption is underreported.

### GPU Underutilization Confirmed

| Time | KV cache | Concurrent | Implication |
|---|---|---|---|
| T+8m | 24.2% | 4 | 76% headroom |
| T+16m peak | 31.5% | 4 | Maximum observed |
| T+20m (reduce) | 4.6% | 1 | Nearly idle |

**Concurrency 8–12 is safe.** At 8, expected KV ~50–63%, map phase ~10 min, total ~17 min.

### Ordering Stage — Hidden Cost

Ordering took 386s (24.5% of total wall time) — single sequential LLM call, 231s TTFT on prefill alone. This is the floor on per-content latency regardless of map parallelism. Options: heuristic ordering (eliminates LLM call), chunked ordering, or skip for small file counts.

### Prioritized Action Items from Run Test 2

| Priority | Issue | Fix |
|---|---|---|
| **P0** | `data.js` fails → summary misses core content | Set explicit `max_tokens` / reserve budget for content after thinking |
| **P0** | Failed files invisible in output | Add per-file status array in result JSON |
| **P1** | `ValueError` not in expected error list (`main.py:84`) | Add to expected errors |
| **P1** | 300s timeout too tight with reasoning | Make configurable, default 600s |
| **P1** | No persistent logging | Write to `<output_dir>/<content_id>.log` |
| **P1** | Metrics undercount (failed file responses lost) | Collect partial responses before re-raising |
| **P2** | GPU underutilized at concurrency 4 | Increase default to 8 |
| **P2** | Ordering = 24.5% of wall time | Heuristic fallback for large file counts |
| **P3** | ~6 JSON parse retries | Structured output / JSON mode |
| **P3** | Thinking-only response fallback | Retry with `enable_thinking=false` |

### Production Viability

| Scenario | Per-content | GPU-hours (300K) | Cost (H100 $3/hr) |
|---|---|---|---|
| Run test 1 | 79 min | 395,000 | $1,185,000 |
| Run test 2 (current) | 26 min | 130,000 | $390,000 |
| Concurrency 8 + P0 fixes | ~17 min | 85,000 | $255,000 |
| + heuristic ordering | ~11 min | 55,000 | $165,000 |

**Most impactful single fix:** Ensuring `data.js` succeeds — changes summary from "code framework description" to actual educational content description.
