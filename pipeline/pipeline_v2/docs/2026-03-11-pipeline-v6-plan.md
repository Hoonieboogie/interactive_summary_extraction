# Pipeline v6.0 — Map-Reduce Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `pipeline/pipeline_v2/` — a map-reduce summarization pipeline where every file is individually summarized by the LLM, then merged into a final 3-line summary. No content is ever lost.

**Architecture:** Stage 1 discovers and orders files. Stage 2 sends each file to the LLM (chunking oversized files). Stage 3 merges all per-file summaries into one 3-line educational summary. Stage 4 compares across models.

**Tech Stack:** Python 3.10+, httpx, rich, jinja2, vLLM (OpenAI-compatible API), uv, pytest

**Project Structure:**
```
pipeline/
  pipeline_v1/   # Current v5 pipeline (preserved for worklog)
  pipeline_v2/   # New map-reduce pipeline (this plan)
  setup_runpod.sh  # Shared RunPod setup
```

Each pipeline is independently runnable with its own `pyproject.toml` and `uv` environment.

---

## Task 0: Scaffold `pipeline_v2/`

Create the directory structure and `pyproject.toml`.

**Files:**
- Create: `pipeline/pipeline_v2/pyproject.toml`
- Create: `pipeline/pipeline_v2/tests/__init__.py`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "summary-extraction-pipeline-v2"
version = "0.1.0"
description = "Map-reduce summary extractor for educational content (v6.0)"
requires-python = ">=3.10"
dependencies = [
    "httpx>=0.28",
    "rich>=13.0",
    "jinja2>=3.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.25",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Step 2: Create empty tests/__init__.py**

```python
```

**Step 3: Initialize uv environment**

Run: `cd pipeline/pipeline_v2 && uv sync --all-extras`
Expected: Dependencies installed, `.venv` created

**Step 4: Commit**

```bash
git add pipeline/pipeline_v2/pyproject.toml pipeline/pipeline_v2/tests/__init__.py
git commit -m "feat(v6): scaffold pipeline_v2 with pyproject.toml"
```

---

## Task 1: Create `file_discovery.py` — File Discovery & Reading

Reads all text-based files raw (no filtering), returns structured list with path info.

**Files:**
- Create: `pipeline/pipeline_v2/file_discovery.py`
- Create: `pipeline/pipeline_v2/tests/test_file_discovery.py`

**Step 1: Write the failing tests**

```python
# pipeline/pipeline_v2/tests/test_file_discovery.py
import os
import tempfile
import pytest
from file_discovery import discover_files, FileEntry

class TestDiscoverFiles:
    def test_reads_text_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "index.html"), "w") as f:
                f.write("<div>Hello World</div>")
            with open(os.path.join(tmpdir, "data.js"), "w") as f:
                f.write('var x = "test";')
            # Binary file should be skipped
            with open(os.path.join(tmpdir, "image.png"), "wb") as f:
                f.write(b"\x89PNG")

            entries = discover_files(tmpdir)
            paths = [e.relative_path for e in entries]
            assert "index.html" in paths
            assert "data.js" in paths
            assert "image.png" not in paths

    def test_returns_file_entry_with_position(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "a.html"), "w") as f:
                f.write("<p>First</p>")
            with open(os.path.join(tmpdir, "b.html"), "w") as f:
                f.write("<p>Second</p>")

            entries = discover_files(tmpdir)
            assert len(entries) == 2
            assert entries[0].position == 1
            assert entries[0].total_files == 2
            assert entries[1].position == 2
            assert isinstance(entries[0].content, str)

    def test_skips_minified_and_node_modules(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, "node_modules"))
            with open(os.path.join(tmpdir, "node_modules", "lib.js"), "w") as f:
                f.write("module.exports = {};")
            with open(os.path.join(tmpdir, "app.min.js"), "w") as f:
                f.write("minified code")
            with open(os.path.join(tmpdir, "index.html"), "w") as f:
                f.write("<p>Keep</p>")

            entries = discover_files(tmpdir)
            paths = [e.relative_path for e in entries]
            assert "index.html" in paths
            assert len(entries) == 1

    def test_skips_empty_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "empty.html"), "w") as f:
                f.write("")
            with open(os.path.join(tmpdir, "real.html"), "w") as f:
                f.write("<p>Content</p>")

            entries = discover_files(tmpdir)
            assert len(entries) == 1
            assert entries[0].relative_path == "real.html"

    def test_walks_subdirectories(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            subdir = os.path.join(tmpdir, "pages")
            os.makedirs(subdir)
            with open(os.path.join(subdir, "page1.html"), "w") as f:
                f.write("<p>Page 1</p>")
            with open(os.path.join(tmpdir, "index.html"), "w") as f:
                f.write("<p>Index</p>")

            entries = discover_files(tmpdir)
            paths = [e.relative_path for e in entries]
            assert "index.html" in paths
            assert os.path.join("pages", "page1.html") in paths
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_file_discovery.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'file_discovery'`

**Step 3: Write the implementation**

```python
# pipeline/pipeline_v2/file_discovery.py
"""File discovery for content directories.

Reads all text-based files from a content folder, returning
structured entries with positional info. No filtering — raw content
is passed to the LLM for analysis.
"""

import os
from dataclasses import dataclass

TARGET_EXTENSIONS = {
    ".html", ".htm", ".js", ".json", ".asp", ".xml",
    ".txt", ".csv", ".xhtml", ".svg", ".php", ".jsp",
}

_SKIP_FILE_SUFFIXES = {".min.js", ".min.css"}


@dataclass
class FileEntry:
    relative_path: str
    content: str
    position: int
    total_files: int


def discover_files(folder_path: str) -> list[FileEntry]:
    """Read all text-based files from a content folder.

    Returns list of FileEntry with raw content and positional info.
    Files are sorted alphabetically by relative path.
    Skips: binary files, .min.js, .min.css, node_modules.
    """
    raw_entries: list[tuple[str, str]] = []

    for root, dirs, files in os.walk(folder_path):
        dirs[:] = [d for d in dirs if d != "node_modules"]

        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in TARGET_EXTENSIONS:
                continue
            if any(fname.lower().endswith(s) for s in _SKIP_FILE_SUFFIXES):
                continue

            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                if not content.strip():
                    continue
                rel = os.path.relpath(fpath, folder_path)
                raw_entries.append((rel, content))
            except OSError:
                continue

    total = len(raw_entries)
    return [
        FileEntry(
            relative_path=rel,
            content=content,
            position=i + 1,
            total_files=total,
        )
        for i, (rel, content) in enumerate(raw_entries)
    ]
```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_file_discovery.py -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/file_discovery.py pipeline/pipeline_v2/tests/test_file_discovery.py
git commit -m "feat(v6): add file_discovery module — raw file reading with position info"
```

---

## Task 2: Create `config.py` — Prompts, Models & Safe Input Limit

New config for v2. Contains model definitions, per-file/merge/chunk prompts, and safe input calculation.

**Files:**
- Create: `pipeline/pipeline_v2/config.py`

**Step 1: Write the config**

```python
# pipeline/pipeline_v2/config.py
"""Configuration for the map-reduce summarization pipeline."""

from dataclasses import dataclass


@dataclass
class ModelConfig:
    name: str
    model_id: str
    vllm_args: list[str]
    description: str
    max_model_len: int = 32768


MODELS = [
    ModelConfig(
        name="exaone4-32b",
        model_id="LGAI-EXAONE/EXAONE-4.0-32B",
        vllm_args=[
            "--dtype", "auto",
            "--max-model-len", "32768",
            "--gpu-memory-utilization", "0.95",
        ],
        description="EXAONE 4.0 32B (LG AI Research, Korean-optimized)",
    ),
    ModelConfig(
        name="qwen3-32b",
        model_id="Qwen/Qwen3-32B",
        vllm_args=[
            "--dtype", "auto",
            "--max-model-len", "32768",
            "--gpu-memory-utilization", "0.90",
            "--quantization", "fp8",
        ],
        description="Qwen3-32B (Alibaba, 119 languages)",
    ),
    ModelConfig(
        name="qwen3.5-35b-a3b",
        model_id="Qwen/Qwen3.5-35B-A3B",
        vllm_args=[
            "--dtype", "auto",
            "--max-model-len", "32768",
            "--gpu-memory-utilization", "0.90",
            "--quantization", "fp8",
        ],
        description="Qwen3.5-35B-A3B (Alibaba, MoE 3B active)",
    ),
]

# --- Prompts ---

PER_FILE_SYSTEM_PROMPT = """너는 교육 콘텐츠 분석 전문가야.

아래는 교육용 인터랙티브 콘텐츠의 한 파일에서 추출한 원본 텍스트야.
파일 경로와 위치 정보가 함께 제공돼.

[지시사항]
1. 이 파일에 교육적으로 의미 있는 내용이 있는지 판단해.
2. 교육 내용이 있으면 핵심을 요약해.
3. 교육 내용이 없으면 (CSS, JavaScript 코드, 설정 파일 등) 그렇다고 명시해.
4. 원본 텍스트에 없는 내용을 절대 추가하지 마.

[출력형식]
JSON 형식으로 응답할 것:
{ "has_educational_content": true/false, "summary": "파일의 교육 내용 요약 또는 '이 파일은 CSS/JS/설정 코드만 포함'" }"""

MERGE_SYSTEM_PROMPT = """너는 교육 콘텐츠 분석 전문가야.

아래는 교육용 인터랙티브 콘텐츠의 각 파일별 요약이야.
파일 순서대로 정렬되어 있어.

[지시사항]
1. 교육적 내용이 있는 파일들의 요약만 참고해.
2. 전체 콘텐츠의 핵심 교육 내용을 한국어 3줄로 요약해.
3. 원본 요약에 없는 내용을 절대 추가하지 마.

규칙:
- 첫째 줄: 학습 주제 (무엇을 배우는가)
- 둘째 줄: 주요 학습 활동 (어떤 활동을 하는가)
- 셋째 줄: 학습 목표 및 기대 효과 (무엇을 할 수 있게 되는가)

[출력형식]
JSON 형식으로 응답할 것:
{ "summary": "첫째 줄. 둘째 줄. 셋째 줄" }"""

CHUNK_MERGE_PROMPT = """너는 교육 콘텐츠 분석 전문가야.

아래는 하나의 파일을 여러 청크로 나눈 후 각 청크의 요약이야.

[지시사항]
1. 모든 청크 요약을 종합하여 이 파일의 전체 내용을 하나로 요약해.
2. 원본 요약에 없는 내용을 절대 추가하지 마.

[출력형식]
JSON 형식으로 응답할 것:
{ "has_educational_content": true/false, "summary": "파일 전체 요약" }"""

# --- Constants ---

VLLM_PORT = 8000
VLLM_BASE_URL = f"http://localhost:{VLLM_PORT}"
MAX_TOKENS = 512
TEMPERATURE = 0

# Safe input character limit per model context.
# Conservative ratio: ~2.5 chars/token for mixed Korean/HTML content.
CHARS_PER_TOKEN_ESTIMATE = 2.5
RESERVED_OUTPUT_TOKENS = 512
RESERVED_SYSTEM_TOKENS = 300


def safe_input_chars(max_model_len: int) -> int:
    """Calculate safe input character limit for a given model context size."""
    available_tokens = max_model_len - RESERVED_OUTPUT_TOKENS - RESERVED_SYSTEM_TOKENS
    return int(available_tokens * CHARS_PER_TOKEN_ESTIMATE)
```

**Step 2: Verify import works**

Run: `cd pipeline/pipeline_v2 && uv run python -c "from config import MODELS, safe_input_chars; print(safe_input_chars(32768))"`
Expected: `79940`

**Step 3: Commit**

```bash
git add pipeline/pipeline_v2/config.py
git commit -m "feat(v6): add config with models, prompts, and safe_input_chars"
```

---

## Task 3: Create `synthesizer.py` — LLM Client & Server Management

Message builders for per-file/merge/chunk calls, response parsers, HTTP client, and vLLM server management.

**Files:**
- Create: `pipeline/pipeline_v2/synthesizer.py`
- Create: `pipeline/pipeline_v2/tests/test_synthesizer.py`

**Step 1: Write the failing tests**

```python
# pipeline/pipeline_v2/tests/test_synthesizer.py
import pytest
import json
import httpx
from unittest.mock import AsyncMock
from file_discovery import FileEntry
from synthesizer import (
    build_per_file_messages,
    build_merge_messages,
    build_chunk_merge_messages,
    parse_per_file_response,
    parse_llm_response,
    call_llm,
)


class TestBuildPerFileMessages:
    def test_includes_file_path_and_position(self):
        entry = FileEntry(
            relative_path="pages/slide1.html",
            content="<div>교육 콘텐츠</div>",
            position=1,
            total_files=5,
        )
        messages = build_per_file_messages(entry)
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert "pages/slide1.html" in messages[1]["content"]
        assert "1 / 5" in messages[1]["content"]

    def test_truncates_oversized_content(self):
        entry = FileEntry(
            relative_path="big.html",
            content="x" * 200_000,
            position=1,
            total_files=1,
        )
        messages = build_per_file_messages(entry, max_chars=50_000)
        assert len(messages[1]["content"]) < 200_000


class TestBuildMergeMessages:
    def test_builds_merge_from_summaries(self):
        file_summaries = [
            {"file_path": "index.html", "position": 1, "has_educational_content": True,
             "summary": "수학 기초 학습"},
            {"file_path": "style.css", "position": 2, "has_educational_content": False,
             "summary": "CSS 코드만 포함"},
        ]
        messages = build_merge_messages(file_summaries)
        assert len(messages) == 2
        assert "수학 기초 학습" in messages[1]["content"]
        assert "index.html" in messages[1]["content"]


class TestBuildChunkMergeMessages:
    def test_builds_chunk_merge(self):
        chunk_summaries = ["청크 1 요약", "청크 2 요약"]
        messages = build_chunk_merge_messages(chunk_summaries)
        assert len(messages) == 2
        assert "청크 1 요약" in messages[1]["content"]
        assert "청크 2 요약" in messages[1]["content"]


class TestParsePerFileResponse:
    def test_parses_valid_json(self):
        text = '{"has_educational_content": true, "summary": "수학 학습"}'
        result = parse_per_file_response(text)
        assert result["has_educational_content"] is True
        assert result["summary"] == "수학 학습"

    def test_handles_thinking_tags(self):
        text = '<think>reasoning</think>\n{"has_educational_content": false, "summary": "코드만 포함"}'
        result = parse_per_file_response(text)
        assert result["has_educational_content"] is False

    def test_fallback_on_invalid_json(self):
        text = "그냥 텍스트"
        result = parse_per_file_response(text)
        assert result["has_educational_content"] is True
        assert result["summary"] == "그냥 텍스트"


class TestParseLlmResponse:
    def test_parses_valid_json(self):
        text = '{ "summary": "주제. 활동. 목표" }'
        assert parse_llm_response(text) == "주제. 활동. 목표"

    def test_extracts_json_from_markdown(self):
        text = '```json\n{ "summary": "주제. 활동. 목표" }\n```'
        assert parse_llm_response(text) == "주제. 활동. 목표"

    def test_returns_raw_on_invalid_json(self):
        text = "그냥 텍스트 응답입니다"
        assert parse_llm_response(text) == text


class TestCallLlm:
    @pytest.mark.asyncio
    async def test_calls_with_messages(self):
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": '{"summary": "테스트"}'}}],
                "usage": {"prompt_tokens": 100, "completion_tokens": 20},
            },
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        client = AsyncMock()
        client.post = AsyncMock(return_value=mock_response)

        messages = [{"role": "system", "content": "test"}, {"role": "user", "content": "test"}]
        result = await call_llm(client, "model", messages=messages)
        assert result["summary"] == "테스트"
        assert result["prompt_tokens"] == 100

    @pytest.mark.asyncio
    async def test_handles_api_error(self):
        mock_response = httpx.Response(
            500, text="Internal Server Error",
            request=httpx.Request("POST", "http://localhost:8000/v1/chat/completions"),
        )
        client = AsyncMock()
        client.post = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        result = await call_llm(client, "model", messages=messages)
        assert "error" in result
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_synthesizer.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write the implementation**

```python
# pipeline/pipeline_v2/synthesizer.py
"""LLM synthesis via vLLM HTTP API.

Message builders for per-file, chunk-merge, and final-merge calls.
Manages vLLM server lifecycle.
"""

import asyncio
import json
import re
import signal
import subprocess
import sys
import time

import httpx
from rich.console import Console
from rich.live import Live
from rich.spinner import Spinner
from rich.text import Text

from config import (
    MAX_TOKENS,
    TEMPERATURE,
    VLLM_BASE_URL,
    VLLM_PORT,
    ModelConfig,
    PER_FILE_SYSTEM_PROMPT,
    MERGE_SYSTEM_PROMPT,
    CHUNK_MERGE_PROMPT,
)
from file_discovery import FileEntry


# --- Message builders ---

def build_per_file_messages(entry: FileEntry, max_chars: int = 80_000) -> list[dict]:
    """Build chat messages for per-file summarization."""
    content = entry.content
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[...truncated...]"

    user_content = (
        f"[파일 정보]\n"
        f"경로: {entry.relative_path}\n"
        f"위치: {entry.position} / {entry.total_files}\n\n"
        f"[파일 내용]\n{content}"
    )
    return [
        {"role": "system", "content": PER_FILE_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_merge_messages(file_summaries: list[dict]) -> list[dict]:
    """Build chat messages for final merge of per-file summaries."""
    lines = []
    for fs in file_summaries:
        status = "교육 내용 있음" if fs["has_educational_content"] else "교육 내용 없음"
        lines.append(
            f"[파일 {fs['position']}] {fs['file_path']} ({status})\n{fs['summary']}"
        )
    user_content = "\n\n".join(lines)
    return [
        {"role": "system", "content": MERGE_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_chunk_merge_messages(chunk_summaries: list[str]) -> list[dict]:
    """Build chat messages for merging chunk summaries of an oversized file."""
    lines = [f"[청크 {i+1}]\n{s}" for i, s in enumerate(chunk_summaries)]
    user_content = "\n\n".join(lines)
    return [
        {"role": "system", "content": CHUNK_MERGE_PROMPT},
        {"role": "user", "content": user_content},
    ]


# --- Response parsers ---

def parse_per_file_response(text: str) -> dict:
    """Parse per-file LLM response into structured dict."""
    text = re.sub(r'<think>[\s\S]*?</think>', '', text).strip()

    md_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if md_match:
        text = md_match.group(1)

    try:
        json_match = re.search(r'\{[^{}]*"summary"[^{}]*\}', text)
        if json_match:
            data = json.loads(json_match.group())
            return {
                "has_educational_content": data.get("has_educational_content", True),
                "summary": data.get("summary", text),
            }
    except (json.JSONDecodeError, AttributeError):
        pass

    return {"has_educational_content": True, "summary": text}


def parse_llm_response(text: str) -> str:
    """Extract summary string from LLM response."""
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


# --- LLM client ---

async def call_llm(
    client: httpx.AsyncClient,
    model_id: str,
    messages: list[dict],
) -> dict:
    """Send messages to vLLM and return parsed result."""
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


# --- vLLM server management ---

class VLLMServer:
    """Manages a vLLM server subprocess."""

    def __init__(self, model: ModelConfig, port: int = VLLM_PORT, num_gpus: int = 1):
        self.model = model
        self.port = port
        self.num_gpus = num_gpus
        self.process: subprocess.Popen | None = None

    def start(self) -> None:
        """Start the vLLM server and wait until it's healthy."""
        cmd = [
            sys.executable, "-m", "vllm.entrypoints.openai.api_server",
            "--model", self.model.model_id,
            "--port", str(self.port),
            *self.model.vllm_args,
        ]
        if self.num_gpus > 1:
            cmd.extend(["--tensor-parallel-size", str(self.num_gpus)])
        console = Console()
        console.print(f"  Starting vLLM: {self.model.model_id}")
        console.print(f"  Command: {' '.join(cmd)}")

        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        success, output = self._wait_for_health(console, timeout=900)
        if not success:
            if output:
                console.print(f"\n[bold red]  vLLM error output:[/bold red]")
                console.print(output[-3000:])
            self.stop()
            raise RuntimeError(f"vLLM server failed to start for {self.model.model_id}")

    def _wait_for_health(self, console: Console, timeout: int = 900) -> tuple[bool, str]:
        """Poll /v1/models until the server responds or timeout."""
        url = f"http://localhost:{self.port}/v1/models"
        start = time.monotonic()
        deadline = start + timeout

        with Live(Spinner("dots", text="Loading model weights..."), console=console, refresh_per_second=4) as live:
            while time.monotonic() < deadline:
                elapsed = int(time.monotonic() - start)
                try:
                    resp = httpx.get(url, timeout=10.0)
                    if resp.status_code == 200:
                        live.update(Text(f"  vLLM server ready ({elapsed}s)", style="bold green"))
                        return True, ""
                except (httpx.ConnectError, httpx.ReadTimeout, httpx.TimeoutException):
                    pass
                if self.process and self.process.poll() is not None:
                    stdout = self.process.stdout.read() if self.process.stdout else ""
                    return False, stdout
                live.update(Spinner("dots", text=f"Loading model weights... ({elapsed}s)"))
                time.sleep(3)
        stdout = ""
        if self.process and self.process.stdout:
            import select
            if select.select([self.process.stdout], [], [], 0)[0]:
                stdout = self.process.stdout.read()
        return False, stdout

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
```

**Step 4: Run tests**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_synthesizer.py -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/synthesizer.py pipeline/pipeline_v2/tests/test_synthesizer.py
git commit -m "feat(v6): add synthesizer with per-file/merge builders and vLLM server"
```

---

## Task 4: Create `map_reduce.py` — Core Orchestration Logic

Per-file summarization, oversized file chunking, and final merge.

**Files:**
- Create: `pipeline/pipeline_v2/map_reduce.py`
- Create: `pipeline/pipeline_v2/tests/test_map_reduce.py`

**Step 1: Write the failing tests**

```python
# pipeline/pipeline_v2/tests/test_map_reduce.py
import pytest
from unittest.mock import AsyncMock
import httpx
from file_discovery import FileEntry
from map_reduce import chunk_file_content, summarize_file, merge_summaries


class TestChunkFileContent:
    def test_small_file_single_chunk(self):
        chunks = chunk_file_content("short content", max_chars=1000)
        assert len(chunks) == 1
        assert chunks[0] == "short content"

    def test_large_file_multiple_chunks(self):
        content = "word " * 10000  # 50000 chars
        chunks = chunk_file_content(content, max_chars=10000)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 10000

    def test_splits_at_newline_boundary(self):
        lines = [f"Line {i} with some text content here" for i in range(100)]
        content = "\n".join(lines)
        chunks = chunk_file_content(content, max_chars=500)
        assert len(chunks) > 1
        for chunk in chunks[:-1]:
            assert chunk.endswith("\n") or len(chunk) <= 500


class TestSummarizeFile:
    @pytest.mark.asyncio
    async def test_summarizes_small_file(self):
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content":
                    '{"has_educational_content": true, "summary": "수학 학습"}'
                }}],
                "usage": {"prompt_tokens": 100, "completion_tokens": 20},
            },
            request=httpx.Request("POST", "http://test"),
        )
        client = AsyncMock()
        client.post = AsyncMock(return_value=mock_response)

        entry = FileEntry("test.html", "<p>수학 콘텐츠</p>", position=1, total_files=1)
        result = await summarize_file(client, "model-id", entry, max_chars=80000)
        assert result["has_educational_content"] is True
        assert result["summary"] == "수학 학습"
        assert result["file_path"] == "test.html"
        assert result["position"] == 1


class TestMergeSummaries:
    @pytest.mark.asyncio
    async def test_merges_file_summaries(self):
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content":
                    '{"summary": "주제. 활동. 목표"}'
                }}],
                "usage": {"prompt_tokens": 50, "completion_tokens": 15},
            },
            request=httpx.Request("POST", "http://test"),
        )
        client = AsyncMock()
        client.post = AsyncMock(return_value=mock_response)

        file_summaries = [
            {"file_path": "a.html", "position": 1, "has_educational_content": True,
             "summary": "수학"},
            {"file_path": "b.html", "position": 2, "has_educational_content": False,
             "summary": "CSS only"},
        ]
        result = await merge_summaries(client, "model-id", file_summaries)
        assert result["summary"] == "주제. 활동. 목표"
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_map_reduce.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write the implementation**

```python
# pipeline/pipeline_v2/map_reduce.py
"""Map-Reduce summarization pipeline.

Stage 2 (map): Summarize each file individually.
Stage 3 (reduce): Merge all per-file summaries into final 3-line summary.
"""

import httpx

from file_discovery import FileEntry
from synthesizer import (
    build_per_file_messages,
    build_merge_messages,
    build_chunk_merge_messages,
    parse_per_file_response,
    parse_llm_response,
    call_llm,
)


def chunk_file_content(content: str, max_chars: int) -> list[str]:
    """Split file content into chunks that fit within max_chars.

    Tries to split at newline boundaries for cleaner chunks.
    """
    if len(content) <= max_chars:
        return [content]

    chunks = []
    remaining = content
    while remaining:
        if len(remaining) <= max_chars:
            chunks.append(remaining)
            break

        split_at = remaining.rfind("\n", 0, max_chars)
        if split_at == -1 or split_at < max_chars // 2:
            split_at = max_chars

        chunks.append(remaining[:split_at + 1])
        remaining = remaining[split_at + 1:]

    return chunks


async def summarize_file(
    client: httpx.AsyncClient,
    model_id: str,
    entry: FileEntry,
    max_chars: int,
) -> dict:
    """Summarize a single file. Chunks oversized files automatically."""
    if len(entry.content) <= max_chars:
        messages = build_per_file_messages(entry, max_chars=max_chars)
        result = await call_llm(client, model_id, messages=messages)

        if "error" in result:
            return {
                "file_path": entry.relative_path,
                "position": entry.position,
                "has_educational_content": False,
                "summary": f"Error: {result['error']}",
                "llm_calls": 1,
            }

        parsed = parse_per_file_response(result.get("raw_response", ""))
        return {
            "file_path": entry.relative_path,
            "position": entry.position,
            "has_educational_content": parsed["has_educational_content"],
            "summary": parsed["summary"],
            "prompt_tokens": result.get("prompt_tokens", 0),
            "completion_tokens": result.get("completion_tokens", 0),
            "latency_ms": result.get("latency_ms", 0),
            "llm_calls": 1,
        }
    else:
        chunks = chunk_file_content(entry.content, max_chars)
        chunk_summaries = []
        total_prompt = 0
        total_completion = 0
        total_latency = 0

        for i, chunk_text in enumerate(chunks):
            chunk_entry = FileEntry(
                relative_path=f"{entry.relative_path} [chunk {i+1}/{len(chunks)}]",
                content=chunk_text,
                position=entry.position,
                total_files=entry.total_files,
            )
            messages = build_per_file_messages(chunk_entry, max_chars=max_chars)
            result = await call_llm(client, model_id, messages=messages)

            if "error" in result:
                chunk_summaries.append(f"Chunk {i+1} error: {result['error']}")
            else:
                parsed = parse_per_file_response(result.get("raw_response", ""))
                chunk_summaries.append(parsed["summary"])
                total_prompt += result.get("prompt_tokens", 0)
                total_completion += result.get("completion_tokens", 0)
                total_latency += result.get("latency_ms", 0)

        merge_messages = build_chunk_merge_messages(chunk_summaries)
        merge_result = await call_llm(client, model_id, messages=merge_messages)

        if "error" in merge_result:
            merged = {"has_educational_content": True, "summary": " ".join(chunk_summaries)}
        else:
            merged = parse_per_file_response(merge_result.get("raw_response", ""))
            total_prompt += merge_result.get("prompt_tokens", 0)
            total_completion += merge_result.get("completion_tokens", 0)
            total_latency += merge_result.get("latency_ms", 0)

        return {
            "file_path": entry.relative_path,
            "position": entry.position,
            "has_educational_content": merged["has_educational_content"],
            "summary": merged["summary"],
            "prompt_tokens": total_prompt,
            "completion_tokens": total_completion,
            "latency_ms": total_latency,
            "chunks": len(chunks),
            "llm_calls": len(chunks) + 1,
        }


async def merge_summaries(
    client: httpx.AsyncClient,
    model_id: str,
    file_summaries: list[dict],
) -> dict:
    """Merge all per-file summaries into a final 3-line summary."""
    messages = build_merge_messages(file_summaries)
    result = await call_llm(client, model_id, messages=messages)

    if "error" in result:
        return {"summary": f"Merge error: {result['error']}", "error": result["error"]}

    return {
        "summary": parse_llm_response(result.get("raw_response", "")),
        "raw_response": result.get("raw_response", ""),
        "prompt_tokens": result.get("prompt_tokens", 0),
        "completion_tokens": result.get("completion_tokens", 0),
        "latency_ms": result.get("latency_ms", 0),
    }
```

**Step 4: Run tests**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_map_reduce.py -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add pipeline/pipeline_v2/map_reduce.py pipeline/pipeline_v2/tests/test_map_reduce.py
git commit -m "feat(v6): add map_reduce module — chunking, per-file summary, merge"
```

---

## Task 5: Create `compare.py` — Report Generator

Terminal table + HTML report with per-file stats.

**Files:**
- Create: `pipeline/pipeline_v2/compare.py`
- Create: `pipeline/pipeline_v2/tests/test_compare.py`

**Step 1: Write tests**

```python
# pipeline/pipeline_v2/tests/test_compare.py
import os
import tempfile
from compare import print_terminal_report, generate_html_report

SAMPLE_RESULTS = {
    "exaone4-32b": [
        {
            "content_id": "test_content_1",
            "summary": "주제: 수학. 활동: 문제 풀기. 목표: 수학 실력 향상",
            "prompt_tokens": 12000,
            "completion_tokens": 50,
            "latency_ms": 1500,
            "total_files": 5,
            "llm_calls": 6,
        },
    ],
}


class TestTerminalReport:
    def test_prints_without_error(self, capsys):
        print_terminal_report(SAMPLE_RESULTS)
        captured = capsys.readouterr()
        assert "test_content_1" in captured.out


class TestHtmlReport:
    def test_generates_html_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            outpath = os.path.join(tmpdir, "comparison.html")
            generate_html_report(SAMPLE_RESULTS, outpath)
            assert os.path.exists(outpath)
            with open(outpath) as f:
                html = f.read()
            assert "test_content_1" in html
            assert "수학" in html
```

**Step 2: Write implementation**

Copy `compare.py` from v1, update stats line to include `total_files` and `llm_calls`:

```python
cell = f"{summary}\n\n[dim]({latency}ms, {tokens} tok, {entry.get('total_files', '?')} files, {entry.get('llm_calls', '?')} calls)[/dim]"
```

And in HTML template stats:
```html
<div class="stats">
  {{ entry.get('latency_ms', 0) }}ms |
  {{ entry.get('prompt_tokens', 0) }} prompt tok |
  {{ entry.get('total_files', 0) }} files |
  {{ entry.get('llm_calls', 0) }} LLM calls
</div>
```

**Step 3: Run tests**

Run: `cd pipeline/pipeline_v2 && uv run pytest tests/test_compare.py -v`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add pipeline/pipeline_v2/compare.py pipeline/pipeline_v2/tests/test_compare.py
git commit -m "feat(v6): add compare module with per-file stats in reports"
```

---

## Task 6: Create `main.py` — Pipeline Orchestrator

CLI entry point with `--content-ids` option. Wires everything together.

**Files:**
- Create: `pipeline/pipeline_v2/main.py`

**Step 1: Write the orchestrator**

```python
# pipeline/pipeline_v2/main.py
"""Pipeline v6.0 orchestrator — Map-Reduce summarization.

Usage:
    uv run main.py --content-dir ../../sample_contents --output-dir ./results
    uv run main.py --content-dir ../../sample_contents --output-dir ./results --models exaone4-32b
    uv run main.py --content-dir ../../sample_contents --output-dir ./results --content-ids 2018sah401_0301_0607
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone

import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn, MofNCompleteColumn

from compare import generate_html_report, print_terminal_report
from config import MODELS, ModelConfig, safe_input_chars
from file_discovery import discover_files
from map_reduce import summarize_file, merge_summaries
from synthesizer import VLLMServer

console = Console()


def discover_contents(content_dir: str, content_ids: list[str] | None = None) -> list[str]:
    """Find content subdirectories. If content_ids given, validate and use those."""
    if content_ids:
        for cid in content_ids:
            path = os.path.join(content_dir, cid)
            if not os.path.isdir(path):
                console.print(f"[red]Content not found: {cid}[/red]")
                sys.exit(1)
        return content_ids

    entries = []
    for name in sorted(os.listdir(content_dir)):
        path = os.path.join(content_dir, name)
        if os.path.isdir(path) and not name.startswith("."):
            entries.append(name)
    return entries


async def process_content(
    client: httpx.AsyncClient,
    model: ModelConfig,
    content_dir: str,
    content_id: str,
    progress: Progress,
    task_id,
) -> dict:
    """Process a single content folder with map-reduce."""
    folder = os.path.join(content_dir, content_id)
    max_chars = safe_input_chars(model.max_model_len)

    files = discover_files(folder)
    if not files:
        return {
            "content_id": content_id,
            "summary": "No text files found",
            "total_files": 0,
            "llm_calls": 0,
        }

    file_summaries = []
    total_prompt = 0
    total_completion = 0
    total_latency = 0
    total_llm_calls = 0

    for entry in files:
        progress.update(task_id, description=f"{model.name} → {content_id} ({entry.position}/{entry.total_files})")
        result = await summarize_file(client, model.model_id, entry, max_chars)
        file_summaries.append(result)
        total_prompt += result.get("prompt_tokens", 0)
        total_completion += result.get("completion_tokens", 0)
        total_latency += result.get("latency_ms", 0)
        total_llm_calls += result.get("llm_calls", 1)

    progress.update(task_id, description=f"{model.name} → {content_id} (merging)")
    merge_result = await merge_summaries(client, model.model_id, file_summaries)
    total_prompt += merge_result.get("prompt_tokens", 0)
    total_completion += merge_result.get("completion_tokens", 0)
    total_latency += merge_result.get("latency_ms", 0)
    total_llm_calls += 1

    return {
        "content_id": content_id,
        "summary": merge_result["summary"],
        "raw_response": merge_result.get("raw_response", ""),
        "file_summaries": file_summaries,
        "total_files": len(files),
        "prompt_tokens": total_prompt,
        "completion_tokens": total_completion,
        "latency_ms": total_latency,
        "llm_calls": total_llm_calls,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def process_model(
    model: ModelConfig,
    content_dir: str,
    content_ids: list[str],
    output_dir: str,
    skip_server: bool = False,
    num_gpus: int = 1,
) -> list[dict]:
    """Process all contents with a single model using map-reduce."""
    console.print(f"\n[bold magenta]Model: {model.name}[/bold magenta]")
    console.print(f"  {model.description}")
    console.print(f"  Max input chars: {safe_input_chars(model.max_model_len):,}")
    if num_gpus > 1:
        console.print(f"  GPUs: {num_gpus} (tensor parallel)")

    server = None
    if not skip_server:
        server = VLLMServer(model, num_gpus=num_gpus)
        server.start()

    results = []
    try:
        async with httpx.AsyncClient() as client:
            with Progress(
                SpinnerColumn(),
                TextColumn("[bold]{task.description}"),
                BarColumn(),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                console=console,
            ) as progress:
                task = progress.add_task(model.name, total=len(content_ids))
                for cid in content_ids:
                    result = await process_content(
                        client, model, content_dir, cid, progress, task
                    )
                    results.append(result)

                    if "error" in result:
                        progress.console.print(f"  [red]✗ {cid}: {result.get('error', 'unknown')}[/red]")
                    else:
                        progress.console.print(
                            f"  [green]✓ {cid}[/green] ({result['latency_ms']}ms, "
                            f"{result['total_files']} files, {result['llm_calls']} calls)"
                        )
                    progress.advance(task)
    finally:
        if server:
            server.stop()

    os.makedirs(output_dir, exist_ok=True)
    outpath = os.path.join(output_dir, f"{model.name}.json")
    with open(outpath, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    console.print(f"  Saved: {outpath}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Pipeline v6.0 — Map-Reduce Summary Extraction")
    parser.add_argument("--content-dir", required=True, help="Path to content folders")
    parser.add_argument("--output-dir", default="./results", help="Output directory")
    parser.add_argument(
        "--models", nargs="*", default=None,
        help="Model names to run (default: all). Choices: " + ", ".join(m.name for m in MODELS),
    )
    parser.add_argument(
        "--content-ids", nargs="*", default=None,
        help="Specific content folder names to process (default: all)",
    )
    parser.add_argument("--skip-server", action="store_true", help="Use existing vLLM server")
    parser.add_argument("--num-gpus", type=int, default=1, help="GPUs for tensor parallelism (default: 1)")
    args = parser.parse_args()

    if args.models:
        model_map = {m.name: m for m in MODELS}
        selected = []
        for name in args.models:
            if name not in model_map:
                console.print(f"[red]Unknown model: {name}[/red]")
                console.print(f"Available: {', '.join(model_map.keys())}")
                sys.exit(1)
            selected.append(model_map[name])
    else:
        selected = MODELS

    content_ids = discover_contents(args.content_dir, args.content_ids)
    if not content_ids:
        console.print(f"[red]No content folders found in {args.content_dir}[/red]")
        sys.exit(1)
    console.print(f"\n[bold]Found {len(content_ids)} content folders[/bold]")

    all_results: dict[str, list[dict]] = {}
    total_start = time.monotonic()

    for model in selected:
        results = asyncio.run(
            process_model(model, args.content_dir, content_ids, args.output_dir, args.skip_server, args.num_gpus)
        )
        all_results[model.name] = results

    total_time = time.monotonic() - total_start

    console.print(f"\n[bold green]Comparison Report[/bold green]")
    console.print(f"Total pipeline time: {total_time:.1f}s\n")

    print_terminal_report(all_results)

    html_path = os.path.join(args.output_dir, "comparison.html")
    generate_html_report(all_results, html_path)
    console.print(f"\n[bold]HTML report saved: {html_path}[/bold]")


if __name__ == "__main__":
    main()
```

**Step 2: Verify imports work**

Run: `cd pipeline/pipeline_v2 && uv run python -c "from main import discover_contents; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add pipeline/pipeline_v2/main.py
git commit -m "feat(v6): add main.py orchestrator with --content-ids"
```

---

## Task 7: Integration Tests

Test file discovery against actual sample content.

**Files:**
- Create: `pipeline/pipeline_v2/tests/test_integration.py`

**Step 1: Write integration tests**

```python
# pipeline/pipeline_v2/tests/test_integration.py
"""Integration tests using actual sample content (file discovery, no LLM)."""

import os
import pytest
from file_discovery import discover_files

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "sample_contents")


@pytest.mark.skipif(
    not os.path.isdir(SAMPLE_DIR),
    reason="sample_contents directory not found",
)
class TestFileDiscoveryIntegration:
    def _get_content_dirs(self):
        return [
            d for d in sorted(os.listdir(SAMPLE_DIR))
            if os.path.isdir(os.path.join(SAMPLE_DIR, d)) and not d.startswith(".")
        ]

    def test_all_samples_discover_files(self):
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            entries = discover_files(folder)
            assert len(entries) > 0, f"{cid} discovered no files"
            print(f"  {cid}: {len(entries)} files")

    def test_entries_have_content(self):
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            entries = discover_files(folder)
            for entry in entries:
                assert len(entry.content) > 0, f"{cid}/{entry.relative_path} has empty content"

    def test_positions_are_sequential(self):
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            entries = discover_files(folder)
            for i, entry in enumerate(entries):
                assert entry.position == i + 1
                assert entry.total_files == len(entries)

    def test_no_binary_files(self):
        binary_exts = {".png", ".jpg", ".gif", ".ico", ".swf", ".mp3", ".mp4", ".woff", ".ttf"}
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            entries = discover_files(folder)
            for entry in entries:
                ext = os.path.splitext(entry.relative_path)[1].lower()
                assert ext not in binary_exts, f"{cid}/{entry.relative_path} is binary"
```

**Step 2: Run all v2 tests**

Run: `cd pipeline/pipeline_v2 && uv run pytest -v`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add pipeline/pipeline_v2/tests/test_integration.py
git commit -m "feat(v6): add integration tests for file discovery"
```

---

## Task 8: Update Documentation

Update README and CLAUDE.md for the new project structure.

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: Update README**

Add v2 pipeline section with CLI examples:

```bash
# Pipeline v2 (Map-Reduce) — recommended
cd pipeline/pipeline_v2
uv run main.py --content-dir ../../sample_contents --output-dir ./results
uv run main.py --content-dir ../../sample_contents --output-dir ./results --models exaone4-32b
uv run main.py --content-dir ../../sample_contents --output-dir ./results --content-ids 2018sah401_0301_0607

# Pipeline v1 (Single-call with pre-filter) — legacy
cd pipeline/pipeline_v1
uv run main.py --content-dir ../../sample_contents --output-dir ./results
```

**Step 2: Update CLAUDE.md commands section**

```bash
# Pipeline v2 (active)
cd pipeline/pipeline_v2
uv sync --all-extras
uv run pytest -v
uv run main.py --content-dir ../../sample_contents --output-dir ./results

# Pipeline v1 (legacy)
cd pipeline/pipeline_v1
uv sync --all-extras
uv run pytest -v
```

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for v1/v2 project structure"
```

---

## Task Summary

| Task | What | Files in `pipeline/pipeline_v2/` |
|------|------|----------------------------------|
| 0 | Scaffold | `pyproject.toml`, `tests/__init__.py` |
| 1 | File discovery | `file_discovery.py`, `tests/test_file_discovery.py` |
| 2 | Config & prompts | `config.py` |
| 3 | Synthesizer | `synthesizer.py`, `tests/test_synthesizer.py` |
| 4 | Map-reduce logic | `map_reduce.py`, `tests/test_map_reduce.py` |
| 5 | Reports | `compare.py`, `tests/test_compare.py` |
| 6 | Main orchestrator | `main.py` |
| 7 | Integration tests | `tests/test_integration.py` |
| 8 | Documentation | `README.md`, `CLAUDE.md` |
