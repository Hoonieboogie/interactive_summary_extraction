# Error Log

## 2026-03-12 ~01:43 KST — Chunking Infinite Loop in `_summarize_chunks`

### Status: OPEN (not fixed)

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
