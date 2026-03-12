import pytest
import httpx
from unittest.mock import AsyncMock
from stage3_reduce import (
    merge_summaries,
    pairwise_tree_merge,
    parse_merge_result,
    MergeResult,
)
from stage2_map import FileSummary
from llm_client import LLMResponse, ContextOverflowError


class TestParseMergeResult:
    def test_valid_result(self):
        raw = '{"summary": "줄1. 줄2. 줄3", "keywords": ["수학", "분수"]}'
        result = parse_merge_result(raw)
        assert result.summary == "줄1. 줄2. 줄3"
        assert result.keywords == ["수학", "분수"]

    def test_unparseable_fallback(self):
        raw = "Some unstructured text about math"
        result = parse_merge_result(raw)
        assert result.summary == raw
        assert result.keywords == []


class TestPairwiseTreeMerge:
    @pytest.mark.asyncio
    async def test_two_summaries(self):
        llm = AsyncMock()
        llm.call.side_effect = [
            # Intermediate merge of pair
            LLMResponse(
                text='{"summary": "merged_pair", "keywords": ["k1"]}',
                prompt_tokens=50, completion_tokens=20,
            ),
            # Final merge
            LLMResponse(
                text='{"summary": "merged", "keywords": ["k1"]}',
                prompt_tokens=50, completion_tokens=20,
            ),
        ]
        summaries = ["summary A", "summary B"]
        result, responses = await pairwise_tree_merge(summaries, llm)
        assert result.summary == "merged"

    @pytest.mark.asyncio
    async def test_odd_number_carries_forward(self):
        llm = AsyncMock()
        # 3 summaries: pair (1,2) -> merge, then (merged, 3) -> merge, then final
        llm.call.side_effect = [
            # Intermediate merge of pair (1,2)
            LLMResponse(
                text='{"summary": "merged_12", "keywords": ["k1"]}',
                prompt_tokens=50, completion_tokens=20,
            ),
            # Intermediate merge of (merged_12, 3)
            LLMResponse(
                text='{"summary": "merged_123", "keywords": ["k1", "k2"]}',
                prompt_tokens=50, completion_tokens=20,
            ),
            # Final merge
            LLMResponse(
                text='{"summary": "final", "keywords": ["k1", "k2"]}',
                prompt_tokens=50, completion_tokens=20,
            ),
        ]
        summaries = ["s1", "s2", "s3"]
        result, responses = await pairwise_tree_merge(summaries, llm)
        assert "final" in result.summary


class TestPairwiseTreeMergeResilience:

    @pytest.mark.asyncio
    async def test_pair_overflow_carries_forward(self):
        """If one pair overflows, carry both forward for finer-grained merging."""
        call_count = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
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


class TestMergeSummaries:
    @pytest.mark.asyncio
    async def test_all_non_educational(self):
        summaries = [
            FileSummary(filepath="a.css", position=1, has_educational_content=False, summary="CSS"),
            FileSummary(filepath="b.js", position=2, has_educational_content=False, summary="JS"),
        ]
        llm = AsyncMock()
        result, responses = await merge_summaries(summaries, llm)
        assert result.summary == "교육 및 학습과 관련된 내용이 없는 콘텐츠입니다."
        assert result.keywords == []
        llm.call.assert_not_called()

    @pytest.mark.asyncio
    async def test_standard_merge(self):
        summaries = [
            FileSummary(filepath="a.html", position=1, has_educational_content=True, summary="수학"),
        ]
        llm = AsyncMock()
        llm.call.return_value = LLMResponse(
            text='{"summary": "수학 요약", "keywords": ["수학"]}',
            prompt_tokens=50, completion_tokens=20,
        )
        result, responses = await merge_summaries(summaries, llm)
        assert result.summary == "수학 요약"

    @pytest.mark.asyncio
    async def test_overflow_triggers_pairwise(self):
        summaries = [
            FileSummary(filepath="a.html", position=1, has_educational_content=True, summary="s1"),
            FileSummary(filepath="b.html", position=2, has_educational_content=True, summary="s2"),
        ]
        llm = AsyncMock()
        llm.call.side_effect = [
            ContextOverflowError("too long"),
            # pairwise: intermediate merge
            LLMResponse(
                text='{"summary": "pairwise result", "keywords": ["k1"]}',
                prompt_tokens=50, completion_tokens=20,
            ),
            # pairwise: final merge
            LLMResponse(
                text='{"summary": "final", "keywords": ["k1"]}',
                prompt_tokens=30, completion_tokens=10,
            ),
        ]
        result, responses = await merge_summaries(summaries, llm)
        assert result.summary is not None
