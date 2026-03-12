# Error Log

## 2026-03-12 ~01:43 KST — Chunking Infinite Loop in `_summarize_chunks`

### Status: FIXED (2026-03-12)

### Symptom

When processing content `2018sah401_0301_0607`, the file `data.js` triggered context overflow and entered the chunking path. The pipeline then entered an **infinite loop**, spamming 400 Bad Request errors every ~0.8 seconds without ever making progress:

```
01:43:53 INFO  File data.js overflows context, chunking...
01:43:53 WARNING Chunk overflow, halving to 687424 chars
01:43:54 WARNING Chunk overflow, halving to 687424 chars
01:43:55 WARNING Chunk overflow, halving to 687424 chars
01:43:56 WARNING Chunk overflow, halving to 687424 chars
... (continued indefinitely at ~1 req/sec, all 400 Bad Request)
```

The logged chunk size was always `687424` — it never decreased. The pipeline had to be manually killed.

### Root Cause Analysis

The bug is in `stage2_map.py`, function `_summarize_chunks` (lines 86-112).

**The code flow:**

1. `summarize_file` catches `ContextOverflowError` on the whole file (line 143)
2. It splits `entry.raw_content` into chunks using `initial_chunk_size` (= `max_model_len * 2` = `65536 * 2` = `131072`) at line 147
3. Calls `_summarize_chunks(chunks, llm)` at line 148

**Inside `_summarize_chunks`:**

```python
for chunk in chunks:                          # line 93
    chunk_size = len(chunk)                   # line 94 — e.g. 1,374,848
    text = chunk                              # line 95
    while True:                               # line 96
        try:
            resp = await llm.call(...)        # line 98 — 400 error
        except ContextOverflowError:          # line 102
            chunk_size //= 2                  # line 103 — 687,424
            sub_chunks = split_into_chunks(text, chunk_size)  # line 105
            sub_summaries, sub_responses = await _summarize_chunks(sub_chunks, llm)  # line 107 — RECURSE
            ...
            break                             # line 110
```

**The problem:** The recursive call at line 107 enters a new invocation of `_summarize_chunks`. In this new invocation, each sub-chunk goes through the same path:
- Line 94: `chunk_size = len(sub_chunk)` — this is approximately the same as the parent's halved `chunk_size` (~687,424), because `split_into_chunks` produced chunks of that size
- Line 98: LLM call fails with 400 (still too large for 65536 token context)
- Line 103: `chunk_size //= 2` → ~343,712
- Line 105: splits into sub-sub-chunks of ~343,712 chars
- Line 107: recurses again...

**But the log always shows `687424`!** This is because each recursion level independently:
1. Sets `chunk_size = len(chunk)` (approximately the parent's split size)
2. Halves it once
3. Recurses before halving again

So each recursion level only halves ONCE then recurses, and the new level starts fresh with `len(chunk)` which is roughly the same halved size. It's an infinite chain of single-halve-then-recurse, never converging to a size the model can handle.

**Additionally**: Even if the halving eventually worked, it would produce an exponential number of recursive calls (tree explosion), potentially running for hours or exhausting memory before completing.

### Expected Behavior

Chunks should be progressively halved until they fit within the model's context window (~65536 tokens ≈ ~130K chars for mixed content), then summarized and merged.

### Affected File

- `pipeline/pipeline_v2/stage2_map.py` — `_summarize_chunks()` (lines 86-112)

### Test Content That Triggers It

- Content: `2018sah401_0301_0607`
- File: `data.js` (large JavaScript data file, ~1.3MB+ of text)

### Suggested Fix Direction

The recursive approach is fundamentally flawed. Instead:
1. Use an **iterative** halving loop: if a chunk overflows, split it smaller and retry — all within a single loop, no recursion
2. Set a **minimum chunk size** floor to prevent infinite loops (e.g., 10,000 chars)
3. Track the **effective chunk size** across iterations rather than resetting it from `len(chunk)` each time

### Environment

- vLLM 0.17.1, Qwen3.5-27B-FP8, max-model-len=65536
- `initial_chunk_size` = 131,072 (= 65536 * 2)
- RunPod H100 80GB, CUDA 12.8, flashinfer 0.6.4

---

## 2026-03-12 ~04:39 KST — httpx.ReadTimeout on Large Chunk Summarization

### Status: FIXED (2026-03-12)

**Resolution:** Comprehensive overhaul replacing ratio-based chunking with always-halve + error isolation. See `docs/plans/2026-03-12-robust-chunking-and-error-resilience.md` for full plan. Commits: `02a52f2`, `b7ad5e0`, `c77f27a`, `c1220d2`, `61a41ac`.

### Symptom

After the chunking infinite loop was fixed, the pipeline successfully chunked `data.js` and processed several chunks with 200 OK. However, it crashed with `httpx.ReadTimeout` while waiting for vLLM to respond to one of the 65K-char chunks:

```
04:39:27 INFO  HTTP Request: POST http://localhost:8000/v1/chat/completions "HTTP/1.1 400 Bad Request"
04:39:27 WARNING Chunk overflow, halving to 65536 chars
...
httpx.ReadTimeout
```

The pipeline had processed ~15 LLM calls successfully before the timeout.

### Root Cause Analysis

The HTTP client timeout is 300 seconds (`llm_client.py` line 45):
```python
self._http = httpx.AsyncClient(base_url=base_url, timeout=300.0)
```

The fundamental problem is `initial_chunk_size = max_model_len * 2 = 131072` chars. After halving on overflow, chunks are ~65K chars, which tokenize to nearly the full 65536-token context window. This leaves almost no room for output generation, forcing vLLM to work at maximum context utilization where inference is slowest.

A chunk that fills ~100% of the context window:
- Requires maximum KV-cache allocation
- Has maximum attention computation cost (quadratic in sequence length)
- Leaves minimal output token budget

This is not just a timeout issue — it's an inefficient use of the model's context. Simply increasing the timeout would mask the problem while wasting GPU time.

### Affected Files

- `pipeline/pipeline_v2/main.py` — `initial_chunk_size = max_model_len * 2` (line 59)
- `pipeline/pipeline_v2/llm_client.py` — `timeout=300.0` (line 45)

### Test Content That Triggers It

- Content: `2018sah401_0301_0607`
- File: `data.js` (~1.3MB+ minified JavaScript)

### Fix Attempt 1 — Dynamic chunk sizing (FAILED)

Replaced static `initial_chunk_size = max_model_len * 2` with dynamic chunk sizing based on actual tokenization:

1. `ContextOverflowError` now parses actual token count from vLLM/OpenAI error messages
2. `_compute_chunk_size()` calculates real `chars_per_token` ratio, targets `max_model_len - 4096` input tokens
3. Falls back to halving if token count unavailable

**Result:** Still crashed with `httpx.ReadTimeout`.

**Why it failed:** vLLM clips reported token count to `max_model_len + 1` (always `65537`) regardless of actual input size. This made the ratio calculation wrong:
- 1.28M chars / 65537 tokens = 19.66 chars/token (real ratio is ~1-2 for minified JS)
- Each resize only shrank by ~6%, taking 30+ overflow retries to converge from 1.28M → 143K chars
- At 143K chars chunks started succeeding (~30-60s each), processed 25+ chunks OK
- Then one chunk still timed out at 300s

### Fix Attempt 2 — Clipped token detection + ReadTimeout retry (FAILED)

Added on top of attempt 1:

1. **Clipped token detection**: if `chars_per_token > 4`, the reported token count is clipped/unreliable → fall back to halving. This makes large files converge in ~4 halves instead of 30+ ratio-based resizes.
2. **ReadTimeout retry** in `llm_client.py`: retries up to 3 times with exponential backoff on `httpx.ReadTimeout`, instead of crashing immediately.

**Result:** Clipped token detection worked correctly — convergence was fast (~4 halves from 1.37M → 132K chars). Pipeline processed ~25 successful LLM calls including several data.js chunks. However, one chunk at **132,745 chars** timed out on all 3 retry attempts (3× 300s = ~15 min wasted), then crashed:

```
05:58:00 WARNING Chunk overflow (65537 tokens for 141597 chars), resizing to 132745 chars
05:59:22 INFO  HTTP Request: POST http://localhost:8000/v1/chat/completions "HTTP/1.1 200 OK"
06:04:22 WARNING Read timeout (attempt 1/3)
06:09:27 WARNING Read timeout (attempt 2/3)
06:14:32 httpx.ReadTimeout: Read timeout after 300.0s
```

**Why it failed:** `OUTPUT_RESERVE_TOKENS = 4096` targets `max_model_len - 4096 = 61440` input tokens. After halving converges, chunks land at ~130K chars, which tokenizes to ~61K tokens — filling ~94% of the context window. At this utilization:
- KV-cache is near-maximum, leaving little room for batching/scheduling
- Attention computation is quadratic in sequence length
- Some chunks complete in 30-80s, others hang >300s — vLLM behavior is unpredictable at near-full context

The retry mechanism only masks the problem — retrying the same oversized chunk 3 times just wastes 15 minutes before crashing.

### Final Fix — Always-halve + error isolation (SUCCESS)

> **Note:** Fix attempts 1 and 2 above are historical records. The code they reference (`_compute_chunk_size`, `OUTPUT_RESERVE_TOKENS`, `initial_chunk_size = max_model_len * 2`) has been deleted. The final fix replaced all of it.

The suggested fix direction (increasing `OUTPUT_RESERVE_TOKENS`) was also insufficient — see `docs/plans/2026-03-12-robust-chunking-and-error-resilience.md` for the full analysis. The root cause was that vLLM clips token counts on ALL overflows, making any ratio-based sizing fundamentally broken.

**What was done (4 changes):**

1. **Always-halve chunking**: On overflow, chunk size = `len(chunk) // 2`. No ratio math, no token count dependency. Content-agnostic, O(log n) convergence, naturally targets ~50% context utilization. Removed `_compute_chunk_size` and `OUTPUT_RESERVE_TOKENS` entirely.
2. **Overflow-safe chunk merge**: If merged summaries overflow, falls back to pairwise merge with inner overflow protection.
3. **Resilient pairwise merge (stage 3)**: Individual pair merge failures carry both summaries forward instead of crashing. Force-concatenate safety valve prevents infinite loops.
4. **Error isolation**: Per-file and per-content exception handling. Known I/O errors logged at WARNING, unexpected errors at ERROR with traceback. One failure never kills the batch.

**Result:** All crash points eliminated. Pipeline processes any file size, any content type, any char/token ratio without manual intervention.

### Environment

- vLLM 0.17.1, Qwen3.5-27B-FP8, max-model-len=65536
- httpx timeout = 300s
- RunPod H100 80GB, CUDA 12.8, flashinfer 0.6.4
