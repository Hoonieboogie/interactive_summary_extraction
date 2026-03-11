import pytest
from unittest.mock import AsyncMock, MagicMock
from stage2_map import (
    summarize_file,
    split_into_chunks,
    parse_file_summary,
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
        result, responses = await summarize_file(sample_entry, 5, mock_llm)
        assert result.summary == "교육 요약"
        assert result.has_educational_content is True

    @pytest.mark.asyncio
    async def test_context_overflow_triggers_chunking(self, mock_llm, sample_entry):
        # Use content with newlines so split_into_chunks can split at boundaries
        sample_entry.raw_content = "\n".join(f"line{i}" for i in range(100))

        # First call: overflow. Then chunk calls succeed. Then merge succeeds.
        mock_llm.call.side_effect = [
            ContextOverflowError("too long"),
            LLMResponse(text="chunk1 summary", prompt_tokens=50, completion_tokens=10),
            LLMResponse(text="chunk2 summary", prompt_tokens=50, completion_tokens=10),
            LLMResponse(
                text='{"has_educational_content": true, "summary": "merged"}',
                prompt_tokens=30,
                completion_tokens=10,
            ),
        ]
        result, responses = await summarize_file(sample_entry, 5, mock_llm, initial_chunk_size=500)
        assert result.summary == "merged"
