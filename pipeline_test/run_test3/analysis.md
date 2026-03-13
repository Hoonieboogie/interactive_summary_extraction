# Run Test 3 — Comprehensive Analysis

**Date:** 2026-03-13
**Content:** `2018sah401_0301_0607` (same content as run_test2 — controlled comparison)
**Config change:** `--map-concurrency 8` (was 4), `--skip-server`
**New instrumentation:** `progress_log.py` with per-file intermediates

---

## 1. Executive Summary

Run 3 completed in **19.9 minutes** (1194s), a **24.2% wall-clock improvement** over run 2's 26.3 minutes. However, the improvement is **misleadingly attributed** — 73% of the time savings came from the ordering stage (which is sequential and unrelated to the concurrency change), not from the map parallelism increase. The pipeline is now bottlenecked by a single file (`data.js`) that consumes 58% of map wall time through 15 overflow retries.

---

## 2. Stage-by-Stage Breakdown

### 2.1 Discovery (1s → 1s)

No change. File discovery is filesystem I/O, trivially fast.

### 2.2 Ordering (386s → 105s, -72.8%)

This is the single largest improvement, but it has **nothing to do with the concurrency change** — ordering is sequential (1 LLM call). Possible causes:

| Hypothesis | Likelihood | Evidence |
|---|---|---|
| Model non-determinism (shorter thinking chain) | High | Same prompt, same model, different run → different reasoning length |
| vLLM server state (warm cache from prior runs) | Medium | `--skip-server` means server was already running; prior requests may have warmed KV cache patterns |
| Code/prompt change between runs | Low | No ordering-related code changes noted in monitoring plan |

**Risk:** This speedup is likely **non-reproducible**. The ordering stage could regress to 386s in future runs. Do not count on it for production throughput estimates.

### 2.3 Map (1136s → 1027s, -9.6%)

Doubling concurrency from 4 → 8 yielded only a **9.6% map speedup**. This is far below the theoretical 2x. The reason is clear from the per-file data:

#### Per-File Map Performance

| # | File | Chars | LLM Calls | Overflows | Edu? | Notes |
|---|------|-------|-----------|-----------|------|-------|
| 0 | `index.html` | 4K | 1 | 0 | No | Trivial |
| 1 | `css/bxPageTransition.css` | 26K | 1 | 0 | No | Trivial |
| 2 | `js/blux-aspen-1.0.js` | 413K | 8 | 3 | No | Framework JS, chunked |
| 3 | `js/blux-apx-cvs-1.0.js` | 234K | 4 | 1 | No | Framework JS, chunked |
| 4 | `js/aspen-apx-1.0.js` | 509K | **FAIL** | — | — | **ReadTimeout** |
| 5 | `js/aspen-runscript-1.0.js` | 40K | 1 | 0 | No | Fit in context |
| 6 | `corp/lib.js` | 128K | 1 | 0 | Yes | Fit in context (education widgets) |
| 7 | `corp/db.js` | 21K | 1 | 0 | No | Trivial |
| 8 | **`data.js`** | **1.37M** | **17** | **15** | **Yes** | **BOTTLENECK — 58% of map time** |
| 9 | `wgts/wgts.js` | 138K | 1 | 0 | Yes | Educational quiz widgets |
| 10 | `wgts/sg.js` | 33K | 1 | 0 | No | Trivial |
| 11 | `wgts/sgg...index.html` | 7K | 1 | 0 | No | Trivial |
| 12 | `wgts/sgg...index.js` | 99K | 1 | 0 | No | Trivial |
| 13 | `wgts/sgg...wgt_170821.js` | 15K | 1 | 0 | No | Trivial |
| 14 | `asset/asset.json` | 36K | 1 | 0 | Yes | Asset manifest |

**Key insight:** 12 of 15 files completed in a single LLM call (~47-82s each). The concurrency increase helped these finish in parallel within the first ~120s of the map stage. But `data.js` required **17 sequential LLM calls** (15 overflow retries → halve → retry → halve → retry...), taking ~600s serially. No amount of parallelism can help a single file's sequential retry chain.

#### The `data.js` Problem in Detail

`data.js` is 1.37M characters — the largest file by 2.7x. The overflow retry cascade:

```
1.37M → overflow → split to 687K
687K chunks → overflow → split to 343K
343K chunks → overflow → split to 171K
... continues until chunks fit in ~37K-51K prompt tokens
```

Token analysis from intermediates:
- 16 chunk calls averaged **38,600 prompt tokens** each (range: 33,953–61,054)
- Final merge call: only 2,682 prompt tokens (all chunk summaries easily fit)
- Total: **648,467 prompt tokens** + **38,637 completion tokens** consumed by this one file

This means `data.js` alone consumed roughly **10x the tokens** of all other files combined.

### 2.4 Reduce (53s → 61s, +15.1%)

Slight regression, within normal model variance. Single LLM call merging 14 file summaries (1,362 prompt tokens → 3,765 completion tokens). The reduce stage is negligible at this scale.

---

## 3. Resource Utilization

| Metric | Run 3 | Run 2 | Assessment |
|---|---|---|---|
| KV cache preemptions | 0 | — | H100 has headroom |
| Length truncations | 0 | 1 | Improved |
| GPU utilization | 100% | ~100% | Saturated (good) |
| VRAM usage | 74,809 MiB | — | Steady, no spikes |
| Queue waiting | 0 (after initial burst) | — | No contention |
| Failed files | 1 (ReadTimeout) | 5 (3 retries) | Improved |

**The H100 80GB is not the bottleneck.** Zero preemptions and zero queue pressure at concurrency 8 means the GPU can handle significantly more concurrent requests. The bottleneck is purely algorithmic: the sequential overflow retry loop on large files.

---

## 4. Token Economics

| Component | Prompt Tokens | Completion Tokens | LLM Calls |
|---|---|---|---|
| Ordering | ~est. 50K | ~est. 5K | 1 |
| Map: `data.js` | 648,467 | 38,637 | 17 |
| Map: `blux-aspen-1.0.js` | 138,366 | 15,422 | 8 |
| Map: `blux-apx-cvs-1.0.js` | 78,900 | 6,509 | 4 |
| Map: other 11 files | ~200K | ~22K | 11 |
| Reduce | 1,362 | 3,765 | 1 |
| **Total** | **~1.12M** | **~91K** | **42** |

`data.js` accounts for **~53% of all prompt tokens** and **40% of all LLM calls**. For a production run of 300K+ contents, files of this class will dominate cost and time.

---

## 5. Output Quality Assessment

The final summary is high quality:

> 이 교육 콘텐츠는 초중학생을 대상으로 한 사회 및 시민 교육 e-러닝 모듈로, '우리 지역의 공공기관' 단위를 중심으로 탐구 기반 학습을 제공합니다.
> 학습 과정은 인터넷 조사, 성인 인터뷰, 경상남도청 견학 등 현장 학습을 포함한 6 단계 프로세스와 퀴즈, 보드게임 등 게임화된 평가 활동을 구성합니다.
> 이를 통해 학생들은 공무원 역할 이해, 지역 문제 인식, 공공 예절 실천 및 시민 참여 역량 함양을 목표로 합니다.

**Strengths:**
- Correctly identifies the target audience (초중학생), subject (사회/시민 교육), and specific unit (우리 지역의 공공기관)
- Captures specific pedagogical methods (인터넷 조사, 성인 인터뷰, 경상남도청 견학)
- Identifies gamification elements (퀴즈, 보드게임)
- Learning objectives are concrete and accurate
- 10 keywords cover the content well, spanning topic, method, and goals

**Concern:**
- Only 4 of 14 successful files were marked `has_educational_content=true` (`data.js`, `corp/lib.js`, `wgts/wgts.js`, `asset/asset.json`). The remaining 10 are framework/UI code correctly identified as non-educational. The summary quality depends heavily on `data.js` being correctly processed — if it had failed (as `aspen-apx-1.0.js` did), the summary would lose its primary content source.

---

## 6. Cross-Run Trend Analysis

| Metric | Run 2 | Run 3 | Trend |
|---|---|---|---|
| Total wall clock | 1576s | 1194s | ↓24% (mostly ordering variance) |
| Map wall clock | 1136s | 1027s | ↓10% (concurrency helped trivial files) |
| LLM calls | 32 | 42 | ↑31% (more overflow retries) |
| Overflow retries | 7 | 19 | ↑171% (more concurrent overflows) |
| Failed files | 1+? | 1 | Stable (`aspen-apx-1.0.js` always fails) |
| Output quality | Good | Good | Stable |

The LLM call increase (32 → 42) with more overflow retries (7 → 19) suggests that higher concurrency causes more files to attempt large prompts simultaneously, increasing overflow pressure. This is a cost trade-off: 31% more LLM calls for 10% faster map time.

---

## 7. Critical Issues & Prioritized Action Items

### P0 — Pre-chunking for Large Files (Cost & Time Impact: HIGH)

**Problem:** `data.js` (1.37M chars) enters a cascading overflow-halve-retry loop: 15 overflows, 17 LLM calls, ~600s, ~650K prompt tokens — for a single file.

**Solution:** Pre-chunk files exceeding a threshold (e.g., 100K chars) **before** sending to LLM, using the tokenizer to estimate token count. This eliminates the overflow-retry loop entirely.

**Expected impact:** `data.js` map time from ~600s → ~200s (direct chunks, no wasted overflow calls). Overflow retries for this file from 15 → 0. Total LLM calls from 42 → ~20. Map stage from 1027s → ~400s.

### P1 — Adaptive Timeout for Large Files

**Problem:** `aspen-apx-1.0.js` (509K chars) fails with ReadTimeout every run. It's the only file that consistently fails.

**Solution:** Scale HTTP timeout proportionally to file/chunk size. E.g., `base_timeout + (chars / 100K) * 60s`. For 509K chars → ~600s timeout instead of 300s.

**Alternative:** Pre-chunking (P0) would also fix this — if the file is pre-split into <100K chunks, each chunk fits within the default timeout.

### P2 — Track `aspen-apx-1.0.js` Content Type

**Problem:** This file consistently fails. Is it educational content or framework code? If it's framework code (likely, given the name pattern `aspen-*.js`), its failure has zero impact on summary quality and can be safely skipped.

**Solution:** Add a fast heuristic pre-filter: files matching `aspen-*.js`, `blux-*.js` patterns are framework code → skip or deprioritize. This saves both time and tokens.

### P3 — Progress Log Not Persisted to Disk

**Problem:** `2018sah401_0301_0607.progress.log` was not found on the local machine. Either it wasn't synced from RunPod, or it was overwritten.

**Solution:** Ensure progress logs are committed/synced alongside results.

### P4 — Wasted Tokens on Framework Code

**Problem:** 3 framework JS files (`blux-aspen-1.0.js`, `blux-apx-cvs-1.0.js`, `aspen-runscript-1.0.js`) consumed 13 LLM calls and ~260K+ prompt tokens just to conclude "no educational content."

**Solution:** Two options (not mutually exclusive):
1. **Filename/path heuristic:** Skip files matching known framework patterns (`blux-*`, `aspen-*`, `bxPageTransition*`)
2. **Quick-scan first pass:** Send first 1K chars of file to LLM with a classification-only prompt ("Is this educational content? Yes/No"). Only proceed with full summarization if yes. Cost: ~500 tokens vs ~50K tokens for a full framework file scan.

---

## 8. Production Throughput Estimate

Using run 3 data, **with P0 pre-chunking implemented:**

| Scenario | Per-Content Time | 300K Contents | Estimated Cost |
|---|---|---|---|
| Current (run 3) | ~20 min | ~114 GPU-years | Prohibitive |
| With P0 pre-chunking | ~8 min | ~46 GPU-years | Still high |
| With P0 + P4 framework skip | ~4 min | ~23 GPU-years | Feasible with batching |
| With P0 + P4 + higher concurrency (16) | ~3 min | ~17 GPU-years | Target |

**Note:** These are rough extrapolations from a single content item. Real-world contents vary significantly in file count, size, and educational content density. Batch testing on diverse samples is needed for reliable estimates.

---

## 9. Summary of Findings

1. **Concurrency 4→8 helped marginally** (10% map speedup) because the bottleneck is sequential overflow retries on `data.js`, not parallelism
2. **Ordering speedup (3.7x) is likely non-reproducible** — model non-determinism, not a code improvement
3. **`data.js` is the single critical bottleneck** — 1 file = 40% of LLM calls, 53% of prompt tokens, 58% of map time
4. **Pre-chunking (P0) is the highest-impact optimization** — eliminates the overflow-retry cascade entirely
5. **Framework code detection (P4) is the second-highest** — 3 files wasted 13 LLM calls and ~260K tokens for zero information gain
6. **Infrastructure (H100 80GB) has significant headroom** — zero preemptions, zero queue pressure at concurrency 8
7. **Output quality is good and stable** across runs — the pipeline produces accurate, specific Korean summaries
