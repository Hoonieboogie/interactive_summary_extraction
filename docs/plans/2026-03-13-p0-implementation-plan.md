# P0: Token-Aware Budget + Per-File Status — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate thinking-token budget exhaustion and make per-file failures visible in pipeline output.

**Architecture:** Add `transformers.AutoTokenizer` to `LLMClient` for exact prompt token counting. Auto-calculate `max_tokens` before every API call. Pre-chunk files by token budget in `stage2_map.py`. Track per-file success/failure in `main.py` and include in output JSON.

**Tech Stack:** Python 3.10+, `transformers` (tokenizer-only, no PyTorch), `httpx`, `pytest`/`pytest-asyncio`

---

### Task 1: Add `transformers` dependency

**Files:**
- Modify: `pipeline/pipeline_v2/pyproject.toml`

**Step 1: Update pyproject.toml**

```toml
dependencies = [
    "httpx>=0.28",
    "charset-normalizer>=3.0",
    "transformers>=5.0",
]
```

**Step 2: Verify install**

Run: `cd pipeline/pipeline_v2 && uv sync`
Expected: resolves and installs `transformers` without PyTorch

**Step 3: Commit**

```bash
git add pipeline/pipeline_v2/pyproject.toml pipeline/pipeline_v2/uv.lock
git commit -m "deps: add transformers for tokenizer-based token counting"
```

---

### Task 2: Add `InsufficientBudgetError` and `min_generation_tokens` to config/client

**Files:**
- Modify: `pipeline/pipeline_v2/config.py`
- Modify: `pipeline/pipeline_v2/llm_client.py`
- Test: `pipeline/pipeline_v2/tests/test_config.py`
- Test: `pipeline/pipeline_v2/tests/test_llm_client.py`

**Step 1: Write failing tests for config changes**

In `tests/test_config.py`, add:

```python
def test_model_has_min_generation_tokens(self):
    cfg = get_model_config("qwen3.5-27b")
    assert isinstance(cfg.min_generation_tokens, int)
    assert cfg.min_generation_tokens >= 1024
```

**Step 2: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_config.py::TestModelConfig::test_model_has_min_generation_tokens -v`
Expected: FAIL — `AttributeError: ... has no attribute 'min_generation_tokens'`

**Step 3: Implement config change**

In `config.py`, add `min_generation_tokens` field to `ModelConfig`:

```python
@dataclass(frozen=True)
class ModelConfig:
    name: str
    hf_id: str
    max_model_len: int
    min_generation_tokens: int = 4096
    vllm_args: list[str] = field(default_factory=list)
```

**Step 4: Run test to verify it passes**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_config.py -v`
Expected: all PASS

**Step 5: Write failing test for InsufficientBudgetError**

In `tests/test_llm_client.py`, add import and test:

```python
from llm_client import LLMClient, ContextOverflowError, LLMResponse, _parse_token_count, InsufficientBudgetError


class TestInsufficientBudgetError:
    def test_attributes(self):
        err = InsufficientBudgetError(prompt_tokens=60000, max_tokens=1000, min_required=4096)
        assert err.prompt_tokens == 60000
        assert err.max_tokens == 1000
        assert err.min_required == 4096
        assert "60000" in str(err)
```

**Step 6: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_llm_client.py::TestInsufficientBudgetError -v`
Expected: FAIL — `ImportError: cannot import name 'InsufficientBudgetError'`

**Step 7: Implement InsufficientBudgetError**

In `llm_client.py`, add after `ContextOverflowError`:

```python
class InsufficientBudgetError(Exception):
    """Raised when prompt is too large to leave enough generation tokens."""
    def __init__(self, prompt_tokens: int, max_tokens: int, min_required: int):
        self.prompt_tokens = prompt_tokens
        self.max_tokens = max_tokens
        self.min_required = min_required
        super().__init__(
            f"Insufficient generation budget: {max_tokens} tokens available "
            f"(prompt={prompt_tokens}), minimum {min_required} required"
        )
```

**Step 8: Run tests to verify pass**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_llm_client.py tests/test_config.py -v`
Expected: all PASS

**Step 9: Commit**

```bash
git add pipeline/pipeline_v2/config.py pipeline/pipeline_v2/llm_client.py pipeline/pipeline_v2/tests/test_config.py pipeline/pipeline_v2/tests/test_llm_client.py
git commit -m "feat: add InsufficientBudgetError and min_generation_tokens config"
```

---

### Task 3: Add tokenizer and `count_tokens` to `LLMClient`

**Files:**
- Modify: `pipeline/pipeline_v2/llm_client.py`
- Test: `pipeline/pipeline_v2/tests/test_llm_client.py`

**Step 1: Write failing tests for tokenizer integration**

In `tests/test_llm_client.py`, add:

```python
from unittest.mock import patch, MagicMock


class TestLLMClientTokenizer:
    """Tests for tokenizer-based token counting in LLMClient."""

    @pytest.fixture
    def mock_tokenizer(self):
        tok = MagicMock()
        tok.apply_chat_template.return_value = list(range(150))  # 150 tokens
        return tok

    @pytest.fixture
    def client_with_tokenizer(self, mock_tokenizer):
        with patch("transformers.AutoTokenizer") as mock_auto:
            mock_auto.from_pretrained.return_value = mock_tokenizer
            client = LLMClient(
                base_url="http://localhost:8000",
                model="qwen3.5-27b",
                hf_id="Qwen/Qwen3.5-27B-FP8",
                max_model_len=65536,
                min_generation_tokens=4096,
            )
        return client

    def test_count_tokens_uses_chat_template(self, client_with_tokenizer, mock_tokenizer):
        count = client_with_tokenizer.count_tokens("system prompt", "user message")
        assert count == 150
        mock_tokenizer.apply_chat_template.assert_called_once()
        # Verify messages structure passed to apply_chat_template
        call_args = mock_tokenizer.apply_chat_template.call_args
        messages = call_args[0][0]
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "system prompt"
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "user message"

    def test_count_tokens_returns_int(self, client_with_tokenizer, mock_tokenizer):
        mock_tokenizer.apply_chat_template.return_value = list(range(42))
        assert client_with_tokenizer.count_tokens("s", "u") == 42
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_llm_client.py::TestLLMClientTokenizer -v`
Expected: FAIL — `TypeError: LLMClient.__init__() got unexpected keyword arguments`

**Step 3: Implement tokenizer in LLMClient**

**CRITICAL**: Do NOT add a top-level `from transformers import AutoTokenizer` import. This would break
every module that imports from `llm_client.py` (`stage2_map`, `stage3_reduce`, `main`) if `transformers`
is not installed — causing all 83+ tests to fail with `ImportError`. Instead, use a **lazy import**
inside `__init__`, guarded by the `hf_id` check. This keeps `LLMClient` importable and testable
without `transformers`, and only requires it when the tokenizer is actually used.

Update `LLMClient.__init__` and add `count_tokens` (NO top-level import):

```python
class LLMClient:
    def __init__(
        self,
        base_url: str,
        model: str,
        hf_id: str | None = None,
        max_model_len: int | None = None,
        min_generation_tokens: int = 4096,
    ):
        self.model = model
        self.max_model_len = max_model_len
        self.min_generation_tokens = min_generation_tokens
        self._http = httpx.AsyncClient(base_url=base_url, timeout=300.0)

        # Load tokenizer for token counting (optional — backwards compatible)
        # Lazy import: transformers is only required when tokenizer is actually used
        self._tokenizer = None
        if hf_id and max_model_len:
            from transformers import AutoTokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(hf_id)

    def count_tokens(self, system_prompt: str, user_message: str) -> int:
        """Count exact prompt tokens using the model's chat template."""
        if self._tokenizer is None:
            raise RuntimeError("Tokenizer not loaded — pass hf_id and max_model_len to enable")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        return len(self._tokenizer.apply_chat_template(messages, tokenize=True))
```

**Step 4: Run tests to verify pass**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_llm_client.py -v`
Expected: all PASS (existing tests still work because new params are optional, and no top-level import of transformers)

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/llm_client.py pipeline/pipeline_v2/tests/test_llm_client.py
git commit -m "feat: add tokenizer to LLMClient for exact prompt token counting"
```

---

### Task 4: Auto-calculate `max_tokens` in `LLMClient.call()`

**Files:**
- Modify: `pipeline/pipeline_v2/llm_client.py`
- Test: `pipeline/pipeline_v2/tests/test_llm_client.py`

**Step 1: Write failing tests**

In `tests/test_llm_client.py`, add:

```python
class TestLLMClientMaxTokens:
    """Tests for automatic max_tokens calculation in call()."""

    @pytest.fixture
    def mock_tokenizer(self):
        tok = MagicMock()
        return tok

    @pytest.fixture
    def client(self, mock_tokenizer):
        with patch("transformers.AutoTokenizer") as mock_auto:
            mock_auto.from_pretrained.return_value = mock_tokenizer
            client = LLMClient(
                base_url="http://localhost:8000",
                model="qwen3.5-27b",
                hf_id="Qwen/Qwen3.5-27B-FP8",
                max_model_len=65536,
                min_generation_tokens=4096,
            )
        return client

    @pytest.mark.asyncio
    async def test_sets_max_tokens_in_request(self, client, mock_tokenizer):
        """call() should include max_tokens = max_model_len - prompt_tokens."""
        mock_tokenizer.apply_chat_template.return_value = list(range(10000))  # 10000 prompt tokens

        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "response text"}}],
                "usage": {"prompt_tokens": 10000, "completion_tokens": 50},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
            await client.call("system", "user")
            posted_json = mock_post.call_args[1]["json"]
            assert posted_json["max_tokens"] == 65536 - 10000  # 55536

    @pytest.mark.asyncio
    async def test_raises_insufficient_budget(self, client, mock_tokenizer):
        """If prompt leaves less than min_generation_tokens, raise InsufficientBudgetError."""
        # Prompt uses 62000 tokens, leaving only 3536 < 4096
        mock_tokenizer.apply_chat_template.return_value = list(range(62000))

        with pytest.raises(InsufficientBudgetError) as exc_info:
            await client.call("system", "user")
        assert exc_info.value.prompt_tokens == 62000
        assert exc_info.value.max_tokens == 3536
        assert exc_info.value.min_required == 4096

    @pytest.mark.asyncio
    async def test_no_tokenizer_skips_max_tokens(self, client):
        """When tokenizer is not loaded, call() works without max_tokens (backward compat)."""
        client._tokenizer = None
        client.max_model_len = None

        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "response text"}}],
                "usage": {"prompt_tokens": 100, "completion_tokens": 20},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
            result = await client.call("system", "user")
            posted_json = mock_post.call_args[1]["json"]
            assert "max_tokens" not in posted_json
            assert result.text == "response text"
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_llm_client.py::TestLLMClientMaxTokens -v`
Expected: FAIL — no `max_tokens` in request, no `InsufficientBudgetError` raised

**Step 3: Implement auto max_tokens in call()**

In `llm_client.py`, update the `call` method. Replace the request body construction (lines 80-87) with:

```python
    async def call(self, system_prompt: str, user_message: str) -> LLMResponse:
        last_exc = None

        # Pre-calculate max_tokens if tokenizer is available
        request_body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.0,
        }

        if self._tokenizer is not None and self.max_model_len is not None:
            prompt_tokens = self.count_tokens(system_prompt, user_message)
            max_tokens = self.max_model_len - prompt_tokens
            if max_tokens < self.min_generation_tokens:
                raise InsufficientBudgetError(prompt_tokens, max_tokens, self.min_generation_tokens)
            request_body["max_tokens"] = max_tokens

        for attempt in range(1, MAX_RETRIES + 1):
            t0 = time.monotonic()
            try:
                response = await self._http.post(
                    "/v1/chat/completions",
                    json=request_body,
                )
            except httpx.ReadTimeout:
                logger.warning(
                    f"Read timeout (attempt {attempt}/{MAX_RETRIES})"
                )
                last_exc = httpx.ReadTimeout(
                    f"Read timeout after {self._http.timeout.read}s"
                )
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    logger.info(f"Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                raise last_exc

            # Handle context overflow (400 or 500)
            if response.status_code in (400, 500):
                msg = _extract_error_message(response)
                if _is_context_overflow(msg):
                    raise ContextOverflowError(msg, actual_tokens=_parse_token_count(msg))

            # Non-retryable client errors
            if 400 <= response.status_code < 500:
                response.raise_for_status()

            # Retryable server errors (500+)
            if response.status_code >= 500:
                msg = _extract_error_message(response)
                logger.warning(
                    f"Server error {response.status_code} (attempt {attempt}/{MAX_RETRIES}): {msg}"
                )
                last_exc = httpx.HTTPStatusError(
                    f"Server error {response.status_code}: {msg}",
                    request=response.request,
                    response=response,
                )
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    logger.info(f"Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                raise last_exc

            # Success
            elapsed = time.monotonic() - t0
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            if not content:
                raise ValueError(
                    "LLM returned empty content (model may have produced only thinking tokens)"
                )
            return LLMResponse(
                text=content,
                prompt_tokens=data["usage"]["prompt_tokens"],
                completion_tokens=data["usage"]["completion_tokens"],
                duration_seconds=round(elapsed, 2),
            )

        raise last_exc  # Should not reach here, but safety net
```

**Step 4: Run all llm_client tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_llm_client.py -v`
Expected: all PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/llm_client.py pipeline/pipeline_v2/tests/test_llm_client.py
git commit -m "feat: auto-calculate max_tokens from tokenizer before every LLM call"
```

---

### Task 5: Wire tokenizer params from config through `main.py` to `LLMClient`

**Files:**
- Modify: `pipeline/pipeline_v2/main.py`
- Test: `pipeline/pipeline_v2/tests/test_main.py`

**Step 1: Write failing test**

In `tests/test_main.py`, add:

```python
class TestLLMClientWiring:
    @pytest.mark.asyncio
    async def test_llm_client_receives_model_config(self):
        """LLMClient should be constructed with hf_id and max_model_len from ModelConfig."""
        from main import run, parse_args
        from config import get_model_config

        args = parse_args(["--content-dir", "/fake", "--skip-server", "--content-ids", "nonexistent"])

        with patch("main.LLMClient") as MockClient:
            mock_instance = AsyncMock()
            MockClient.return_value = mock_instance
            mock_instance.close = AsyncMock()

            await run(args)

            cfg = get_model_config(args.model)
            MockClient.assert_called_once_with(
                base_url=f"http://localhost:8000",
                model=cfg.hf_id,
                hf_id=cfg.hf_id,
                max_model_len=cfg.max_model_len,
                min_generation_tokens=cfg.min_generation_tokens,
            )
```

**Step 2: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_main.py::TestLLMClientWiring -v`
Expected: FAIL — `LLMClient` called without `hf_id`/`max_model_len`

**Step 3: Update main.py LLMClient construction**

In `main.py`, update the `run()` function (around line 156-159):

```python
        llm = LLMClient(
            base_url=f"http://localhost:{VLLM_PORT}",
            model=model_cfg.hf_id,
            hf_id=model_cfg.hf_id,
            max_model_len=model_cfg.max_model_len,
            min_generation_tokens=model_cfg.min_generation_tokens,
        )
```

**Step 4: Run tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_main.py -v`
Expected: all PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/main.py pipeline/pipeline_v2/tests/test_main.py
git commit -m "feat: wire tokenizer config from ModelConfig to LLMClient"
```

---

### Task 6: Token-aware chunking in `stage2_map.py`

**Files:**
- Modify: `pipeline/pipeline_v2/stage2_map.py`
- Test: `pipeline/pipeline_v2/tests/test_stage2_map.py`

**Step 1: Write failing tests for token-aware chunking**

In `tests/test_stage2_map.py`, add:

```python
from stage2_map import calculate_chunk_size


class TestCalculateChunkSize:
    def test_returns_chars_based_on_token_ratio(self):
        """Should return max chars per chunk given token constraints."""
        # 65536 model len, 200 system tokens, 4096 min gen = 61240 max content tokens
        # At 3.5 chars/token ratio = 214,340 max chars
        result = calculate_chunk_size(
            content="x" * 1000,
            content_tokens=286,  # ~3.5 chars/token
            system_prompt_tokens=200,
            max_model_len=65536,
            min_generation_tokens=4096,
        )
        expected_max_tokens = 65536 - 200 - 4096  # 61240
        expected_chars = int(expected_max_tokens * (1000 / 286))
        assert result == expected_chars

    def test_returns_none_when_content_fits(self):
        """If full content fits with enough generation budget, return None (no chunking needed)."""
        result = calculate_chunk_size(
            content="short content",
            content_tokens=5,
            system_prompt_tokens=200,
            max_model_len=65536,
            min_generation_tokens=4096,
        )
        assert result is None

    def test_floor_at_min_chunk_size(self):
        """Chunk size should never go below MIN_CHUNK_SIZE."""
        result = calculate_chunk_size(
            content="x" * 100,
            content_tokens=100,  # 1 char/token (very dense)
            system_prompt_tokens=64000,  # leaves very little room
            max_model_len=65536,
            min_generation_tokens=4096,
        )
        assert result == MIN_CHUNK_SIZE
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py::TestCalculateChunkSize -v`
Expected: FAIL — `ImportError: cannot import name 'calculate_chunk_size'`

**Step 3: Implement `calculate_chunk_size`**

In `stage2_map.py`, add:

```python
def calculate_chunk_size(
    content: str,
    content_tokens: int,
    system_prompt_tokens: int,
    max_model_len: int,
    min_generation_tokens: int,
) -> int | None:
    """Calculate max chars per chunk to fit within token budget.
    Returns None if content fits without chunking.
    """
    max_content_tokens = max_model_len - system_prompt_tokens - min_generation_tokens
    if content_tokens <= max_content_tokens:
        return None  # No chunking needed

    chars_per_token = len(content) / content_tokens if content_tokens > 0 else 1.0
    max_chunk_chars = int(max_content_tokens * chars_per_token)

    if max_chunk_chars < MIN_CHUNK_SIZE:
        return MIN_CHUNK_SIZE

    return max_chunk_chars
```

**Step 4: Run tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py::TestCalculateChunkSize -v`
Expected: all PASS

**Step 5: Write failing test for token-aware summarize_file**

In `tests/test_stage2_map.py`, add to `TestSummarizeFile`:

```python
    @pytest.mark.asyncio
    async def test_pre_chunks_by_token_budget(self, mock_llm, sample_entry):
        """When LLMClient has tokenizer, pre-chunk by token budget instead of waiting for overflow."""
        sample_entry.raw_content = "word " * 20000  # ~100K chars

        # Give LLMClient a count_tokens method and config
        # Return different values: full content = 30000 tokens, system-only = 200 tokens
        mock_llm.count_tokens = MagicMock(
            side_effect=lambda sys, usr: 30000 if usr else 200
        )
        mock_llm.max_model_len = 65536
        mock_llm.min_generation_tokens = 4096
        mock_llm._tokenizer = True  # Signal tokenizer is loaded

        # First call: InsufficientBudgetError (full file too large)
        # Chunk calls: succeed
        # Merge call: succeed
        from llm_client import InsufficientBudgetError

        call_count = 0
        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise InsufficientBudgetError(prompt_tokens=30000, max_tokens=2000, min_required=4096)
            if "JSON" in system_prompt or "Combine" in system_prompt:
                return LLMResponse(
                    text='{"has_educational_content": true, "summary": "merged"}',
                    prompt_tokens=500, completion_tokens=50,
                )
            return LLMResponse(text="chunk summary", prompt_tokens=500, completion_tokens=50)

        mock_llm.call.side_effect = mock_call
        result, responses, overflow_retries = await summarize_file(sample_entry, 5, mock_llm)
        assert result.summary == "merged"
        assert call_count > 2  # chunked path was used
```

**Step 6: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py::TestSummarizeFile::test_pre_chunks_by_token_budget -v`
Expected: FAIL — `summarize_file` doesn't handle `InsufficientBudgetError`

**Step 7: Update `_summarize_chunks` to handle `InsufficientBudgetError`**

In `stage2_map.py`, update `_summarize_chunks` to catch both error types (currently only catches `ContextOverflowError`):

```python
async def _summarize_chunks(
    chunks: list[str], llm: LLMClient,
) -> tuple[list[str], list[LLMResponse], int]:
    """Summarize each chunk individually. Halve on overflow or insufficient budget.
    Returns (plain text summaries, responses, overflow_retries)."""
    summaries = []
    responses = []
    overflow_retries = 0

    pending = deque(chunks)

    while pending:
        chunk = pending.popleft()
        try:
            resp = await llm.call(CHUNK_SYSTEM_PROMPT, chunk)
            summaries.append(resp.text)
            responses.append(resp)
        except (ContextOverflowError, InsufficientBudgetError):
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
            pending.extendleft(reversed(sub_chunks))

    return summaries, responses, overflow_retries
```

**Step 8: Update `summarize_file` to handle token-aware pre-chunking**

In `stage2_map.py`, update `summarize_file()`. Key changes:
- Catch `InsufficientBudgetError` and use token-aware chunk sizing
- Use `llm._tokenizer is not None` instead of fragile `hasattr` check
- Consolidate merge fallback into single `except (ContextOverflowError, InsufficientBudgetError):` — no duplication

```python
async def summarize_file(
    entry: OrderedFileEntry,
    total_files: int,
    llm: LLMClient,
) -> tuple[FileSummary, list[LLMResponse], int]:
    """Summarize a single file. Self-correcting: chunk on overflow or insufficient budget.
    Returns (summary, responses, overflow_retries)."""
    user_msg = _build_user_message(entry, total_files)
    all_responses = []
    overflow_retries = 0

    # Try sending entire file
    initial_chunk_size = None
    try:
        resp = await llm.call(PERFILE_SYSTEM_PROMPT, user_msg)
        all_responses.append(resp)
        result = parse_file_summary(resp.text)

        # Retry once if unparseable
        if result.summary == resp.text:  # fallback was used
            resp2 = await llm.call(PERFILE_SYSTEM_PROMPT, user_msg)
            all_responses.append(resp2)
            result2 = parse_file_summary(resp2.text)
            if result2.summary != resp2.text:
                result = result2

        result.filepath = entry.filepath
        result.position = entry.position
        return result, all_responses, 0

    except ContextOverflowError:
        overflow_retries += 1
        logger.info(f"File {entry.filepath} overflows context, chunking...")
        initial_chunk_size = len(entry.raw_content) // 2
        if initial_chunk_size < MIN_CHUNK_SIZE:
            initial_chunk_size = MIN_CHUNK_SIZE

    except InsufficientBudgetError:
        logger.info(f"File {entry.filepath} insufficient generation budget, chunking by tokens...")
        # Use token-aware chunk sizing if tokenizer is available
        if getattr(llm, '_tokenizer', None) is not None and llm.max_model_len:
            content_tokens = llm.count_tokens(CHUNK_SYSTEM_PROMPT, entry.raw_content)
            system_tokens = llm.count_tokens(CHUNK_SYSTEM_PROMPT, "")
            chunk_chars = calculate_chunk_size(
                content=entry.raw_content,
                content_tokens=content_tokens - system_tokens,
                system_prompt_tokens=system_tokens,
                max_model_len=llm.max_model_len,
                min_generation_tokens=llm.min_generation_tokens,
            )
            initial_chunk_size = chunk_chars if chunk_chars else len(entry.raw_content) // 2
        else:
            initial_chunk_size = len(entry.raw_content) // 2
        if initial_chunk_size < MIN_CHUNK_SIZE:
            initial_chunk_size = MIN_CHUNK_SIZE

    # Chunk and summarize
    chunks = split_into_chunks(entry.raw_content, initial_chunk_size)
    chunk_summaries, chunk_responses, chunk_overflows = await _summarize_chunks(
        chunks, llm
    )
    overflow_retries += chunk_overflows
    all_responses.extend(chunk_responses)

    # Merge chunk summaries — pairwise fallback if overflow or insufficient budget
    try:
        merged_text = "\n\n".join(f"Chunk {i+1}:\n{s}" for i, s in enumerate(chunk_summaries))
        merge_resp = await llm.call(CHUNK_MERGE_SYSTEM_PROMPT, merged_text)
        all_responses.append(merge_resp)
    except (ContextOverflowError, InsufficientBudgetError):
        logger.warning(
            f"Chunk merge overflow/budget ({len(chunk_summaries)} summaries), merging pairwise"
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
                except (ContextOverflowError, InsufficientBudgetError):
                    logger.warning("Pair merge overflow/budget, carrying summaries forward")
                    next_level.extend(group)
            # Safety: if no progress (all pairs failed), force-concatenate to guarantee convergence
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
        merge_resp = LLMResponse(text=current[0], prompt_tokens=0, completion_tokens=0)

    result = parse_file_summary(merge_resp.text)
    result.filepath = entry.filepath
    result.position = entry.position
    return result, all_responses, overflow_retries
```

Also add the import at the top of `stage2_map.py`:

```python
from llm_client import LLMClient, LLMResponse, ContextOverflowError, InsufficientBudgetError
```

**Step 9: Run all stage2 tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage2_map.py -v`
Expected: all PASS

**Step 10: Commit**

```bash
git add pipeline/pipeline_v2/stage2_map.py pipeline/pipeline_v2/tests/test_stage2_map.py
git commit -m "feat: token-aware chunking via calculate_chunk_size and InsufficientBudgetError handling"
```

---

### Task 7: Per-file status tracking in `main.py` and `stage4_output.py`

**Files:**
- Modify: `pipeline/pipeline_v2/main.py`
- Modify: `pipeline/pipeline_v2/stage4_output.py`
- Test: `pipeline/pipeline_v2/tests/test_main.py`
- Test: `pipeline/pipeline_v2/tests/test_stage4_output.py`

**Step 1: Write failing test for save_result with file_results**

In `tests/test_stage4_output.py`, add:

```python
class TestSaveResultWithFileResults:
    def test_includes_file_results_in_output(self, tmp_path):
        result = MergeResult(summary="요약", keywords=["k1"])
        file_results = [
            {"filepath": "data.js", "status": "success", "chunks": 4, "has_educational_content": True},
            {"filepath": "broken.js", "status": "failed", "error": "ReadTimeout: 300s", "chunks": 0, "has_educational_content": None},
        ]
        save_result(tmp_path, "qwen3.5-27b", "content_123", result, file_results=file_results)
        data = json.loads((tmp_path / "qwen3.5-27b" / "content_123.json").read_text())
        assert data["file_results"] == file_results
        assert data["files_succeeded"] == 1
        assert data["files_failed"] == 1

    def test_no_file_results_backward_compatible(self, tmp_path):
        result = MergeResult(summary="요약", keywords=["k1"])
        save_result(tmp_path, "qwen3.5-27b", "content_123", result)
        data = json.loads((tmp_path / "qwen3.5-27b" / "content_123.json").read_text())
        assert "file_results" not in data
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage4_output.py::TestSaveResultWithFileResults -v`
Expected: FAIL — `save_result()` doesn't accept `file_results` kwarg, or output doesn't contain it

**Step 3: Update `save_result` in `stage4_output.py`**

```python
def save_result(
    output_dir: Path, model_name: str, content_id: str, result: MergeResult,
    llm_calls: int = 0, metrics: dict | None = None,
    file_results: list[dict] | None = None,
) -> Path:
    """Save one JSON file per content at <output-dir>/<model>/<content_id>.json."""
    model_dir = Path(output_dir) / model_name
    model_dir.mkdir(parents=True, exist_ok=True)

    output = {
        "content_id": content_id,
        "model": model_name,
        "summary": result.summary,
        "keywords": result.keywords,
        "llm_calls": llm_calls,
    }
    if metrics:
        output["metrics"] = metrics
    if file_results is not None:
        output["file_results"] = file_results
        output["files_succeeded"] = sum(1 for f in file_results if f["status"] == "success")
        output["files_failed"] = sum(1 for f in file_results if f["status"] == "failed")

    output_path = model_dir / f"{content_id}.json"
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path
```

**Step 4: Run stage4 tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage4_output.py -v`
Expected: all PASS

**Step 5: Write failing test for file_results collection in process_content**

In `tests/test_main.py`, add:

```python
class TestFileResultsTracking:
    @pytest.mark.asyncio
    async def test_tracks_success_and_failure(self):
        """process_content should collect file_results for successes and failures."""
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
             patch("main.save_result") as mock_save:

            entries = [
                MagicMock(position=1, filepath="a.html", raw_content="content a"),
                MagicMock(position=2, filepath="b.html", raw_content="content b"),
                MagicMock(position=3, filepath="c.html", raw_content="content c"),
            ]
            mock_discover.return_value = entries
            mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.5)])
            mock_merge.return_value = (MagicMock(summary="final", keywords=["k"]), [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.3)])

            await process_content(
                Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm
            )

            # Verify save_result was called with file_results
            save_call = mock_save.call_args
            assert "file_results" in save_call.kwargs or any(
                isinstance(a, list) and len(a) > 0 and isinstance(a[0], dict) and "filepath" in a[0]
                for a in save_call.args
            )
            # Extract file_results from kwargs
            file_results = save_call.kwargs.get("file_results", None)
            assert file_results is not None
            assert len(file_results) == 3
            statuses = {fr["filepath"]: fr["status"] for fr in file_results}
            assert statuses["b.html"] == "failed"
            assert statuses["a.html"] == "success"
            assert statuses["c.html"] == "success"

    @pytest.mark.asyncio
    async def test_valueerror_is_expected_error(self):
        """ValueError (empty content) should be treated as expected, not unexpected."""
        async def raise_value_error(system_prompt, user_message):
            raise ValueError("LLM returned empty content")

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = raise_value_error

        with patch("main.discover_files") as mock_discover, \
             patch("main.order_files") as mock_order, \
             patch("main.save_result"):

            entries = [MagicMock(position=1, filepath="a.html", raw_content="content a")]
            mock_discover.return_value = entries
            mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.5)])

            # Should not crash, should return None (all files failed)
            result = await process_content(
                Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm
            )
            assert result is None
```

**Step 6: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_main.py::TestFileResultsTracking -v`
Expected: FAIL — `save_result` not called with `file_results`, `ValueError` not in expected errors

**Step 7: Update `process_content` in `main.py`**

Add `InsufficientBudgetError` to imports:

```python
from llm_client import LLMClient, ContextOverflowError, InsufficientBudgetError
```

Update the `asyncio.gather` result loop and `save_result` call:

```python
    file_results = []

    for i, result in enumerate(results):
        filepath = ordered_entries[i].filepath
        if isinstance(result, Exception):
            file_results.append({
                "filepath": filepath,
                "status": "failed",
                "error": f"{type(result).__name__}: {result}",
                "chunks": 0,
                "has_educational_content": None,
            })
            if isinstance(result, (httpx.HTTPError, ContextOverflowError, OSError, ValueError, InsufficientBudgetError)):
                logger.warning(f"File {filepath} failed ({type(result).__name__}), skipping")
            else:
                logger.error(
                    f"Unexpected error summarizing {filepath}, skipping",
                    exc_info=(type(result), result, result.__traceback__),
                )
            continue
        summary, responses, overflow_retries = result
        file_results.append({
            "filepath": filepath,
            "status": "success",
            "chunks": max(1, len(responses)),
            "has_educational_content": summary.has_educational_content,
        })
        file_summaries.append(summary)
        all_responses.extend(responses)
        llm_calls += len(responses)
        total_overflow_retries += overflow_retries
```

And update the `save_result` call (around line 133):

```python
    save_result(output_dir, model_name, content_id, merge_result, llm_calls, metrics,
                file_results=file_results)
```

Also update the return dict to include file_results:

```python
    return {
        "content_id": content_id,
        "summary": merge_result.summary,
        "keywords": merge_result.keywords,
        "llm_calls": llm_calls,
        "metrics": metrics,
        "file_results": file_results,
    }
```

**Step 8: Run all tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/ -v`
Expected: all PASS

**Step 9: Commit**

```bash
git add pipeline/pipeline_v2/main.py pipeline/pipeline_v2/stage4_output.py pipeline/pipeline_v2/tests/test_main.py pipeline/pipeline_v2/tests/test_stage4_output.py
git commit -m "feat: per-file status tracking in output JSON, ValueError as expected error"
```

---

### Task 8: Add `InsufficientBudgetError` handling to `stage3_reduce.py`

**Files:**
- Modify: `pipeline/pipeline_v2/stage3_reduce.py`
- Test: `pipeline/pipeline_v2/tests/test_stage3_reduce.py`

**Step 1: Write failing test**

In `tests/test_stage3_reduce.py`, add a test that verifies `InsufficientBudgetError` during pairwise merge is handled gracefully (carried forward, not crash):

```python
from llm_client import InsufficientBudgetError

class TestPairwiseMergeHandlesBudgetError:
    @pytest.mark.asyncio
    async def test_insufficient_budget_carries_forward(self):
        """InsufficientBudgetError during pairwise merge should carry summaries forward, not crash."""
        call_count = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise InsufficientBudgetError(prompt_tokens=60000, max_tokens=2000, min_required=4096)
            return LLMResponse(
                text='{"summary": "merged result", "keywords": ["k1"]}',
                prompt_tokens=500, completion_tokens=50,
            )

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        result, responses = await pairwise_tree_merge(["summary A", "summary B"], mock_llm)
        assert result.summary  # Should not crash, should produce a result
```

**Step 2: Run test to verify it fails**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage3_reduce.py::TestPairwiseMergeHandlesBudgetError -v`
Expected: FAIL — `InsufficientBudgetError` not caught

**Step 3: Update stage3_reduce.py**

Update import:

```python
from llm_client import LLMClient, LLMResponse, ContextOverflowError, InsufficientBudgetError
```

In `pairwise_tree_merge`, update the except clause (line 87):

```python
                except (ContextOverflowError, InsufficientBudgetError, httpx.HTTPError, OSError):
```

In `merge_summaries`, update the except clause (line 145):

```python
    except (ContextOverflowError, InsufficientBudgetError):
```

**Step 4: Run tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/test_stage3_reduce.py -v`
Expected: all PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/stage3_reduce.py pipeline/pipeline_v2/tests/test_stage3_reduce.py
git commit -m "feat: handle InsufficientBudgetError in reduce stage pairwise merge"
```

---

### Task 9: Run full test suite, update worklog, and push

**Step 1: Run all tests**

Run: `cd pipeline/pipeline_v2 && python -m pytest tests/ -v --tb=short`
Expected: all PASS (or document pre-existing failures)

**Step 2: Verify no import errors**

Run: `cd pipeline/pipeline_v2 && python -c "from llm_client import LLMClient, InsufficientBudgetError; from stage2_map import calculate_chunk_size; print('OK')"`
Expected: `OK`

**Step 3: Update worklog**

Append P0 implementation summary to `docs/worklogs/worklog_260313.md`.

**Step 4: Final commit if any fixups needed, then push**

```bash
git push origin main && git push github main
```
