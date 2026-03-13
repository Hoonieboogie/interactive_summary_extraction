# Parallel Map Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Parallelize per-file summarization in the map phase using semaphore-gated asyncio.gather.

**Architecture:** Add `--map-concurrency` CLI flag (default 4). Replace sequential for-loop in `process_content()` with `asyncio.gather(return_exceptions=True)` gated by `asyncio.Semaphore`. No changes to stage2_map.py or llm_client.py.

**Tech Stack:** asyncio (stdlib)

---

### Task 1: Add `--map-concurrency` CLI flag

**Files:**
- Modify: `pipeline/pipeline_v2/main.py:23-31`
- Test: `pipeline/pipeline_v2/tests/test_main.py`

**Step 1: Write the failing test**

```python
# In TestParseArgs
def test_map_concurrency_default(self):
    args = parse_args(["--content-dir", "/data"])
    assert args.map_concurrency == 4

def test_map_concurrency_custom(self):
    args = parse_args(["--content-dir", "/data", "--map-concurrency", "8"])
    assert args.map_concurrency == 8
```

**Step 2: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_main.py::TestParseArgs::test_map_concurrency_default -v`
Expected: FAIL — `args` has no attribute `map_concurrency`

**Step 3: Write minimal implementation**

Add to `parse_args()` after the `--skip-server` line:

```python
parser.add_argument("--map-concurrency", type=int, default=4, help="Max concurrent files in map phase")
```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_main.py::TestParseArgs -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/main.py pipeline/pipeline_v2/tests/test_main.py
git commit -m "feat: add --map-concurrency CLI flag"
```

---

### Task 2: Parallelize map loop in `process_content()`

**Files:**
- Modify: `pipeline/pipeline_v2/main.py:34-84`
- Test: `pipeline/pipeline_v2/tests/test_main.py`

**Step 1: Write the failing test**

```python
# In TestProcessContent
@pytest.mark.asyncio
async def test_parallel_map_respects_concurrency(self):
    """Verify that map runs with concurrency control and collects all results."""
    import asyncio

    max_concurrent = 0
    current_concurrent = 0
    lock = asyncio.Lock()

    async def mock_call(system_prompt, user_message):
        nonlocal max_concurrent, current_concurrent
        async with lock:
            current_concurrent += 1
            max_concurrent = max(max_concurrent, current_concurrent)
        await asyncio.sleep(0.05)
        async with lock:
            current_concurrent -= 1
        return LLMResponse(
            text='{"has_educational_content": true, "summary": "ok"}',
            prompt_tokens=10, completion_tokens=5, duration_seconds=0.05,
        )

    mock_llm = AsyncMock()
    mock_llm.call.side_effect = mock_call

    with patch("main.discover_files") as mock_discover, \
         patch("main.order_files") as mock_order, \
         patch("main.merge_summaries") as mock_merge, \
         patch("main.save_result"):

        entries = [
            MagicMock(position=i, filepath=f"f{i}.html", raw_content=f"content {i}")
            for i in range(8)
        ]
        mock_discover.return_value = entries
        mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.1)])
        mock_merge.return_value = (MagicMock(summary="final", keywords=["k"]), [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.1)])

        result = await process_content(
            Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm,
            map_concurrency=2,
        )

        assert result is not None
        # 8 files with concurrency=2 → max_concurrent should be exactly 2
        assert max_concurrent == 2
```

**Step 2: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_main.py::TestProcessContent::test_parallel_map_respects_concurrency -v`
Expected: FAIL — `process_content` doesn't accept `map_concurrency`

**Step 3: Write minimal implementation**

Replace the map section in `process_content()`. Add `map_concurrency: int = 4` parameter.

```python
async def process_content(
    content_dir: Path, output_dir: Path, model_name: str, llm: LLMClient,
    map_concurrency: int = 4,
) -> dict | None:
```

Replace lines 63-84 (the sequential for-loop) with:

```python
    # Stage 2: Per-File Summarization (Map) — parallel
    t_map = time.monotonic()
    total_files = len(ordered_entries)
    file_summaries = []
    total_overflow_retries = 0

    sem = asyncio.Semaphore(map_concurrency)

    async def _summarize_one(entry):
        async with sem:
            return await summarize_file(entry, total_files, llm)

    results = await asyncio.gather(
        *[_summarize_one(e) for e in ordered_entries],
        return_exceptions=True,
    )

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            filepath = ordered_entries[i].filepath
            logger.warning(f"File {filepath} failed ({type(result).__name__}), skipping")
            continue
        summary, responses, overflow_retries = result
        file_summaries.append(summary)
        all_responses.extend(responses)
        llm_calls += len(responses)
        total_overflow_retries += overflow_retries
    wall_map = round(time.monotonic() - t_map, 2)
```

**Step 4: Run ALL tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_main.py -v`
Expected: ALL PASS (including existing error isolation tests — they use positional args so `map_concurrency` defaults to 4)

**Step 5: Update caller in `run()`**

Pass `map_concurrency` from args to `process_content()` at line 164:

```python
await process_content(folder, args.output_dir, args.model, llm, args.map_concurrency)
```

**Step 6: Run full test suite**

Run: `cd pipeline/pipeline_v2 && uv run pytest -v`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add pipeline/pipeline_v2/main.py pipeline/pipeline_v2/tests/test_main.py
git commit -m "feat: parallelize map phase with semaphore-gated asyncio.gather"
```

---

### Task 3: Update worklog

**Files:**
- Modify: `docs/worklogs/worklog_260313.md`

**Step 1:** Add entry documenting the parallel map implementation under a new section.

**Step 2: Commit and push**

```bash
git add docs/worklogs/worklog_260313.md
git commit -m "docs: update worklog with parallel map implementation"
git push origin main && git push github main
```
