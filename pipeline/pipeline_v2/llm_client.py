"""HTTP client for vLLM OpenAI-compatible API."""
import asyncio
import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds


class ContextOverflowError(Exception):
    """Raised when the prompt exceeds the model's context window."""
    pass


@dataclass
class LLMResponse:
    text: str
    prompt_tokens: int
    completion_tokens: int


def _extract_error_message(response: httpx.Response) -> str:
    """Extract error message from vLLM/OpenAI error response."""
    try:
        body = response.json()
    except Exception:
        return response.text
    # vLLM uses flat format: {"message": "..."}, OpenAI uses nested: {"error": {"message": "..."}}
    return body.get("message", "") or body.get("error", {}).get("message", "") or str(body)


def _is_context_overflow(msg: str) -> bool:
    """Check if an error message indicates context length overflow."""
    lower = msg.lower()
    return any(kw in lower for kw in ("context length", "maximum", "input tokens", "prompt is too long"))


class LLMClient:
    def __init__(self, base_url: str, model: str):
        self.model = model
        self._http = httpx.AsyncClient(base_url=base_url, timeout=300.0)

    async def call(self, system_prompt: str, user_message: str) -> LLMResponse:
        last_exc = None

        for attempt in range(1, MAX_RETRIES + 1):
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

            # Handle context overflow (400 or 500)
            if response.status_code in (400, 500):
                msg = _extract_error_message(response)
                if _is_context_overflow(msg):
                    raise ContextOverflowError(msg)

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
            data = response.json()
            return LLMResponse(
                text=data["choices"][0]["message"]["content"],
                prompt_tokens=data["usage"]["prompt_tokens"],
                completion_tokens=data["usage"]["completion_tokens"],
            )

        raise last_exc  # Should not reach here, but safety net

    async def close(self):
        await self._http.aclose()
