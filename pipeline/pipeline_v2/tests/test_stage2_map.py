import pytest
from unittest.mock import AsyncMock, MagicMock
from stage2_map import (
    summarize_file,
    split_into_chunks,
    parse_file_summary,
    _summarize_chunks,
    MIN_CHUNK_SIZE,
    FileSummary,
)
from stage1_ordering import OrderedFileEntry
from llm_client import LLMResponse, ContextOverflowError


class TestSplitIntoChunks:
    def test_short_content_single_chunk(self):
        chunks = split_into_chunks("line1\nline2\nline3", chunk_size=1000)
        assert len(chunks) == 1
        assert chunks[0] == "line1\nline2\nline3"

    def test_splits_at_newline_boundaries(self):
        content = "\n".join(f"line{i}" for i in range(100))
        chunks = split_into_chunks(content, chunk_size=50)
        assert len(chunks) > 1
        # All content preserved
        assert "\n".join(chunks) == content

    def test_empty_content(self):
        chunks = split_into_chunks("", chunk_size=100)
        assert chunks == [""]


class TestParseFileSummary:
    def test_valid_educational(self):
        raw = '{"has_educational_content": true, "summary": "수학 학습"}'
        result = parse_file_summary(raw)
        assert result.has_educational_content is True
        assert result.summary == "수학 학습"

    def test_valid_non_educational(self):
        raw = '{"has_educational_content": false, "summary": "CSS 코드"}'
        result = parse_file_summary(raw)
        assert result.has_educational_content is False

    def test_unparseable_fallback(self):
        """Unparseable response -> safe default: educational=True, summary=entire response."""
        raw = "This file contains math lessons about fractions."
        result = parse_file_summary(raw)
        assert result.has_educational_content is True
        assert result.summary == raw


class TestSummarizeFile:
    @pytest.fixture
    def mock_llm(self):
        return AsyncMock()

    @pytest.fixture
    def sample_entry(self):
        return OrderedFileEntry(position=2, filepath="lesson/page.html", raw_content="<p>교육 내용</p>")

    @pytest.mark.asyncio
    async def test_normal_file(self, mock_llm, sample_entry):
        mock_llm.call.return_value = LLMResponse(
            text='{"has_educational_content": true, "summary": "교육 요약"}',
            prompt_tokens=100,
            completion_tokens=20,
        )
        result, responses, overflow_retries = await summarize_file(sample_entry, 5, mock_llm)
        assert result.summary == "교육 요약"
        assert result.has_educational_content is True
        assert overflow_retries == 0

    @pytest.mark.asyncio
    async def test_context_overflow_triggers_chunking(self, mock_llm, sample_entry):
        # Use content large enough to produce multiple chunks after dynamic sizing
        sample_entry.raw_content = "\n".join(f"line{i:03d}" for i in range(1000))

        # First call: overflow. Subsequent chunk calls succeed. Final merge succeeds.
        chunk_resp = LLMResponse(text="chunk summary", prompt_tokens=50, completion_tokens=10)
        merge_resp = LLMResponse(
            text='{"has_educational_content": true, "summary": "merged"}',
            prompt_tokens=30,
            completion_tokens=10,
        )

        call_count = 0
        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ContextOverflowError("resulted in 200 tokens", actual_tokens=200)
            # Last call is the merge (uses CHUNK_MERGE_SYSTEM_PROMPT which contains JSON format)
            if "JSON" in system_prompt:
                return merge_resp
            return chunk_resp

        mock_llm.call.side_effect = mock_call
        result, responses, overflow_retries = await summarize_file(sample_entry, 5, mock_llm, max_model_len=100)
        assert result.summary == "merged"
        assert call_count > 2  # At least: 1 overflow + 1 chunk + 1 merge
        assert overflow_retries >= 1


class TestSummarizeChunks:
    """Tests for _summarize_chunks iterative halving."""

    @pytest.mark.asyncio
    async def test_halves_on_overflow_until_fits(self):
        """Chunk that overflows should be halved repeatedly until it fits."""
        # Threshold must be above MIN_CHUNK_SIZE so halving actually produces sub-chunks
        threshold = MIN_CHUNK_SIZE + 1000

        async def mock_call(system_prompt, user_message):
            if len(user_message) > threshold:
                raise ContextOverflowError("overflow", actual_tokens=65537)
            return LLMResponse(text="summary", prompt_tokens=100, completion_tokens=10)

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        # Build a chunk ~4x threshold so it needs multiple halvings
        line_len = 200
        num_lines = (threshold * 4) // line_len
        big_chunk = "\n".join("a" * (line_len - 1) for _ in range(num_lines))
        summaries, responses, retries = await _summarize_chunks([big_chunk], mock_llm)

        assert len(summaries) > 0
        assert all(s == "summary" for s in summaries)
        assert retries >= 2

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
