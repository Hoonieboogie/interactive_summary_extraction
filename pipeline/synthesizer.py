"""LLM synthesis via vLLM HTTP API.

Manages vLLM server lifecycle and sends pre-filtered content
to the model for summary extraction.
"""

import asyncio
import json
import os
import re
import signal
import subprocess
import sys
import time
from dataclasses import dataclass

import httpx

from config import (
    MAX_CONTENT_CHARS,
    MAX_TOKENS,
    SYSTEM_PROMPT,
    TEMPERATURE,
    VLLM_BASE_URL,
    VLLM_PORT,
    ModelConfig,
)


def build_messages(content: str) -> list[dict]:
    """Build chat messages for the LLM."""
    if len(content) > MAX_CONTENT_CHARS:
        content = content[:MAX_CONTENT_CHARS] + "\n\n[...truncated...]"

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]


def parse_llm_response(text: str) -> str:
    """Extract summary from LLM response."""
    text = re.sub(r'<think>[\s\S]*?</think>', '', text).strip()

    md_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if md_match:
        text = md_match.group(1)

    try:
        json_match = re.search(r'\{[^{}]*"summary"[^{}]*\}', text)
        if json_match:
            data = json.loads(json_match.group())
            return data.get("summary", text)
        data = json.loads(text)
        return data.get("summary", text)
    except (json.JSONDecodeError, AttributeError):
        return text


async def call_llm(
    client: httpx.AsyncClient,
    model_id: str,
    content: str,
) -> dict:
    """Send content to vLLM and return parsed result."""
    messages = build_messages(content)
    payload = {
        "model": model_id,
        "messages": messages,
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
    }

    start = time.monotonic()
    try:
        resp = await client.post(
            f"{VLLM_BASE_URL}/v1/chat/completions",
            json=payload,
            timeout=300.0,
        )
        latency_ms = int((time.monotonic() - start) * 1000)

        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}: {resp.text}", "latency_ms": latency_ms}

        data = resp.json()
        raw_text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return {
            "summary": parse_llm_response(raw_text),
            "raw_response": raw_text,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "latency_ms": latency_ms,
        }
    except httpx.TimeoutException:
        return {"error": "Request timed out (300s)", "latency_ms": 300_000}
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"error": str(e), "latency_ms": latency_ms}


class VLLMServer:
    """Manages a vLLM server subprocess."""

    def __init__(self, model: ModelConfig, port: int = VLLM_PORT):
        self.model = model
        self.port = port
        self.process: subprocess.Popen | None = None

    def start(self) -> None:
        """Start the vLLM server and wait until it's healthy."""
        cmd = [
            sys.executable, "-m", "vllm.entrypoints.openai.api_server",
            "--model", self.model.model_id,
            "--port", str(self.port),
            *self.model.vllm_args,
        ]
        print(f"  Starting vLLM: {self.model.model_id}")
        print(f"  Command: {' '.join(cmd)}")

        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        if not self._wait_for_health(timeout=600):
            self.stop()
            raise RuntimeError(f"vLLM server failed to start for {self.model.model_id}")

        print(f"  vLLM server ready: {self.model.model_id}")

    def _wait_for_health(self, timeout: int = 600) -> bool:
        """Poll /v1/models until the server responds or timeout."""
        url = f"http://localhost:{self.port}/v1/models"
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                resp = httpx.get(url, timeout=5.0)
                if resp.status_code == 200:
                    return True
            except httpx.ConnectError:
                pass
            if self.process and self.process.poll() is not None:
                stdout = self.process.stdout.read() if self.process.stdout else ""
                print(f"  vLLM process exited with code {self.process.returncode}")
                print(f"  Output: {stdout[-2000:]}")
                return False
            time.sleep(5)
        return False

    def stop(self) -> None:
        """Stop the vLLM server."""
        if self.process and self.process.poll() is None:
            print(f"  Stopping vLLM: {self.model.model_id}")
            self.process.terminate()
            try:
                self.process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
            print(f"  vLLM stopped.")
        self.process = None
