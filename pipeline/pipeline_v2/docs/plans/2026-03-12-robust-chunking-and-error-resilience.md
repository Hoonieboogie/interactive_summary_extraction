# Robust Chunking & Error Resilience Implementation Plan

> **Status: COMPLETED (2026-03-12).** All tasks implemented, reviewed, and tested. 74 tests pass. Commits: `02a52f2` through `e772f24`.

**Goal:** Make the pipeline crash-proof for arbitrary content — any file size, any char/token ratio, any transient vLLM failure — so it processes 300K+ contents without manual intervention.

**Architecture:** Three layers of defense: (1) always-halve chunking that's content-agnostic and naturally targets ~50% context utilization, (2) overflow-safe merge for chunk summaries, (3) per-file and per-content error isolation so one failure never kills the batch.

**Tech Stack:** Python 3.10+, pytest, pytest-asyncio, httpx, vLLM OpenAI-compatible API

---

## Analysis: Why Always-Halve Is Universal

The current ratio-based `_compute_chunk_size` is broken: vLLM clips reported tokens to `max_model_len + 1` on ALL overflows, making every ratio calculation wrong. No fix to the ratio logic can work because we never get real token counts from overflow errors.

**Always-halve** is content-agnostic:
- Converges in O(log n) steps from any size
- Naturally lands at ~50% context utilization (halving overshoots below the limit)
- No dependency on chars_per_token ratio, which varies wildly across content types
- Example: 1.3M chars → 650K → 325K → 162K → 81K → 40K (fits for ~1 char/token at 61% utilization)
- Example: 200K chars Korean → 100K → fits (at ~3 chars/token = ~33K tokens = 50% utilization)

## Note on `llm_client.py` ReadTimeout Retries

The existing 3-retry with exponential backoff in `llm_client.py` is kept as-is. The root cause of the 15-minute timeout waste was oversized chunks (~130K chars at ~94% context utilization) produced by the broken ratio sizing. With always-halve producing ~50% utilization chunks, the timeout situation resolves naturally. The retry logic remains useful for transient vLLM hiccups.

---

## Crash Points Addressed

| # | Location | Failure | Current | Fix |
|---|----------|---------|---------|-----|
| 1 | `stage2_map.py:_summarize_chunks` | ContextOverflow | Caught, but uses broken ratio sizing | Task 1: always-halve |
| 2 | `stage2_map.py:_summarize_chunks` | ReadTimeout | NOT caught → crash | Task 4: per-file isolation |
| 3 | `stage2_map.py:summarize_file:183` | ReadTimeout on initial call | NOT caught → crash | Task 4: per-file isolation |
| 4 | `stage2_map.py:summarize_file:189` | ReadTimeout on JSON retry | NOT caught → crash | Task 4: per-file isolation |
| 5 | `stage2_map.py:summarize_file:219` | ContextOverflow on chunk merge | NOT caught → crash | Task 2: overflow-safe merge |
| 6 | `stage2_map.py:summarize_file:219` | ReadTimeout on chunk merge | NOT caught → crash | Task 4: per-file isolation |
| 7 | `stage3_reduce.py:pairwise_tree_merge:73` | ContextOverflow on pair | NOT caught → crash | Task 3: resilient pairwise merge |
| 8 | `stage3_reduce.py:pairwise_tree_merge:73` | ReadTimeout on pair | NOT caught → crash | Task 3: resilient pairwise merge |
| 9 | `stage3_reduce.py:pairwise_tree_merge:90` | ReadTimeout on final | NOT caught → crash | Task 4: per-content isolation |
| 10 | Any `llm.call` | HTTPStatusError (non-overflow) | NOT caught → crash | Task 4: per-file/content isolation |

---

## File Structure

- **Modify:** `pipeline/pipeline_v2/stage2_map.py` — chunking strategy + chunk merge overflow handling
- **Modify:** `pipeline/pipeline_v2/stage3_reduce.py` — resilient pairwise merge
- **Modify:** `pipeline/pipeline_v2/main.py` — per-file and per-content error isolation
- **Test:** `pipeline/pipeline_v2/tests/test_stage2_map.py` — tests for new chunking + merge behavior
- **Test:** `pipeline/pipeline_v2/tests/test_stage3_reduce.py` — tests for resilient pairwise merge
- **Test:** `pipeline/pipeline_v2/tests/test_main.py` — tests for error isolation

---

## Chunk 1: Always-Halve Chunking + Overflow-Safe Merge

### Task 1: Simplify Chunking to Always-Halve

**Files:**
- Modify: `pipeline/pipeline_v2/stage2_map.py:98-165`
- Test: `pipeline/pipeline_v2/tests/test_stage2_map.py`

**What to delete:** Remove `OUTPUT_RESERVE_TOKENS` (line 99) and the entire `_compute_chunk_size` function (lines 102-125). These are dead code after switching to always-halve.

- [x] **Step 1: Write failing tests for always-halve behavior**

```python
# In tests/test_stage2_map.py — add imports: _summarize_chunks, MIN_CHUNK_SIZE

from stage2_map import (
    summarize_file,
    split_into_chunks,
    parse_file_summary,
    _summarize_chunks,
    MIN_CHUNK_SIZE,
    FileSummary,
)

class TestSummarizeChunks:
    """Tests for _summarize_chunks iterative halving."""

    @pytest.mark.asyncio
    async def test_halves_on_overflow_until_fits(self):
        """Chunk that overflows should be halved repeatedly until it fits."""
        async def mock_call(system_prompt, user_message):
            if len(user_message) > 500:
                raise ContextOverflowError("overflow", actual_tokens=65537)
            return LLMResponse(text="summary", prompt_tokens=100, completion_tokens=10)

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        # 2000-char chunk: needs halving ~2 times (2000 -> 1000 -> 500)
        big_chunk = "x" * 500 + "\n" + "y" * 500 + "\n" + "z" * 500 + "\n" + "w" * 499
        summaries, responses, retries = await _summarize_chunks([big_chunk], mock_llm)

        assert len(summaries) > 0
        assert all(s == "summary" for s in summaries)
        assert retries >= 2  # At least 2 halvings needed

    @pytest.mark.asyncio
    async def test_min_chunk_size_floor(self):
        """Chunks at MIN_CHUNK_SIZE that still overflow should be skipped, not loop."""
        async def always_overflow(system_prompt, user_message):
            raise ContextOverflowError("overflow", actual_tokens=65537)

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = always_overflow

        tiny_chunk = "x" * (MIN_CHUNK_SIZE - 1)
        summaries, responses, retries = await _summarize_chunks([tiny_chunk], mock_llm)

        assert len(summaries) == 1
        assert "[Content too large to summarize]" in summaries[0]

    @pytest.mark.asyncio
    async def test_preserves_chunk_order(self):
        """Summaries should come back in the same order as input chunks."""
        call_idx = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_idx
            call_idx += 1
            return LLMResponse(text=f"summary_{call_idx}", prompt_tokens=10, completion_tokens=5)

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        chunks = ["chunk_a", "chunk_b", "chunk_c"]
        summaries, responses, retries = await _summarize_chunks(chunks, mock_llm)

        assert summaries == ["summary_1", "summary_2", "summary_3"]
        assert retries == 0
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py::TestSummarizeChunks -v`
Expected: ImportError or test failures due to current implementation mismatch.

- [x] **Step 3: Simplify `_summarize_chunks` and remove dead code**

In `stage2_map.py`:
1. Delete `OUTPUT_RESERVE_TOKENS` (line 99)
2. Delete entire `_compute_chunk_size` function (lines 102-125)
3. Replace `_summarize_chunks` with simplified always-halve version:

```python
MIN_CHUNK_SIZE = 10_000  # Floor to prevent infinite splitting


async def _summarize_chunks(
    chunks: list[str], llm: LLMClient,
) -> tuple[list[str], list[LLMResponse], int]:
    """Summarize each chunk individually. Halve on overflow.
    Returns (plain text summaries, responses, overflow_retries)."""
    summaries = []
    responses = []
    overflow_retries = 0

    pending = list(chunks)

    while pending:
        chunk = pending.pop(0)
        try:
            resp = await llm.call(CHUNK_SYSTEM_PROMPT, chunk)
            summaries.append(resp.text)
            responses.append(resp)
        except ContextOverflowError:
            overflow_retries += 1
            chunk_size = len(chunk) // 2
            if chunk_size < MIN_CHUNK_SIZE:
                chunk_size = MIN_CHUNK_SIZE
            if len(chunk) <= MIN_CHUNK_SIZE:
                logger.error(
                    f"Chunk still overflows at minimum size ({len(chunk)} chars), skipping"
                )
                summaries.append("[Content too large to summarize]")
                continue
            logger.warning(
                f"Chunk overflow ({len(chunk)} chars), halving to {chunk_size} chars"
            )
            sub_chunks = split_into_chunks(chunk, chunk_size)
            pending = sub_chunks + pending

    return summaries, responses, overflow_retries
```

4. Simplify `summarize_file` initial overflow handler — remove `_compute_chunk_size` call, just halve:

```python
    except ContextOverflowError:
        overflow_retries += 1
        logger.info(f"File {entry.filepath} overflows context, chunking...")
        initial_chunk_size = len(entry.raw_content) // 2
        if initial_chunk_size < MIN_CHUNK_SIZE:
            initial_chunk_size = MIN_CHUNK_SIZE
```

5. Remove `max_model_len` parameter from `_summarize_chunks` signature (no longer needed).
6. Update `summarize_file` signature — remove `max_model_len` parameter (no longer used internally). Update callers in `main.py` accordingly.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py -v`
Expected: All tests PASS including both old and new tests.

- [x] **Step 5: Commit**

```bash
git add pipeline/pipeline_v2/stage2_map.py pipeline/pipeline_v2/tests/test_stage2_map.py
git commit -m "fix: replace broken ratio-based chunking with always-halve strategy"
```

---

### Task 2: Overflow-Safe Chunk Merge

**Files:**
- Modify: `pipeline/pipeline_v2/stage2_map.py` (the merge section of `summarize_file`)
- Test: `pipeline/pipeline_v2/tests/test_stage2_map.py`

- [x] **Step 1: Write failing test for chunk merge overflow**

```python
# In tests/test_stage2_map.py — add to TestSummarizeFile

    @pytest.mark.asyncio
    async def test_chunk_merge_overflow_falls_back_to_pairwise(self, mock_llm, sample_entry):
        """If chunk summaries are too large to merge at once, merge pairwise."""
        sample_entry.raw_content = "a" * 20_000 + "\n" + "b" * 20_000

        responses_log = []

        async def mock_call(system_prompt, user_message):
            responses_log.append(system_prompt[:20])
            # Whole-file attempt: overflow
            if len(responses_log) == 1:
                raise ContextOverflowError("overflow", actual_tokens=65537)
            # Chunk summarization: succeed with long summaries
            if "Summarize" in system_prompt:
                return LLMResponse(text="chunk summary " * 100, prompt_tokens=50, completion_tokens=50)
            # First merge attempt: overflow (summaries too large)
            if "통합" in system_prompt and sum(1 for r in responses_log if "통합" in r) == 1:
                raise ContextOverflowError("overflow", actual_tokens=65537)
            # Pairwise/subsequent merges succeed
            return LLMResponse(
                text='{"has_educational_content": true, "summary": "final merged"}',
                prompt_tokens=30, completion_tokens=10,
            )

        mock_llm.call.side_effect = mock_call
        result, responses, retries = await summarize_file(sample_entry, 5, mock_llm)
        assert result.summary == "final merged"
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py::TestSummarizeFile::test_chunk_merge_overflow_falls_back_to_pairwise -v`
Expected: FAIL — ContextOverflowError is unhandled at the merge step.

- [x] **Step 3: Add overflow-safe merge to `summarize_file`**

Replace the bare merge call with overflow-safe pairwise fallback. The inner pairwise loop also catches overflow (if individual pair summaries are enormous):

```python
    # Merge chunk summaries — pairwise fallback if too many summaries overflow context
    try:
        merged_text = "\n\n".join(f"Chunk {i+1}:\n{s}" for i, s in enumerate(chunk_summaries))
        merge_resp = await llm.call(CHUNK_MERGE_SYSTEM_PROMPT, merged_text)
        all_responses.append(merge_resp)
    except ContextOverflowError:
        logger.warning(
            f"Chunk merge overflow ({len(chunk_summaries)} summaries), merging pairwise"
        )
        # Iterative pairwise merge until all summaries fit in one call
        current = list(chunk_summaries)
        while len(current) > 1:
            next_level = []
            for i in range(0, len(current), 2):
                group = current[i:i + 2]
                group_text = "\n\n".join(f"Chunk:\n{s}" for s in group)
                try:
                    resp = await llm.call(CHUNK_MERGE_SYSTEM_PROMPT, group_text)
                    all_responses.append(resp)
                    next_level.append(resp.text)
                except ContextOverflowError:
                    # Individual pair too large — carry forward separately for next round
                    logger.warning("Pair merge overflow, carrying summaries forward")
                    next_level.extend(group)
            current = next_level
        merge_resp = LLMResponse(text=current[0], prompt_tokens=0, completion_tokens=0)

    result = parse_file_summary(merge_resp.text)
    result.filepath = entry.filepath
    result.position = entry.position
    return result, all_responses, overflow_retries
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py -v`
Expected: All tests PASS.

- [x] **Step 5: Commit**

```bash
git add pipeline/pipeline_v2/stage2_map.py pipeline/pipeline_v2/tests/test_stage2_map.py
git commit -m "fix: add overflow-safe pairwise merge for chunk summaries"
```

---

## Chunk 2: Stage 3 Resilience + Error Isolation

### Task 3: Resilient Pairwise Merge in Stage 3

**Files:**
- Modify: `pipeline/pipeline_v2/stage3_reduce.py:57-96` (`pairwise_tree_merge`)
- Test: `pipeline/pipeline_v2/tests/test_stage3_reduce.py`

The current `pairwise_tree_merge` has no error handling inside the merge loop. If one pair's merge fails (ContextOverflow or ReadTimeout after retries), all work for that content is lost. Since we've already successfully summarized every file, losing the merge is wasteful.

- [x] **Step 1: Write failing test for pair merge failure**

```python
# In tests/test_stage3_reduce.py — add test

import httpx

class TestPairwiseTreeMergeResilience:

    @pytest.mark.asyncio
    async def test_pair_overflow_carries_forward(self):
        """If one pair overflows, carry both forward for finer-grained merging."""
        call_count = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            # First pair merge: overflow
            if call_count == 1:
                raise ContextOverflowError("overflow", actual_tokens=65537)
            return LLMResponse(
                text='{"summary": "merged", "keywords": ["k1"]}',
                prompt_tokens=20, completion_tokens=10,
            )

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        result, responses = await pairwise_tree_merge(
            ["summary A", "summary B", "summary C"], mock_llm
        )
        # Should not crash; should eventually produce a result
        assert result.summary == "merged"

    @pytest.mark.asyncio
    async def test_pair_timeout_carries_forward(self):
        """If one pair times out, carry both forward."""
        call_count = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise httpx.ReadTimeout("timeout")
            return LLMResponse(
                text='{"summary": "merged", "keywords": ["k1"]}',
                prompt_tokens=20, completion_tokens=10,
            )

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        result, responses = await pairwise_tree_merge(
            ["summary A", "summary B", "summary C"], mock_llm
        )
        assert result.summary == "merged"
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage3_reduce.py::TestPairwiseTreeMergeResilience -v`
Expected: FAIL — exceptions propagate unhandled.

- [x] **Step 3: Add error handling inside `pairwise_tree_merge`**

In `stage3_reduce.py`, wrap the inner pair merge call (line 73) and final merge call (line 90):

```python
async def pairwise_tree_merge(
    summary_texts: list[str], llm: LLMClient
) -> tuple[MergeResult, list[LLMResponse]]:
    """Pairwise tree merge with keyword accumulation."""
    all_responses = []
    all_keywords = []
    current = summary_texts

    while len(current) > 1:
        next_level = []
        i = 0
        while i < len(current):
            if i + 1 < len(current):
                pair_text = f"Summary A:\n{current[i]}\n\nSummary B:\n{current[i+1]}"
                try:
                    for attempt in range(2):
                        resp = await llm.call(INTERMEDIATE_MERGE_SYSTEM_PROMPT, pair_text)
                        all_responses.append(resp)
                        result = parse_merge_result(resp.text)
                        if result.summary != resp.text or attempt == 1:
                            break
                    all_keywords.extend(result.keywords)
                    next_level.append(result.summary)
                except (ContextOverflowError, httpx.HTTPError, OSError):
                    logger.warning(
                        f"Pair merge failed, carrying both summaries forward"
                    )
                    next_level.append(current[i])
                    next_level.append(current[i + 1])
                i += 2
            else:
                next_level.append(current[i])
                i += 1
        # Safety: if no progress (all pairs failed), force-concatenate adjacent pairs
        if len(next_level) >= len(current):
            logger.warning("No merge progress, force-concatenating pairs")
            forced = []
            for j in range(0, len(next_level), 2):
                if j + 1 < len(next_level):
                    forced.append(next_level[j] + "\n" + next_level[j + 1])
                else:
                    forced.append(next_level[j])
            next_level = forced
        current = next_level

    # Final merge: condense to 3 lines + select best keywords
    final_text = f"Summary:\n{current[0]}\n\nAccumulated keywords:\n{', '.join(all_keywords)}"
    for attempt in range(2):
        resp = await llm.call(FINAL_PAIRWISE_SYSTEM_PROMPT, final_text)
        all_responses.append(resp)
        result = parse_merge_result(resp.text)
        if result.summary != resp.text or attempt == 1:
            break

    return result, all_responses
```

Key design decisions:
- On pair merge failure: carry both summaries forward (no data loss)
- Safety valve: if ALL pairs fail in a round (no progress), force-concatenate adjacent pairs to guarantee convergence. This prevents infinite loops where every pair keeps failing.
- Final merge (line 90 equivalent) is NOT wrapped — if it fails, per-content isolation catches it. The final merge input is a single summary + keywords, which should be small.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage3_reduce.py -v`
Expected: All tests PASS.

- [x] **Step 5: Commit**

```bash
git add pipeline/pipeline_v2/stage3_reduce.py pipeline/pipeline_v2/tests/test_stage3_reduce.py
git commit -m "fix: add error resilience to pairwise tree merge in stage 3"
```

---

### Task 4: Per-File and Per-Content Error Isolation

**Files:**
- Modify: `pipeline/pipeline_v2/main.py:62-73` (per-file loop) and `pipeline/pipeline_v2/main.py:144-148` (per-content loop)
- Test: `pipeline/pipeline_v2/tests/test_main.py`

This is the safety net. Tasks 1-3 handle known failure modes gracefully. This catches anything unexpected (programming bugs, OOM, etc.) and prevents one bad file/content from killing a 300K batch.

- [x] **Step 1: Write failing tests for error isolation**

```python
# In tests/test_main.py — add these tests

import httpx
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path
from main import process_content
from llm_client import LLMResponse, ContextOverflowError


class TestErrorIsolation:

    @pytest.mark.asyncio
    async def test_file_timeout_skips_file_continues(self):
        """If one file crashes with ReadTimeout, skip it and process remaining files."""
        call_count = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise httpx.ReadTimeout("timeout")
            return LLMResponse(
                text='{"has_educational_content": true, "summary": "ok"}',
                prompt_tokens=10, completion_tokens=5, duration_seconds=1.0,
            )

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        with patch("main.discover_files") as mock_discover, \
             patch("main.order_files") as mock_order, \
             patch("main.merge_summaries") as mock_merge, \
             patch("main.save_result"):

            entries = [
                MagicMock(position=1, filepath="a.html", raw_content="content a"),
                MagicMock(position=2, filepath="b.html", raw_content="content b"),
                MagicMock(position=3, filepath="c.html", raw_content="content c"),
            ]
            mock_discover.return_value = entries
            mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.5)])
            mock_merge.return_value = (MagicMock(summary="final", keywords=["k"]), [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.3)])

            result = await process_content(
                Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm
            )

            assert result is not None

    @pytest.mark.asyncio
    async def test_all_files_fail_returns_none(self):
        """If every file fails, process_content returns None without crashing."""
        async def always_fail(system_prompt, user_message):
            raise httpx.ReadTimeout("timeout")

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = always_fail

        with patch("main.discover_files") as mock_discover, \
             patch("main.order_files") as mock_order, \
             patch("main.save_result") as mock_save:

            entries = [
                MagicMock(position=1, filepath="a.html", raw_content="content a"),
                MagicMock(position=2, filepath="b.html", raw_content="content b"),
            ]
            mock_discover.return_value = entries
            mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.5)])

            result = await process_content(
                Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm
            )

            assert result is None
            mock_save.assert_not_called()
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_main.py::TestErrorIsolation -v`
Expected: FAIL — ReadTimeout propagates and crashes `process_content`.

- [x] **Step 3: Add per-file error isolation in `main.py`**

In `process_content`, wrap the per-file summarization loop. Catch I/O errors explicitly, with a broad fallback logged distinctly:

```python
    # Stage 2: Per-File Summarization (Map)
    t_map = time.monotonic()
    total_files = len(ordered_entries)
    file_summaries = []
    total_overflow_retries = 0
    for entry in ordered_entries:
        try:
            summary, responses, overflow_retries = await summarize_file(
                entry, total_files, llm, max_model_len
            )
            file_summaries.append(summary)
            all_responses.extend(responses)
            llm_calls += len(responses)
            total_overflow_retries += overflow_retries
        except (httpx.HTTPError, ContextOverflowError, OSError) as e:
            logger.warning(f"File {entry.filepath} failed ({type(e).__name__}), skipping")
            continue
        except Exception:
            logger.error(
                f"Unexpected error summarizing {entry.filepath}, skipping",
                exc_info=True,
            )
            continue
    wall_map = round(time.monotonic() - t_map, 2)

    if not file_summaries:
        logger.error(f"All files failed for {content_id}, skipping content")
        return None
```

Add import at top of `main.py`:
```python
from llm_client import ContextOverflowError
```

- [x] **Step 4: Add per-content error isolation in `main.py`**

In `run`, wrap the per-content loop with the same two-tier pattern:

```python
        for folder in folders:
            if not folder.is_dir():
                logger.warning(f"Not a directory: {folder}")
                continue
            try:
                await process_content(folder, args.output_dir, args.model, llm, model_cfg.max_model_len)
            except (httpx.HTTPError, ContextOverflowError, OSError) as e:
                logger.warning(f"Content {folder.name} failed ({type(e).__name__}), skipping")
                continue
            except Exception:
                logger.error(f"Unexpected error processing {folder.name}, skipping", exc_info=True)
                continue
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_main.py -v`
Expected: All tests PASS.

- [x] **Step 6: Run full test suite**

Run: `cd pipeline/pipeline_v2 && python -m pytest -v`
Expected: All tests PASS.

- [x] **Step 7: Commit**

```bash
git add pipeline/pipeline_v2/main.py pipeline/pipeline_v2/tests/test_main.py
git commit -m "fix: add per-file and per-content error isolation for crash resilience"
```

---

## Post-Implementation Cleanup

- [x] Update `pipeline/pipeline_v2/error_log.md` — mark ReadTimeout issue as FIXED, reference this plan
- [x] Update worklog `docs/worklogs/2026-03-12.md`
