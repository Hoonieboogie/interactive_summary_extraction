import pytest
import httpx
from unittest.mock import AsyncMock, patch
from llm_client import LLMClient, ContextOverflowError, LLMResponse, _parse_token_count


class TestLLMClient:
    @pytest.fixture
    def client(self):
        return LLMClient(base_url="http://localhost:8000", model="qwen3.5-27b")

    @pytest.mark.asyncio
    async def test_successful_call(self, client):
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": '{"key": "value"}'}}],
                "usage": {"prompt_tokens": 100, "completion_tokens": 20},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response):
            result = await client.call("system prompt", "user message")
        assert result.text == '{"key": "value"}'
        assert result.prompt_tokens == 100
        assert result.completion_tokens == 20

    @pytest.mark.asyncio
    async def test_context_overflow_raises_openai_format(self, client):
        """OpenAI nested error format: {"error": {"message": "..."}}"""
        mock_response = httpx.Response(
            400,
            json={"error": {"message": "This model's maximum context length is 262144"}},
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response):
            with pytest.raises(ContextOverflowError):
                await client.call("system prompt", "user message")

    @pytest.mark.asyncio
    async def test_context_overflow_raises_vllm_format(self, client):
        """vLLM flat error format: {"message": "...", "object": "error"}"""
        mock_response = httpx.Response(
            400,
            json={
                "object": "error",
                "message": "You passed 65537 input tokens and requested 0 output tokens. However, the model's context length is only 65536 tokens",
                "type": "BadRequestError",
                "code": 400,
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response):
            with pytest.raises(ContextOverflowError) as exc_info:
                await client.call("system prompt", "user message")
            assert exc_info.value.actual_tokens == 65537

    @pytest.mark.asyncio
    async def test_context_overflow_parses_openai_token_count(self, client):
        """OpenAI format: 'resulted in 89234 tokens'"""
        mock_response = httpx.Response(
            400,
            json={"error": {"message": "This model's maximum context length is 65536 tokens. However, your messages resulted in 89234 tokens."}},
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response):
            with pytest.raises(ContextOverflowError) as exc_info:
                await client.call("system prompt", "user message")
            assert exc_info.value.actual_tokens == 89234


class TestParseTokenCount:
    def test_openai_format(self):
        assert _parse_token_count("your messages resulted in 89234 tokens") == 89234

    def test_vllm_format(self):
        assert _parse_token_count("You passed 65537 input tokens") == 65537

    def test_no_match(self):
        assert _parse_token_count("some random error") is None


class TestLLMResponse:
    def test_fields(self):
        r = LLMResponse(text="hello", prompt_tokens=10, completion_tokens=5)
        assert r.text == "hello"
        assert r.prompt_tokens == 10
        assert r.completion_tokens == 5


class TestReasoningContentSeparation:
    """With --reasoning-parser qwen3, vLLM puts thinking in reasoning_content
    and the answer in content. The client must return only content."""

    @pytest.fixture
    def client(self):
        return LLMClient(base_url="http://localhost:8000", model="qwen3.5-27b")

    @pytest.mark.asyncio
    async def test_returns_content_not_reasoning(self, client):
        """When response has reasoning_content, only content is returned."""
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{
                    "message": {
                        "content": '{"summary": "줄1. 줄2. 줄3", "keywords": ["수학"]}',
                        "reasoning_content": "Let me think step by step...",
                    }
                }],
                "usage": {"prompt_tokens": 100, "completion_tokens": 50},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response):
            result = await client.call("system prompt", "user message")
        assert result.text == '{"summary": "줄1. 줄2. 줄3", "keywords": ["수학"]}'
        assert "think" not in result.text.lower()

    @pytest.mark.asyncio
    async def test_content_null_raises(self, client):
        """If model produces only thinking with no content, raise a clear error."""
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{
                    "message": {
                        "content": None,
                        "reasoning_content": "I'm thinking but produced no answer...",
                    }
                }],
                "usage": {"prompt_tokens": 100, "completion_tokens": 50},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_response):
            with pytest.raises(ValueError, match="empty content"):
                await client.call("system prompt", "user message")
