# Run Test 3 — Monitoring Plan

## What changed since run_test2

### Code changes (pipeline_v2)
1. **`progress_log.py` (NEW)** — file-based progress logger so we can trace pipeline stages without terminal stdout access
   - Writes `<content_id>.progress.log` with timestamped stage events (`STAGE_DISCOVERY_START`, `MAP_FILE_DONE`, etc.)
   - Saves structured JSON intermediates to `<content_id>.intermediates/{ordering,map,reduce}/`
2. **`main.py` (MODIFIED)** — instrumented with `progress_log` calls at every stage boundary
   - Per-file map intermediates: filepath, position, has_educational_content, summary (truncated 500 chars), llm_calls, overflow_retries, latencies, tokens
   - Ordering intermediate: wall_seconds, llm_calls, ordered_files with position/path/chars
   - Reduce intermediate: wall_seconds, llm_calls, full summary, keywords, latencies, tokens

### Run config change
- `--map-concurrency 8` (was 4 in run_test2)

## What to collect every monitoring cycle

| # | Data source | Command | What it tells us |
|---|-------------|---------|------------------|
| 1 | Progress log | `cat results/qwen3.5-27b/2018sah401_0301_0607.progress.log` | Current stage, elapsed time, per-file completion |
| 2 | vLLM Prometheus | `curl -s localhost:8000/metrics \| grep -E "^vllm:"` | Request queue depth, KV cache pressure, latency distribution, stop vs length finish reasons |
| 3 | GPU stats | `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader` | GPU utilization and VRAM usage |
| 4 | Process check | `ps aux \| grep "uv run main.py" \| grep -v grep` | Pipeline alive/dead |
| 5 | Result file | `ls -la results/qwen3.5-27b/2018sah401_0301_0607.json` | Pipeline completion check |
| 6 | Map progress | `ls results/qwen3.5-27b/2018sah401_0301_0607.intermediates/map/ 2>/dev/null \| wc -l` | Files summarized so far |

### Key Prometheus metrics to extract
- `vllm:num_requests_running` — concurrent inference load (expect higher with concurrency 8)
- `vllm:num_requests_waiting` — queue pressure (new signal: did run_test2 ever queue?)
- `vllm:gpu_cache_usage_perc` — KV cache pressure (run_test2 peaked 31.5%)
- `vllm:e2e_request_latency_seconds_{sum,count}` — rolling average latency
- `vllm:time_to_first_token_seconds_{sum,count}` — prefill latency (queuing impact)
- `vllm:request_success_total{finished_reason="stop"}` — successful completions
- `vllm:request_success_total{finished_reason="length"}` — truncated responses (thinking budget exhaustion)
- `vllm:num_preemptions_total` — KV cache evictions under memory pressure

## Run_test2 baselines (for comparison)

| Metric | Run_test2 value |
|--------|----------------|
| Concurrency | 4 |
| Total wall clock | 1576s (~26 min) |
| Ordering stage | 386s (24.5%) |
| Map stage | 1136s (72%) |
| Reduce stage | 53s (3.4%) |
| LLM calls | 32 |
| Overflow retries | 7 |
| KV cache peak | 31.5% |
| Avg latency | 52s |
| Max latency | 138s |
| Min latency | 8.7s |
| Finish reason=length | 1 |
| Timed-out requests | 5 (3 from retries on one file) |

## What to watch for

1. **KV cache pressure** — 2x concurrency may push cache usage well above 31.5%. If >80%, expect preemptions and latency spikes.
2. **Queue wait times** — with 8 concurrent requests, some will queue. TTFT increase = direct measure of queuing overhead.
3. **Map stage speedup** — 2x concurrency should reduce wall clock, but per-request latency may increase due to resource contention. Net effect unclear.
4. **Overflow retries** — same files should overflow, but concurrent overflows could amplify KV pressure.
5. **Ordering stage** — unchanged (sequential), expect ~386s again.
6. **Truncations (length)** — run_test2 had 1. Higher concurrency shouldn't change this, but worth confirming.

## Observation format

Write to `observations.md` in this directory. Format:
- Timeline table at top (one row per check, key numbers only)
- Key findings only when data reveals something actionable, always referencing run_test2 baseline
- Actionable takeaways section when pipeline completes
