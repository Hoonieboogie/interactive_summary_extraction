# pipeline/tests/test_synthesizer.py
import pytest
import json
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from synthesizer import build_messages, parse_llm_response, call_llm, VLLMServer


class TestBuildMessages:
    def test_creates_chat_messages(self):
        messages = build_messages("교육 콘텐츠 텍스트")
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert "교육 콘텐츠 텍스트" in messages[1]["content"]

    def test_truncates_long_content(self):
        long_content = "x" * 300_000
        messages = build_messages(long_content)
        assert len(messages[1]["content"]) < 300_000


class TestParseLlmResponse:
    def test_parses_valid_json(self):
        response_text = '{ "summary": "주제. 활동. 목표" }'
        result = parse_llm_response(response_text)
        assert result == "주제. 활동. 목표"

    def test_extracts_json_from_markdown(self):
        response_text = 'Here is the result:\n```json\n{ "summary": "주제. 활동. 목표" }\n```'
        result = parse_llm_response(response_text)
        assert result == "주제. 활동. 목표"

    def test_returns_raw_on_invalid_json(self):
        response_text = "그냥 텍스트 응답입니다"
        result = parse_llm_response(response_text)
        assert result == response_text

    def test_handles_thinking_tags(self):
        response_text = '<think>reasoning here</think>\n{ "summary": "주제. 활동. 목표" }'
        result = parse_llm_response(response_text)
        assert result == "주제. 활동. 목표"


class TestCallLlm:
    @pytest.mark.asyncio
    async def test_calls_vllm_endpoint(self):
        mock_response = httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": '{ "summary": "테스트 요약" }'}}
                ],
                "usage": {"prompt_tokens": 100, "completion_tokens": 20},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        result = await call_llm(mock_client, "모델명", "콘텐츠 텍스트")
        assert result["summary"] == "테스트 요약"
        assert result["prompt_tokens"] == 100
        assert result["completion_tokens"] == 20

    @pytest.mark.asyncio
    async def test_handles_api_error(self):
        mock_response = httpx.Response(
            500,
            text="Internal Server Error",
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        result = await call_llm(mock_client, "모델명", "콘텐츠")
        assert "error" in result
