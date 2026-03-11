import pytest
import httpx
from unittest.mock import AsyncMock, patch
from llm_client import LLMClient, ContextOverflowError, LLMResponse


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
            with pytest.raises(ContextOverflowError):
                await client.call("system prompt", "user message")


class TestLLMResponse:
    def test_fields(self):
        r = LLMResponse(text="hello", prompt_tokens=10, completion_tokens=5)
        assert r.text == "hello"
        assert r.prompt_tokens == 10
        assert r.completion_tokens == 5
