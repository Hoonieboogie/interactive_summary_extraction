# Pipeline Run Test 2 — Observations (2026-03-13)

## Run Config
- **Content**: `2018sah401_0301_0607`
- **Model**: Qwen3.5-27B-FP8 via vLLM on H100 80GB
- **Map concurrency**: 4 (default, `--map-concurrency` not explicitly set)
- **Changes since run_test1**: `--reasoning-parser qwen3` enabled, parallel map with `asyncio.gather` + semaphore
- **Start time**: ~04:51 UTC
- **Command**: `uv run main.py --content-dir ../../sample_contents --output-dir ./results --skip-server --content-ids 2018sah401_0301_0607`

## Key Metrics to Compare vs Run Test 1

| Metric | Run 1 (Sequential, no reasoning-parser) | Run 2 (Parallel, reasoning-parser) |
|--------|------------------------------------------|-------------------------------------|
| Total wall time | 4761s (~79 min) | **1576s (~26 min) — 3.0x faster** |
| Map phase wall time | 4147s (~69 min) | **1136s (~19 min) — 3.65x faster** |
| Ordering wall time | 475s (~8 min) | 386s (~6.4 min) — 1.2x faster |
| Reduce wall time | 139s (~2 min) | 53s (~0.9 min) — 2.6x faster |
| Total LLM calls | 59 (37 useful + 22 retries) | **32 — 46% fewer** |
| Overflow retries | 22 (37%) | 7 (22%) — 68% fewer |
| Total tokens | 1.88M (1.63M prompt + 248K gen) | **~1.14M (970K prompt + 174K gen) — 39% fewer** |
| Avg latency/call | 44.4s | 52.0s — 17% slower (GPU shared) |
| Output quality | Broken (thinking token leak) | **Correct (clean Korean summary + keywords)** |

## Observation Log

### T+0m (04:51) — Startup
- **GPU**: 0% util, 74809/81559 MiB (model loaded, idle)
- **vLLM**: 0 requests running, 0 waiting, 0 completed
- **Observation**: Pipeline started. vLLM spawned 8 `nvcc` processes compiling flashinfer CUDA kernels for SM90a. This is a cold-start penalty — kernels are cached after first compilation.
- **Implication**: For production at 300K contents, this is a one-time cost. But for benchmarking, it inflates wall time. Should subtract from total.

### T+5m (04:56) — Ordering stage, CRITICAL: TTFT = 231s

- **GPU**: 100% util, 74809/81559 MiB
- **vLLM**: 1 running, 0 waiting, 0 completed | 2727 gen tokens so far | KV cache 0.87%
- **Key finding — TTFT is 231.4 seconds (3.8 min)**:
  - The very first request (ordering stage) took **231s just to produce the first token**. This is the time vLLM spent on prefill (processing the prompt).
  - In run_test1, ordering took 475s total for ~1 call. The 231s TTFT suggests the ordering prompt is extremely large (likely sending all file metadata at once).
  - `request_prompt_tokens_sum = 0` because the request hasn't completed yet, so we can't see exact token count. But 231s TTFT on H100 suggests a very large prompt (likely 30K+ tokens).
  - KV cache at only 0.87% — memory is not the bottleneck at all. The model has massive headroom.
  - 0 requests waiting — parallel map hasn't started yet (ordering must complete first).
- **Implication**:
  - The 231s TTFT reveals prefill is the dominant cost for large prompts, not generation. This matters for map phase too — files with large content will have similar prefill costs.
  - KV cache at <1% means we could safely increase `--map-concurrency` well beyond 4 without memory pressure.
  - The ordering stage is sequential by design (1 call), so parallelism can't help here. But the prompt size could potentially be reduced.

### T+8m (04:59) — MAP PHASE ACTIVE, semaphore fully saturated

- **GPU**: 100% util, 74809/81559 MiB
- **vLLM requests**: 4 running, 0 waiting, 5 completed (stop)
- **Tokens**: 83K prompt, 18K generated (cumulative)
- **Avg e2e latency**: 49.1s/req (245.5s / 5 completed)
- **TTFT breakdown**: 9 TTFT events, sum=250.2s. First ordering call was 231s. **Post-ordering avg TTFT = 2.7s** ((250.2 - 231.4) / 7) — map file prefills are fast.
- **Avg prefill**: 1.62s/req (8.08s / 5), **Avg queue wait**: 0.25s/req (1.25s / 5)
- **KV cache**: 24.2% (jumped from 1.2% with 4 concurrent requests), Preemptions: 0
- **Key findings**:
  1. **Parallel map is working**: Semaphore concurrency=4 is fully saturated (4 running). vLLM is continuous-batching all 4 requests simultaneously.
  2. **GPU has headroom — 0 waiting, KV cache only 24%**: No queue pressure at all. The GPU can handle more concurrent requests. With 4 concurrent using 24% KV cache, we could safely go to **8-12 concurrent** (would use ~48-72% KV cache). This is the most actionable finding for the next run.
  3. **Ordering completed in ~8 min** (vs 475s/~8min in run_test1) — similar, as expected since ordering is a single sequential call and hasn't changed.
  4. **Map file prefills are fast (2.7s avg TTFT)**: Unlike the ordering call (231s TTFT), individual map files have small prompts. The generation phase dominates map call time, not prefill.
  5. **Queue wait negligible (0.25s)**: Confirms the bottleneck is not vLLM throughput but our concurrency limit. Increasing `--map-concurrency` would directly reduce map wall time.

### T+9m (05:00) — Map phase, throughput data available

- **vLLM requests**: 4 running, 0 waiting, 12 completed | 17 TTFT events
- **Tokens**: 263K prompt, 33K generated (cumulative)
- **Avg e2e latency**: 44.5s/req | **Avg TTFT (map only)**: 1.86s | **Avg prefill**: 1.81s | Queue wait: 0.10s
- **KV cache**: 20.8%, Preemptions: 0
- **Delta from T+8m**: +7 completions in ~1 min. Token throughput: ~243 tok/s across 4 concurrent (vs ~62 tok/s single request — **3.9x scaling**).
- **Key finding — Map phase speed estimate**:
  - 7 map completions/min at concurrency=4.
  - Run_test1 had ~36 map calls. At this rate: ~36/7 = **~5.1 min estimated map phase** vs **69 min in run_test1**.
  - That's a **~13.5x wall-time speedup** (4x from parallelism + ~3.4x from eliminated overflow retries via reasoning-parser).
  - Avg e2e latency per request (44.5s) is nearly identical to run_test1 (44.4s) — individual call cost unchanged, but concurrent execution slashes wall time.
- **Concurrency headroom confirmed**: 0 waiting, KV at 20.8% (down from 24% as requests complete and free KV). At `--map-concurrency 8`, we'd expect ~40% KV cache and ~14 completions/min → **~2.6 min map phase**.

### T+16m (05:07) — Map phase tail, first `length` truncation detected

- **vLLM requests**: 4 running, 0 waiting, 32 completed (31 stop + **1 length**)
- **Tokens**: 777K prompt, 111K generated (cumulative)
- **Avg e2e latency**: 51.0s/req (1631s / 32) | KV cache: 22.3%, Preemptions: 0
- **Key finding — `finished_reason=length` appeared**:
  - One request was **truncated** because it hit vLLM's max generation token limit. This means the model's response (thinking + content combined) exceeded the allowed output length.
  - With `--reasoning-parser qwen3`, the thinking tokens count toward generation budget. A file that triggers extensive reasoning could exhaust the generation limit before producing the actual JSON answer.
  - In run_test1 this wasn't observable because thinking tokens leaked into `content` — now that they're separated, we can see the truncation.
  - **Action item**: Check if the truncated response still produced valid output (the pipeline's `parse_file_summary` fallback may have caught it), and consider setting `max_tokens` explicitly in the API call to ensure enough budget for the actual answer after thinking.
- **Map progress**: 38 TTFT events, 32 completed, 4 running. ~6 map files remaining. Throughput slowed to ~2/min (tail effect — remaining files are larger, generating more thinking tokens).

### T+19m (05:10) — Map phase ending, concurrency dropped to 2

- **vLLM requests**: **2 running** (first drop below 4), 0 waiting, 39 completed (38 stop + 1 length)
- **Tokens**: 920K prompt, 144K generated (cumulative)
- **Avg e2e latency**: 52.6s/req (2052s / 39) | KV cache: 12.4% (down from 31.5%), Preemptions: 0
- **Key finding — Map tail effect quantified**:
  - 44 TTFT events total. Subtracting ~2 ordering TTFTs = **42 map-related LLM calls** (vs 36 map calls in run_test1 + 22 overflow retries = 58 map-related calls). The reasoning-parser eliminated overflow retries, but we have ~6 extra calls from the "retry if unparseable" logic in `summarize_file()`.
  - Concurrency dropped from 4→2 because fewer files remain than the semaphore limit. This is the **map tail problem** — the last few files run at reduced parallelism, wasting GPU capacity.
  - Map phase wall time: started at ~T+8m, now at T+19m = **~11 min** (vs 69 min in run_test1). Even with the tail, this is a **~6.3x speedup**.
  - Token efficiency: 920K prompt + 144K gen = **1.06M total tokens** vs 1.88M in run_test1 — **44% fewer tokens**. The reasoning-parser eliminated wasted overflow retries.
- **Implication**:
  - Tail effect is real: last 2 files run at 50% concurrency. With `--map-concurrency 8`, the tail would be longer proportionally. Consider: for 300K contents, per-content tail is small relative to batch throughput.
  - The 6 extra "retry if unparseable" calls suggest Qwen3.5's JSON formatting isn't always reliable on first attempt. Could add JSON schema enforcement or structured output to reduce retries.

### T+20m (05:11) — Map→Reduce transition

- **vLLM requests**: **1 running**, 0 waiting, 40 completed (39 stop + 1 length) | TTFT count frozen at 44
- **Tokens**: 968K prompt, 149K generated (cumulative)
- **KV cache**: 4.6% (collapsed from 31.5% peak), Preemptions: 0
- **Key finding — Map phase complete, reduce started**:
  - TTFT count stopped growing (44 for 2 consecutive checks), confirming no new requests are being submitted. All map files have been processed.
  - Running=1 is consistent with reduce phase (sequential merging, 1 call at a time).
  - **Map phase total**: ~12 min wall time (T+8m to T+20m). vs **69 min in run_test1** → **5.75x speedup**.
  - **Total map LLM calls**: ~40 (vs 59 in run_test1) — 32% fewer calls due to eliminated overflow retries.
  - KV cache collapsed to 4.6% — single reduce request uses minimal KV compared to 4 concurrent map requests. This confirms the GPU was massively underutilized during map at concurrency=4.
- **Implication**: Reduce is sequential by design (each merge depends on previous results). Can't parallelize without changing the algorithm (e.g., tree-structured parallel merge). For this content size, reduce is only ~3% of total time, so not worth optimizing.

### T+26m (05:17) — Reduce phase stalled on long-running merge call

- **vLLM**: 1 running, 0 waiting, 40 completed (unchanged since T+20m) | KV cache 5.3%
- **Tokens**: 968K prompt (unchanged), 170K generated (+18K since reduce started at ~05:13)
- **Key finding — Reduce regression from reasoning-parser**:
  - A single reduce merge call has been running for **5+ minutes** generating **18K+ tokens** (mostly thinking). Still not complete.
  - In run_test1, the **entire reduce phase** (all merge calls) took **139 seconds total**. One reduce call in run_test2 has already exceeded 300s.
  - Root cause: `--reasoning-parser qwen3` causes the model to generate extensive chain-of-thought before producing the actual JSON merge result. The thinking tokens are separated cleanly (good for output), but they still consume generation time and the generation token budget.
  - The model is merging all per-file summaries into a final summary — with 20+ file summaries as input, the model reasons extensively about how to synthesize them.
  - KV cache growing (5.3%) as the response gets longer — this single response may accumulate significant KV.
- **Implication**:
  - Reduce phase is now the **proportionally larger bottleneck** in run_test2 (was 3% in run_test1, now potentially 20-30% of total wall time).
  - **Action item**: Consider `enable_thinking=false` specifically for reduce calls (where output quality is less dependent on reasoning), or set a `thinking_budget` parameter if vLLM/Qwen3.5 supports it.
  - Alternatively, reduce could use a smaller prompt by pre-compressing file summaries before merge.
  - **Update**: Reduce actually completed quickly (53s total). The long-running call was likely the last map file or a map retry, not reduce. See final results below.

---

## Final Results — Pipeline Completed at 05:18 UTC (T+27m)

### Output Quality: FIXED
```
Summary: "이 콘텐츠는 블루가 (Bluega) 에서 개발한 상호작용형 교육 소프트웨어 플랫폼의 기술적 인프라 및
프레임워크 코드로 구성됩니다. HTML5 캔버스 렌더링, UI 위젯 관리, 멀티미디어 처리 기능을 통해 수학, 과학,
음악 등 다양한 과목의 학습 모듈을 지원합니다."
Keywords: ["Bluega", "AspenEDU", "HTML5 Canvas", "JavaScript", "교육 플랫폼", ...]
```
- Clean Korean 3-line summary, no thinking token contamination. **P0 fix validated.**
- 10 relevant keywords extracted (vs empty array in run_test1).

### Run 2 vs Run 1 Comparison

| Metric | Run 1 | Run 2 | Change |
|--------|-------|-------|--------|
| **Total wall time** | 4761s (79 min) | **1576s (26 min)** | **3.0x faster** |
| Ordering | 475s | 386s | 1.2x faster |
| **Map** | 4147s (69 min) | **1136s (19 min)** | **3.65x faster** |
| Reduce | 139s | 53s | 2.6x faster |
| LLM calls | 59 | 32 | **46% fewer** |
| Overflow retries | 22 (37%) | 7 (22%) | 68% fewer |
| Total tokens (vLLM) | 1.88M | ~1.14M | **39% fewer** |
| Avg latency/call | 44.4s | 52.0s | 17% slower (expected: GPU shared across 4 concurrent) |
| Max latency | 87.8s | 138.2s | Longer tail (large file + thinking tokens) |
| Output quality | Broken (thinking leak) | **Correct** | Fixed |

### Key Takeaways for Next Optimization

1. **Parallel map delivered 3.65x speedup** at concurrency=4. vLLM metrics showed 0 queue wait, KV cache peaked at 31.5%. **Concurrency 8-12 is safe** — would push map toward 6-10 min.

2. **Overflow retries NOT eliminated** (7 remain). The reasoning-parser fixes output parsing, not prompt overflow. Token pre-estimation (P3) is still needed to fully eliminate retries, but priority is lower (7 vs 22 retries).

3. **Per-call latency increased 17%** (52s vs 44.4s) due to GPU sharing across 4 concurrent requests. This is expected and acceptable — wall time improvement far outweighs per-call slowdown.

4. **1 `length`-truncated response** detected — a file exhausted the generation token budget (thinking + content). Need to investigate which file and consider setting explicit `max_tokens` or thinking budget.

5. **~6 JSON parse retries** observed (42 vLLM map calls vs ~36 expected map files). Qwen3.5 doesn't always produce valid JSON on first attempt. Consider structured output / JSON mode.

6. **Reduce was fast (53s)** — faster than run_test1 (139s). The earlier "stalled reduce" observation was likely misidentified — the long-running call was probably the last large map file, not a reduce call. Reduce with reasoning-parser is not a regression.
