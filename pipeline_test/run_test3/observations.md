# Run Test 3 — Observations

**Content:** `2018sah401_0301_0607` (same as run_test2)
**Config:** `--map-concurrency 8` (run_test2 was 4), `--skip-server`
**Date:** 2026-03-13

## Timeline

| Check | Time (KST) | Stage | Running | Waiting | Stop | e2e Count | e2e Sum(s) | Notes |
|-------|-----------|-------|---------|---------|------|-----------|------------|-------|
| 1 | 07:27 | map start | 6 | 2 | 5 | 5 | 352 | Full 8-slot burst, ordering done in 105s (3.7x faster than run2) |
| 2 | 07:28 | map | 8 | 0 | 8 | 8 | 488 | All 8 slots filled, avg ~60s/req |
| 3 | 07:28 | map | 8 | 0 | 13 | 13 | 902 | 8 map completions, avg ~83s (higher than run2's 52s due to contention) |
| 4 | 07:29 | map | 7 | 0 | 19 | 19 | 1297 | 14/15 files done, 3 overflow retries |
| 5 | 07:30 | map | 6 | 0 | 23 | 23 | 1473 | 6 overflow retries |
| 6 | 07:30 | map | 6 | 0 | 26 | 26 | 1627 | 8 overflow retries, exceeds run2's total of 7 |
| 7 | 07:31 | map | 6 | 0 | 28 | 28 | 1697 | Persistent 6 in-flight |
| 8 | 07:31 | map | 6 | 0 | 30 | 30 | 1770 | 10 overflow retries |
| 9 | 07:32 | map | 4 | 0 | 32 | 32 | 1867 | Concurrency dropping |
| 10 | 07:33 | map | 3 | 0 | 36 | 36 | 2090 | 16 retries |
| 11 | 07:33 | map | 3 | 0 | 37 | 37 | 2161 | |
| 12 | 07:34 | map | 2 | 0 | 39 | 39 | 2330 | 2 files left in retry |
| 13 | 07:34 | map | 2 | 0 | 40 | 40 | 2378 | |
| 14 | 07:35 | map | 2 | 0 | 41 | 41 | 2423 | |
| 15 | 07:36 | map | 1 | 0 | 42 | 42 | 2460 | Last file: data.js |
| 16 | 07:36 | map | 2 | 0 | 43 | 43 | 2498 | data.js spawned another chunk |
| 17 | 07:37 | map | 2 | 0 | 44 | 44 | 2544 | |
| 18 | 07:38 | map | 2 | 0 | 45 | 45 | 2592 | |
| 19 | 07:38 | map | 1 | 0 | 46 | 46 | 2654 | |
| 20 | 07:39 | map | 1 | 0 | 46 | 46 | 2654 | Long-running chunk |
| 21 | 07:40 | map | 1 | 0 | 46 | 46 | 2654 | Still running >60s |
| 22 | 07:41 | map→done | 1→0 | 0 | 47 | 47 | 2715 | Map done, reduce done, PIPELINE COMPLETE |

## Run 3 vs Run 2 Comparison

| Metric | Run 3 | Run 2 | Delta |
|--------|-------|-------|-------|
| **Total wall clock** | **1194s (19.9min)** | 1576s (26.3min) | **-24.2%** |
| Discovery | 1s | ~1s | — |
| Ordering | 105s | 386s | **-72.8%** |
| Map | 1027s | 1136s | -9.6% |
| Reduce | 61s | 53s | +15.1% |
| Map concurrency | 8 | 4 | 2x |
| Total LLM calls | 42 | 32 | +31.3% |
| Overflow retries | 19 | 7 | +171% |
| Avg latency | 56.2s | 52s | +8.1% |
| Max latency | 130.8s | 138s | -5.2% |
| Min latency | 10.4s | 8.7s | +19.5% |
| Length truncations | 0 | 1 | Improved |
| Failed files | 1 (ReadTimeout) | 5 (3 retries on 1 file) | — |
| Preemptions | 0 | — | Clean |
| Keywords generated | 10 | — | — |

## Key Findings

### 1. Ordering stage 3.7x faster (105s vs 386s) — biggest win, NOT from concurrency
The ordering stage is sequential (single LLM call). This 72.8% speedup is unrelated to the concurrency change and likely due to code or prompt changes between runs. This is the single largest contributor to the 24% total wall-clock improvement.

### 2. Map concurrency 8 yielded only 9.6% map speedup — long tail dominates
With 2x concurrency, map went from 1136s → 1027s. The first 12 files (single-call, no overflow) finished in ~120s. But `data.js` alone took ~600s with 15 overflow retries and 17 LLM calls. **One file consumed 58% of map wall time.** Higher concurrency cannot parallelize a single file's sequential retry chain.

### 3. `data.js` is the pipeline bottleneck
- 17 LLM calls (40% of all 42 calls)
- 15 overflow retries (79% of all 19 retries)
- ~600s of map wall time (58% of map stage)
- This file likely contains embedded educational data that exceeds context window limits

### 4. More overflow retries (19 vs 7) but same fundamental behavior
The retry count increase comes from concurrent files all overflowing simultaneously. With concurrency 4, some large files started later and may have had less contention. The net effect: more LLM calls (42 vs 32) but faster wall clock.

### 5. Infrastructure rock solid at concurrency 8
- 0 KV cache preemptions throughout the entire run
- 0 length truncations (improved from run2's 1)
- GPU stayed at 100% utilization, 74809 MiB steady
- No errors, no aborts, no queue pressure
- Could potentially push to concurrency 12-16

### 6. ReadTimeout on `js/aspen-apx-1.0.js`
One file failed with ReadTimeout. Run_test2 had 5 timed-out requests (3 from retries on one file). This file is likely very large JS that exceeds the request timeout even after chunking.

## Output Quality

Summary (Korean 3-line):
> 이 교육 콘텐츠는 초중학생을 대상으로 한 사회 및 시민 교육 e-러닝 모듈로, '우리 지역의 공공기관' 단위를 중심으로 탐구 기반 학습을 제공합니다.
> 학습 과정은 인터넷 조사, 성인 인터뷰, 경상남도청 견학 등 현장 학습을 포함한 6 단계 프로세스와 퀴즈, 보드게임 등 게임화된 평가 활동을 구성합니다.
> 이를 통해 학생들은 공무원 역할 이해, 지역 문제 인식, 공공 예절 실천 및 시민 참여 역량 함양을 목표로 합니다.

Keywords (10): 사회과 교육, 시민 교육, 공공기관, 탐구 학습, 현장 학습, 게임화 평가, e-러닝, 시민 참여, 공공 예절, 지역 사회 이해

## Actionable Takeaways

1. **Optimize `data.js`-class files**: Files with 15+ overflow retries need a pre-chunking strategy before hitting the LLM. Pre-split by logical sections (e.g., JSON array elements) instead of relying on overflow retry loop. This alone could cut map stage by 50%+.

2. **Investigate ordering speedup**: The 3.7x ordering improvement was the biggest win. If this came from code changes, document them. If it was non-deterministic (model variance), ordering may regress in future runs.

3. **Increase timeout for large JS files**: `aspen-apx-1.0.js` ReadTimeout suggests the timeout config is too tight for the largest files. Consider adaptive timeouts based on file size.

4. **Concurrency 8 is safe, consider higher**: Zero preemptions and zero queue pressure mean the H100 can handle more. Test concurrency 12 next — the bottleneck is the long tail, not the GPU.

5. **Track per-file wall time in progress log**: Current log only shows call counts and overflows. Adding per-file start/end timestamps would reveal exactly which files block the pipeline and for how long.
