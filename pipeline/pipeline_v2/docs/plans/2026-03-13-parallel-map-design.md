# Design: Parallel Map with Semaphore-Gated asyncio.gather

**Date**: 2026-03-13
**Status**: Approved

## Problem

Map phase processes files sequentially — 69 min (87% of total wall time) in the first test run. Files are independent; no reason to serialize them.

## Approach

Semaphore-gated `asyncio.gather` (Approach A). Chosen over worker pool (unnecessary complexity) and TaskGroup (cancels all on first failure, violates "never crash on unreadable files").

## Changes

### 1. `main.py` — `parse_args()`
- Add `--map-concurrency` CLI flag, default 4

### 2. `main.py` — `process_content()`
- Accept `map_concurrency` parameter
- Replace sequential `for` loop with semaphore-gated `asyncio.gather`
- Post-gather loop separates results from exceptions, logs failures

### 3. No changes to `stage2_map.py`, `llm_client.py`, or tests
- `summarize_file()` is already async
- `httpx.AsyncClient` is concurrency-safe
- Existing tests mock LLMClient per-file, unaffected

## Design Sketch

```python
sem = asyncio.Semaphore(map_concurrency)

async def _process_one(entry):
    async with sem:
        return await summarize_file(entry, total_files, llm)

results = await asyncio.gather(
    *[_process_one(e) for e in ordered_entries],
    return_exceptions=True,
)

for i, result in enumerate(results):
    if isinstance(result, Exception):
        logger.warning(f"File {ordered_entries[i].filepath} failed (...), skipping")
        continue
    summary, responses, overflow_retries = result
    file_summaries.append(summary)
    all_responses.extend(responses)
    llm_calls += len(responses)
    total_overflow_retries += overflow_retries
```

## Constraints

- File order preserved (gather returns in input order)
- Error isolation (exceptions captured, not raised)
- All metrics collected (overflow retries, responses, llm calls)
- Concurrency tunable via CLI without code changes
