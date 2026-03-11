"""HTTP client for vLLM OpenAI-compatible API."""
from dataclasses import dataclass

import httpx


class ContextOverflowError(Exception):
    """Raised when the prompt exceeds the model's context window."""
    pass


@dataclass
class LLMResponse:
    text: str
    prompt_tokens: int
    completion_tokens: int


class LLMClient:
    def __init__(self, base_url: str, model: str):
        self.model = model
        self._http = httpx.AsyncClient(base_url=base_url, timeout=300.0)

    async def call(self, system_prompt: str, user_message: str) -> LLMResponse:
        response = await self._http.post(
            "/v1/chat/completions",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.0,
            },
        )

        if response.status_code == 400:
            body = response.json()
            msg = body.get("error", {}).get("message", "")
            if "context length" in msg.lower() or "maximum" in msg.lower():
                raise ContextOverflowError(msg)
            response.raise_for_status()

        response.raise_for_status()

        data = response.json()
        return LLMResponse(
            text=data["choices"][0]["message"]["content"],
            prompt_tokens=data["usage"]["prompt_tokens"],
            completion_tokens=data["usage"]["completion_tokens"],
        )

    async def close(self):
        await self._http.aclose()
