# Pipeline Run Observations

## Run Info
- **Date**: 2026-03-13
- **Content ID**: `2018sah401_0301_0607`
- **Model**: Qwen/Qwen3.5-27B-FP8 (vLLM, port 8000)
- **GPU**: H100 80GB (74.8GB VRAM used by model)
- **Command**: `main.py --content-dir ../../sample_contents --output-dir ./results --skip-server --content-ids 2018sah401_0301_0607`

## Timeline

| Time (min) | Completed Reqs | Prompt Tokens | Gen Tokens | Stage | Notes |
|------------|---------------|---------------|------------|-------|-------|
| 0–7 | 0 | 0 | 0 | Startup | flashinfer CUDA kernel compilation (nvcc), GPU idle |
| ~7 | 0 | 651 | 0 | Stage 1b | First LLM call (ordering), GPU hits 100% |
| ~9 | 2 | 17,744 | 16,118 | Stage 2 | Map begins, per-file summarization |
| ~11 | 5 | 51,165 | 21,982 | Stage 2 | Pace ~2 req/min |
| ~13 | 8 | 155,821 | 34,149 | Stage 2 | Large file processed (+47K prompt) |
| ~15 | 13 | 314,613 | 43,577 | Stage 2→3 | Burst of 5 reqs, entering reduce |
| ~17 | 14 | 352,910 | 49,508 | Stage 3 | First length truncation (req #20) |
| ~25 | 24 | 775,819 | 71,126 | Stage 3 | Pairwise merge ongoing |
| ~35 | 34 | 1,026,224 | 91,382 | Stage 3 | Crossed 1M prompt tokens |
| ~48 | 37 | 1,072,390 | 117,335 | Stage 3 | One request ran ~6 min generating ~17K tokens |
| ~60 | 44 | 1,271,383 | 163,817 | Stage 3 | Merge tree continuing, +35K gen tokens in ~15 min |
| ~75 | 47 | 1,307,706 | 168,636 | Stage 3 | Gen token growth slowing (+4.8K), tree may be converging |
| ~85 | 49 | 1,333,579 | 184,853 | Stage 3 | Single request generating for 8+ min (~15K tokens), longest yet |
| ~89 | 49 | 1,344,930 | 191,385 | Stage 3 | Long request finished, new request started (+11.4K prompt prefill) |
| ~93 | 49 | 1,344,930 | 198,528 | Stage 3 | New request already generating 7K+ tokens, approaching 200K total gen |
| ~99 | 49 | 1,356,281 | 207,401 | Stage 3 | Another long request finished (~16K tokens/~10 min), new request started |
| ~105 | 49 | 1,356,281 | 223,722 | Stage 3 | Single request generating 16K+ tokens over 6+ min, 224K total gen |
| ~109 | 51 | 1,415,222 | 227,395 | Stage 3 | Burst: +2 completions, +55K prompt, new large merge request started |
| ~120 | 59 | 1,629,475 | 248,317 | **Done** | Pipeline completed, results written to results/qwen3.5-27b/ |

## Key Observations

### 1. flashinfer compilation overhead (~7 min cold start)
- First run compiles flashinfer CUDA kernels for SM90a (H100)
- ~20 nvcc processes run in parallel
- GPU loaded (74.8GB) but at 0% utilization during compilation
- **Impact**: One-time cost, cached for subsequent runs
- **Suggestion**: Pre-warm or pre-compile kernels in the Docker image/setup script

### 2. ContextOverflowError triggers pairwise fallback
- The single-merge attempt at Stage 3 overflowed the context window
- Fell back to `pairwise_tree_merge()` (line 141 in stage3_reduce.py)
- This is expected for content with many large files
- **Impact**: Significantly increases LLM calls and total tokens in reduce phase

### 3. Pairwise merge produces excessive intermediate text
- Intermediate merge prompt asks for "문단 길이 요약" (paragraph-length) but model often generates very long outputs
- One request ran for ~6 minutes generating ~17K tokens for a single intermediate merge
- **Impact**: Bloats subsequent merge rounds, slows convergence
- **Suggestion**: Add `max_tokens` limit to intermediate merge LLM calls (e.g., 2000–4000 tokens) to control output length and speed up the merge tree

### 4. Reduce phase dominates total runtime
- Stage 2 (Map): ~8 min, ~13 requests
- Stage 3 (Reduce): 30+ min and counting, 20+ requests
- Reduce is taking 3-4x longer than map despite fewer files to merge
- **Root cause**: Verbose intermediate summaries compound at each tree level

### 5. Single length truncation handled gracefully
- Request #20 hit `finished_reason="length"` — only occurrence
- Pipeline continued without errors (0 abort, 0 error throughout)
- The truncated output was carried forward in the merge tree

### 6. Token throughput
- Prompt processing: ~3K tokens/sec (prefill)
- Generation: ~3.5K tokens/min (~58 tokens/sec)
- Total throughput after ~48 min: 1.07M prompt + 117K gen = **1.19M total tokens**

### 7. No output files yet after 48 minutes
- Pipeline writes results only after Stage 4 (all stages complete)
- No intermediate progress files — all-or-nothing output
- **Suggestion**: Consider writing intermediate results (e.g., per-file summaries) for debugging and crash recovery

### 8. Recurring verbose intermediate merges (confirmed pattern)
- Request #38 ran ~6 min generating ~17K tokens
- Request #39 also running long (5K+ tokens and counting)
- This is a **systemic issue**, not a one-off — the model consistently over-generates for intermediate merge prompts
- The "문단 길이 요약" instruction is too vague — model interprets it as permission to write extensively
- **Impact**: Each verbose merge compounds into the next round, creating a snowball effect in the merge tree

### 9. Compounding verbosity feedback loop in reduce
- Late-stage merge rounds consistently produce 15K+ token outputs (requests #38, #39, #40+)
- Each verbose output becomes input for the next merge, making the next round even longer
- Prompt tokens plateaued at 1.086M but gen tokens keep climbing (100K → 144K in ~15 min)
- **Root cause**: No output length constraint on intermediate merges + model generates proportionally to input length
- **Impact**: At production scale (300K contents), this could make some contents take hours per piece

### 10. Merge tree convergence signal at ~75 min
- Between ~60 min and ~75 min, generation tokens grew by only +4.8K (vs +35K in prior interval)
- Prompt token growth also slowed: +36K (vs +200K earlier)
- Only 3 new completions in ~15 min, but 1 request still running
- **Interpretation**: The pairwise merge tree is likely in its final rounds — fewer pairs to merge means smaller inputs and outputs
- **Implication**: Total reduce phase ~45+ min for a single content with ~13 files; at production scale, this is the primary bottleneck

### 11. Longest single generation: 8+ min, ~15K tokens (request #50)
- A single request has been generating continuously for 8+ minutes at ~85 min mark
- Prompt tokens frozen at 1,333,579 — no new prefill, same request throughout
- Generation growing at ~2.5K tokens/cycle (~58 tok/sec sustained)
- This surpasses the previous record of ~6 min / ~17K tokens from observation #3
- **Impact**: A single LLM call taking 8+ min in the merge tree is a severe bottleneck — it serializes everything behind it
- **Root cause**: Late-stage merges receive all accumulated verbose text as input, so the model generates proportionally longer output

### 12. Reduce phase at 50+ min with no convergence signal
- At ~93 min mark, reduce has been running for 50+ minutes (started at ~42 min)
- Only 49 total completions despite reduce being the majority of runtime
- Map phase processed ~13 files in ~8 min; reduce has used 50+ min for ~36 merge requests
- Reduce:Map time ratio is now **6:1** and growing
- Generation tokens nearing 200K — 70% generated during reduce phase alone
- **Conclusion**: Without `max_tokens` caps on intermediate merges, pairwise tree merge has **unbounded runtime** proportional to content complexity

### 13. CORRECTION — Map phase was the actual bottleneck, not reduce
- Actual wall clock from pipeline metrics: **ordering=475s, map=4147s (~69 min), reduce=139s (~2.3 min)**
- My monitoring-based stage inference was wrong — I attributed long token generation to reduce, but it was actually map
- **22 overflow retries** during map phase explain the extreme map duration — files that exceed context are retried with truncated content
- Reduce was only 2.3 min (fast), while map was 69 min (slow due to retries)
- **Lesson**: vLLM Prometheus metrics (request counts, tokens) cannot reliably distinguish pipeline stages without explicit stage markers in the pipeline code

### 14. Qwen3.5 thinking tokens leak into output (CRITICAL BUG)
- The final summary field contains a massive "Thinking Process:" chain-of-thought block (~15K chars)
- Qwen3.5 outputs reasoning/thinking tokens by default (like DeepSeek R1 or similar reasoning models)
- `parse_merge_result()` in stage3_reduce.py cannot parse this as JSON → falls back to raw text as summary
- **Result**: `keywords` array is empty, `summary` contains model reasoning instead of clean 3-line summary
- **Fix needed**: Either (a) strip `<think>` / thinking blocks before parsing, (b) use `chat_template` that suppresses thinking, or (c) add post-processing to extract the JSON from the reasoning output

### 15. Final pipeline statistics
- **Total wall time**: 4761s (~79 min, excluding ~7 min flashinfer compilation)
- **Total LLM calls**: 59 (58 stop + 1 length truncation)
- **Total tokens**: 1,629,475 prompt + 248,317 generation = **1.88M tokens**
- **Overflow retries**: 22 (37% of all calls were retries)
- **Latency**: avg 44.4s/call, max 87.8s, min 10.6s
- **Zero fatal errors**: 0 abort, 0 error throughout

## Potential Optimizations
1. **Cap intermediate merge `max_tokens`** — prevent runaway generation in pairwise merge
2. **Pre-compile flashinfer kernels** — eliminate 7-min cold start
3. **Write intermediate results** — enable crash recovery and progress visibility
4. **Batch pairwise merges** — if vLLM supports concurrent requests, merge pairs in parallel
5. **Summarize-then-merge strategy** — instead of merging raw summaries, first compress each to fixed length before tree merge
6. ~~**Strip Qwen3.5 thinking tokens**~~ — **DONE**: `--reasoning-parser qwen3` on vLLM server
7. ~~**Reduce overflow retries**~~ — Re-analyzed: retries cost ~1.6% of map time; char-based threshold can be added if needed
8. ~~**Parallel map**~~ — **DONE**: `asyncio.gather` + `asyncio.Semaphore` with `--map-concurrency` flag (default 4)
