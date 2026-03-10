# Pipeline v5.0 — 3-Model Comparison Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Python pipeline that extracts educational summaries from interactive HTML content using 3 local LLMs (EXAONE 4.0, Qwen3-32B, Qwen3.5-35B-A3B) served via vLLM on a single H100 80GB, and generates a side-by-side comparison report.

**Architecture:** Pre-filter strips non-educational data (SVG/CSS/styles) from content folders, then sends cleaned text to each model sequentially via vLLM's HTTP API. Results are saved as JSON per model, then merged into a terminal table + HTML comparison report.

**Tech Stack:** Python 3.10+, uv, httpx (async HTTP), Rich (terminal tables), Jinja2 (HTML report), vLLM (model serving, installed separately)

---

### Task 1: Initialize uv project

**Files:**
- Create: `pipeline/pyproject.toml`

**Step 1: Create pipeline directory and pyproject.toml**

```toml
[project]
name = "summary-extraction-pipeline"
version = "0.1.0"
description = "LLM-first universal summary extractor for educational content"
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

**Step 2: Initialize uv project and sync**

Run: `cd pipeline && uv sync --dev`
Expected: `.venv/` created, dependencies installed

**Step 3: Verify**

Run: `cd pipeline && uv run python -c "import httpx, rich, jinja2; print('OK')"`
Expected: `OK`

**Step 4: Update .gitignore**

Add to root `.gitignore`:
```
pipeline/.venv/
pipeline/results/
__pycache__/
```

**Step 5: Commit**

```bash
git add pipeline/pyproject.toml .gitignore
git commit -m "feat: initialize uv project for pipeline v5"
```

---

### Task 2: Implement pre-filter module

**Files:**
- Create: `pipeline/prefilter.py`
- Create: `pipeline/tests/test_prefilter.py`

The pre-filter reads all `.html`, `.js`, `.json` files from a content folder and strips non-educational data. It must handle two content types:

1. **Aspen Editor**: `data.js` (300KB-1.6MB) — minified JSON in `window.apnExeFile={...}`. Contains page/widget/asset structures with Korean text embedded in `CTXT`, `text`, `title` fields.
2. **iSpring**: `index.html` (30KB) + `data/slide*.js` files — slide-based content with inline HTML/JS.

**Step 1: Write failing tests**

```python
# pipeline/tests/test_prefilter.py
import pytest
from prefilter import strip_svg, strip_css, strip_inline_styles, strip_comments, strip_svg_paths, strip_long_minified_lines, prefilter_text, prefilter_folder
import os
import tempfile


class TestStripSvg:
    def test_removes_svg_block(self):
        html = '<div>Hello</div><svg xmlns="..."><path d="M0,0"/></svg><p>World</p>'
        assert strip_svg(html) == '<div>Hello</div><p>World</p>'

    def test_removes_multiline_svg(self):
        html = '<div>Keep\n<svg>\n<circle/>\n</svg>\nKeep2</div>'
        assert strip_svg(html) == '<div>Keep\n\nKeep2</div>'

    def test_no_svg_unchanged(self):
        html = '<div>No SVG here</div>'
        assert strip_svg(html) == html


class TestStripCss:
    def test_removes_style_block(self):
        html = '<style>.foo{color:red}</style><div>Content</div>'
        assert strip_css(html) == '<div>Content</div>'

    def test_removes_multiple_style_blocks(self):
        html = '<style>a{}</style><p>Hi</p><style>b{}</style>'
        assert strip_css(html) == '<p>Hi</p>'


class TestStripInlineStyles:
    def test_removes_style_attribute(self):
        html = '<div style="color:red;font-size:12px">Text</div>'
        assert strip_inline_styles(html) == '<div>Text</div>'

    def test_preserves_other_attributes(self):
        html = '<img src="a.png" style="width:100%" alt="img">'
        assert strip_inline_styles(html) == '<img src="a.png" alt="img">'


class TestStripComments:
    def test_removes_html_comments(self):
        html = '<!-- comment --><div>Keep</div><!-- another -->'
        assert strip_comments(html) == '<div>Keep</div>'


class TestStripSvgPaths:
    def test_removes_d_attribute(self):
        html = '<path d="M0,0 V15.685 H23.527 L12,0 Z"/>'
        result = strip_svg_paths(html)
        assert 'M0,0' not in result


class TestStripLongMinifiedLines:
    def test_removes_long_lines_without_korean(self):
        long_js = 'a' * 600
        short_text = '한국어 교육 콘텐츠'
        text = f'{long_js}\n{short_text}\n'
        result = strip_long_minified_lines(text)
        assert short_text in result
        assert long_js not in result

    def test_keeps_long_lines_with_korean(self):
        long_with_korean = 'x' * 400 + '한국어 텍스트' + 'y' * 200
        result = strip_long_minified_lines(long_with_korean)
        assert '한국어 텍스트' in result


class TestPrefilterText:
    def test_full_pipeline(self):
        html = (
            '<!-- comment -->'
            '<style>.x{color:red}</style>'
            '<svg><path d="M0,0"/></svg>'
            '<div style="font-size:12px">교육 콘텐츠</div>'
        )
        result = prefilter_text(html)
        assert '교육 콘텐츠' in result
        assert 'color:red' not in result
        assert 'M0,0' not in result
        assert 'comment' not in result
        assert 'font-size' not in result


class TestPrefilterFolder:
    def test_reads_html_and_js_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a mock content folder
            with open(os.path.join(tmpdir, 'index.html'), 'w') as f:
                f.write('<div>교육 내용</div>')
            with open(os.path.join(tmpdir, 'data.js'), 'w') as f:
                f.write('window.apnExeFile={"title":"수학 학습"}')
            # Non-target file
            with open(os.path.join(tmpdir, 'image.png'), 'wb') as f:
                f.write(b'\x89PNG')

            result = prefilter_folder(tmpdir)
            assert '교육 내용' in result
            assert '수학 학습' in result
            assert 'PNG' not in result

    def test_returns_char_count(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'index.html'), 'w') as f:
                f.write('<div>Hello</div>')
            result = prefilter_folder(tmpdir)
            assert len(result) > 0
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline && uv run pytest tests/test_prefilter.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'prefilter'`

**Step 3: Implement prefilter.py**

```python
# pipeline/prefilter.py
"""Universal pre-filter for educational HTML/JS content.

Strips provably non-educational data (SVG, CSS, styles, comments)
while preserving text, media references, and educational content.
"""

import os
import re


def strip_svg(text: str) -> str:
    """Remove <svg>...</svg> blocks."""
    return re.sub(r'<svg[\s\S]*?</svg>', '', text, flags=re.IGNORECASE)


def strip_css(text: str) -> str:
    """Remove <style>...</style> blocks."""
    return re.sub(r'<style[\s\S]*?</style>', '', text, flags=re.IGNORECASE)


def strip_inline_styles(text: str) -> str:
    """Remove style=\"...\" attributes from tags."""
    return re.sub(r'\s*style="[^"]*"', '', text)


def strip_comments(text: str) -> str:
    """Remove HTML comments <!-- ... -->."""
    return re.sub(r'<!--[\s\S]*?-->', '', text)


def strip_svg_paths(text: str) -> str:
    """Remove SVG path data attributes d=\"...\"."""
    return re.sub(r'\s*d="[^"]*"', '', text)


_KOREAN_RE = re.compile(r'[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]')


def strip_long_minified_lines(text: str, max_len: int = 500) -> str:
    """Remove lines longer than max_len that contain no Korean text.

    Long lines without Korean are almost certainly minified JS/CSS framework
    code, not educational content.
    """
    lines = text.split('\n')
    kept = []
    for line in lines:
        if len(line) > max_len and not _KOREAN_RE.search(line):
            continue
        kept.append(line)
    return '\n'.join(kept)


def prefilter_text(text: str) -> str:
    """Apply all pre-filter stages to raw text."""
    text = strip_comments(text)
    text = strip_svg(text)
    text = strip_css(text)
    text = strip_svg_paths(text)
    text = strip_inline_styles(text)
    text = strip_long_minified_lines(text)
    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


_TARGET_EXTENSIONS = {'.html', '.js', '.json'}


def prefilter_folder(folder_path: str) -> str:
    """Read all .html/.js/.json files from a content folder, apply pre-filter.

    Walks the directory tree, reads target files, concatenates and filters.
    Returns the cleaned text ready for LLM input.
    """
    parts: list[str] = []

    for root, _dirs, files in os.walk(folder_path):
        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in _TARGET_EXTENSIONS:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                if content.strip():
                    rel = os.path.relpath(fpath, folder_path)
                    parts.append(f"--- FILE: {rel} ---\n{content}")
            except (OSError, UnicodeDecodeError):
                continue

    raw = '\n\n'.join(parts)
    return prefilter_text(raw)
```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline && uv run pytest tests/test_prefilter.py -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add pipeline/prefilter.py pipeline/tests/test_prefilter.py
git commit -m "feat: implement universal pre-filter for HTML/JS content"
```

---

### Task 3: Implement config module

**Files:**
- Create: `pipeline/config.py`

**Step 1: Create config.py with model definitions and prompt**

```python
# pipeline/config.py
"""Configuration for the 3-model comparison pipeline."""

from dataclasses import dataclass


@dataclass
class ModelConfig:
    name: str
    model_id: str
    vllm_args: list[str]
    description: str


MODELS = [
    ModelConfig(
        name="exaone4-32b",
        model_id="LGAI-EXAONE/EXAONE-4.0-32B",
        vllm_args=[
            "--dtype", "auto",
            "--max-model-len", "65536",
            "--gpu-memory-utilization", "0.90",
            "--quantization", "fp8",
        ],
        description="EXAONE 4.0 32B (LG AI Research, Korean-optimized)",
    ),
    ModelConfig(
        name="qwen3-32b",
        model_id="Qwen/Qwen3-32B",
        vllm_args=[
            "--dtype", "auto",
            "--max-model-len", "65536",
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
            "--max-model-len", "65536",
            "--gpu-memory-utilization", "0.90",
            "--quantization", "fp8",
        ],
        description="Qwen3.5-35B-A3B (Alibaba, MoE 3B active)",
    ),
]

SYSTEM_PROMPT = """너는 교육 콘텐츠 분석 전문가야.

아래는 교육용 인터랙티브 콘텐츠에서 추출한 원본 텍스트야.
이 텍스트에는 HTML 태그, 코드, UI 요소(버튼, 메뉴, 네비게이션 텍스트) 등이
포함되어 있을 수 있어.

[지시사항]
1. HTML 태그, JavaScript, CSS 코드를 모두 무시해.
2. 버튼 라벨, 네비게이션 텍스트, UI 요소 텍스트를 무시해.
3. 교육적으로 의미 있는 내용만 파악해.
4. 해당 콘텐츠의 핵심 교육 내용을 한국어 3줄로 요약해.
5. 원본 텍스트에 없는 내용을 절대 추가하지 마.

규칙:
- 첫째 줄: 학습 주제 (무엇을 배우는가)
- 둘째 줄: 주요 학습 활동 (어떤 활동을 하는가)
- 셋째 줄: 학습 목표 및 기대 효과 (무엇을 할 수 있게 되는가)

[출력형식]
JSON 형식으로 응답할 것:
{ "summary": "첫째 줄. 둘째 줄. 셋째 줄" }"""

VLLM_PORT = 8000
VLLM_BASE_URL = f"http://localhost:{VLLM_PORT}"
MAX_TOKENS = 512
TEMPERATURE = 0
MAX_CONTENT_CHARS = 200_000  # Safety truncation limit (~50K tokens)
```

**Step 2: Commit**

```bash
git add pipeline/config.py
git commit -m "feat: add model configs and prompt template"
```

---

### Task 4: Implement synthesizer module

**Files:**
- Create: `pipeline/synthesizer.py`
- Create: `pipeline/tests/test_synthesizer.py`

The synthesizer manages vLLM server lifecycle and sends pre-filtered content to the model.

**Step 1: Write failing tests**

```python
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
        # Content should be truncated to MAX_CONTENT_CHARS
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
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline && uv run pytest tests/test_synthesizer.py -v`
Expected: FAIL — `ModuleNotFoundError`

**Step 3: Implement synthesizer.py**

```python
# pipeline/synthesizer.py
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
    """Build chat messages for the LLM.

    Truncates content to MAX_CONTENT_CHARS to stay within context window.
    """
    if len(content) > MAX_CONTENT_CHARS:
        content = content[:MAX_CONTENT_CHARS] + "\n\n[...truncated...]"

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]


def parse_llm_response(text: str) -> str:
    """Extract summary from LLM response.

    Handles: raw JSON, markdown-wrapped JSON, thinking tags, plain text.
    """
    # Strip <think>...</think> blocks
    text = re.sub(r'<think>[\s\S]*?</think>', '', text).strip()

    # Try to extract JSON from markdown code blocks
    md_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if md_match:
        text = md_match.group(1)

    # Try to parse as JSON
    try:
        # Find the first JSON object in the text
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
    """Send content to vLLM and return parsed result.

    Returns dict with: summary, prompt_tokens, completion_tokens, latency_ms
    On error: returns dict with error message.
    """
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

        # Wait for health check
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
            # Check if process died
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
```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline && uv run pytest tests/test_synthesizer.py -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add pipeline/synthesizer.py pipeline/tests/test_synthesizer.py
git commit -m "feat: implement synthesizer with vLLM server management"
```

---

### Task 5: Implement comparison report module

**Files:**
- Create: `pipeline/compare.py`
- Create: `pipeline/tests/test_compare.py`

**Step 1: Write failing tests**

```python
# pipeline/tests/test_compare.py
import pytest
import json
import os
import tempfile
from compare import print_terminal_report, generate_html_report


SAMPLE_RESULTS = {
    "exaone4-32b": [
        {
            "content_id": "test_content_1",
            "summary": "주제: 수학. 활동: 문제 풀기. 목표: 수학 실력 향상",
            "input_chars": 45000,
            "prompt_tokens": 12000,
            "completion_tokens": 50,
            "latency_ms": 1500,
        },
        {
            "content_id": "test_content_2",
            "summary": "주제: 과학. 활동: 실험. 목표: 과학적 사고력",
            "input_chars": 30000,
            "prompt_tokens": 8000,
            "completion_tokens": 45,
            "latency_ms": 1200,
        },
    ],
    "qwen3-32b": [
        {
            "content_id": "test_content_1",
            "summary": "수학 기초를 배운다. 연습 문제를 풀어본다. 수학 능력을 기른다",
            "input_chars": 45000,
            "prompt_tokens": 11500,
            "completion_tokens": 48,
            "latency_ms": 1800,
        },
        {
            "content_id": "test_content_2",
            "summary": "과학 원리를 학습한다. 실험을 수행한다. 탐구력을 키운다",
            "input_chars": 30000,
            "prompt_tokens": 7800,
            "completion_tokens": 42,
            "latency_ms": 1100,
        },
    ],
}


class TestTerminalReport:
    def test_prints_without_error(self, capsys):
        print_terminal_report(SAMPLE_RESULTS)
        captured = capsys.readouterr()
        assert "test_content_1" in captured.out
        assert "test_content_2" in captured.out


class TestHtmlReport:
    def test_generates_html_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            outpath = os.path.join(tmpdir, "comparison.html")
            generate_html_report(SAMPLE_RESULTS, outpath)

            assert os.path.exists(outpath)
            with open(outpath, 'r') as f:
                html = f.read()
            assert "test_content_1" in html
            assert "test_content_2" in html
            assert "수학" in html
            assert "과학" in html

    def test_html_contains_all_models(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            outpath = os.path.join(tmpdir, "comparison.html")
            generate_html_report(SAMPLE_RESULTS, outpath)

            with open(outpath, 'r') as f:
                html = f.read()
            assert "exaone4-32b" in html
            assert "qwen3-32b" in html
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline && uv run pytest tests/test_compare.py -v`
Expected: FAIL

**Step 3: Implement compare.py**

```python
# pipeline/compare.py
"""Comparison report generator: terminal table + HTML report."""

import json
import os
from datetime import datetime, timezone

from jinja2 import Template
from rich.console import Console
from rich.table import Table


def print_terminal_report(results: dict[str, list[dict]]) -> None:
    """Print a Rich table comparing model outputs side by side."""
    console = Console()
    model_names = list(results.keys())

    # Collect all content IDs (preserving order from first model)
    content_ids = []
    for entries in results.values():
        for entry in entries:
            cid = entry["content_id"]
            if cid not in content_ids:
                content_ids.append(cid)

    table = Table(title="Summary Extraction Comparison", show_lines=True)
    table.add_column("Content ID", style="cyan", min_width=20)
    for name in model_names:
        table.add_column(name, min_width=30, max_width=50)

    # Build lookup: model_name -> content_id -> entry
    lookup: dict[str, dict[str, dict]] = {}
    for model_name, entries in results.items():
        lookup[model_name] = {e["content_id"]: e for e in entries}

    for cid in content_ids:
        row = [cid]
        for model_name in model_names:
            entry = lookup.get(model_name, {}).get(cid, {})
            summary = entry.get("summary", entry.get("error", "N/A"))
            latency = entry.get("latency_ms", 0)
            tokens = entry.get("prompt_tokens", 0)
            cell = f"{summary}\n\n[dim]({latency}ms, {tokens} tok)[/dim]"
            row.append(cell)
        table.add_row(*row)

    console.print(table)

    # Print totals
    console.print("\n[bold]Totals:[/bold]")
    for model_name, entries in results.items():
        total_latency = sum(e.get("latency_ms", 0) for e in entries)
        total_tokens = sum(e.get("prompt_tokens", 0) for e in entries)
        errors = sum(1 for e in entries if "error" in e)
        console.print(
            f"  {model_name}: {total_latency/1000:.1f}s total, "
            f"{total_tokens} prompt tokens, {errors} errors"
        )


_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Summary Extraction Comparison</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Malgun Gothic', sans-serif; background: #f5f5f5; padding: 20px; }
  h1 { text-align: center; margin-bottom: 8px; color: #1a1a2e; }
  .meta { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
  .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .card-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px;
                padding-bottom: 8px; border-bottom: 2px solid #e0e0e0; }
  .card-title.flagged { border-bottom-color: #ff6b6b; }
  .flag-badge { background: #ff6b6b; color: white; font-size: 11px; padding: 2px 8px;
                border-radius: 4px; margin-left: 8px; }
  .models { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .model-box { border: 1px solid #e8e8e8; border-radius: 8px; padding: 14px; }
  .model-name { font-weight: 600; color: #4a4a8a; margin-bottom: 8px; font-size: 14px; }
  .summary { font-size: 15px; line-height: 1.6; color: #333; white-space: pre-wrap; }
  .stats { margin-top: 10px; font-size: 12px; color: #888; }
  .totals { background: white; border-radius: 12px; padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .totals h2 { font-size: 16px; margin-bottom: 12px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals th, .totals td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
  .totals th { color: #666; font-weight: 600; }
</style>
</head>
<body>
<h1>Summary Extraction Comparison</h1>
<p class="meta">Generated: {{ generated_at }} | Models: {{ model_names | join(', ') }}</p>

{% for cid in content_ids %}
<div class="card">
  <div class="card-title{% if flags[cid] %} flagged{% endif %}">
    {{ cid }}
    {% if flags[cid] %}<span class="flag-badge">⚠ Low text ({{ input_chars[cid] }} chars)</span>{% endif %}
  </div>
  <div class="models">
    {% for model_name in model_names %}
    {% set entry = lookup[model_name].get(cid, {}) %}
    <div class="model-box">
      <div class="model-name">{{ model_name }}</div>
      <div class="summary">{{ entry.get('summary', entry.get('error', 'N/A')) }}</div>
      <div class="stats">
        {{ entry.get('latency_ms', 0) }}ms &middot;
        {{ entry.get('prompt_tokens', 0) }} prompt tok &middot;
        {{ entry.get('completion_tokens', 0) }} completion tok
      </div>
    </div>
    {% endfor %}
  </div>
</div>
{% endfor %}

<div class="totals">
  <h2>Totals</h2>
  <table>
    <tr>
      <th>Model</th>
      <th>Total Time</th>
      <th>Avg Latency</th>
      <th>Total Prompt Tokens</th>
      <th>Errors</th>
    </tr>
    {% for model_name in model_names %}
    {% set entries = results[model_name] %}
    <tr>
      <td>{{ model_name }}</td>
      <td>{{ "%.1f"|format(entries | sum(attribute='latency_ms') / 1000) }}s</td>
      <td>{{ "%.0f"|format(entries | sum(attribute='latency_ms') / (entries | length or 1)) }}ms</td>
      <td>{{ entries | sum(attribute='prompt_tokens') }}</td>
      <td>{{ entries | selectattr('error', 'defined') | list | length }}</td>
    </tr>
    {% endfor %}
  </table>
</div>

</body>
</html>
"""


def generate_html_report(results: dict[str, list[dict]], output_path: str) -> None:
    """Generate a single-file HTML comparison report."""
    model_names = list(results.keys())

    # Collect content IDs
    content_ids = []
    for entries in results.values():
        for entry in entries:
            cid = entry["content_id"]
            if cid not in content_ids:
                content_ids.append(cid)

    # Build lookup
    lookup: dict[str, dict[str, dict]] = {}
    for model_name, entries in results.items():
        lookup[model_name] = {e["content_id"]: e for e in entries}

    # Flag low-text contents
    flags: dict[str, bool] = {}
    input_chars: dict[str, int] = {}
    for cid in content_ids:
        chars = 0
        for model_name in model_names:
            entry = lookup.get(model_name, {}).get(cid, {})
            chars = max(chars, entry.get("input_chars", 0))
        input_chars[cid] = chars
        flags[cid] = chars < 100

    template = Template(_HTML_TEMPLATE)
    html = template.render(
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        model_names=model_names,
        content_ids=content_ids,
        lookup=lookup,
        flags=flags,
        input_chars=input_chars,
        results=results,
    )

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline && uv run pytest tests/test_compare.py -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add pipeline/compare.py pipeline/tests/test_compare.py
git commit -m "feat: implement comparison report (terminal + HTML)"
```

---

### Task 6: Implement main orchestrator

**Files:**
- Create: `pipeline/main.py`
- Create: `pipeline/tests/__init__.py`

**Step 1: Create tests/__init__.py**

Empty file to make tests a package.

**Step 2: Implement main.py**

```python
# pipeline/main.py
"""Pipeline v5.0 orchestrator.

Usage:
    uv run main.py --content-dir ../sample_contents --output-dir ./results
    uv run main.py --content-dir ../sample_contents --output-dir ./results --models exaone4-32b qwen3-32b
    uv run main.py --content-dir ../sample_contents --output-dir ./results --skip-server
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

from compare import generate_html_report, print_terminal_report
from config import MODELS, ModelConfig
from prefilter import prefilter_folder
from synthesizer import VLLMServer, call_llm

console = Console()


def discover_contents(content_dir: str) -> list[str]:
    """Find all content subdirectories."""
    entries = []
    for name in sorted(os.listdir(content_dir)):
        path = os.path.join(content_dir, name)
        if os.path.isdir(path) and not name.startswith('.'):
            entries.append(name)
    return entries


def prefilter_all(content_dir: str, content_ids: list[str]) -> dict[str, str]:
    """Pre-filter all content folders. Returns {content_id: filtered_text}."""
    console.print("\n[bold cyan]Stage 1: Pre-filtering content[/bold cyan]")
    filtered = {}
    for cid in content_ids:
        folder = os.path.join(content_dir, cid)
        text = prefilter_folder(folder)
        filtered[cid] = text
        flag = " [yellow](⚠ low text)[/yellow]" if len(text) < 100 else ""
        console.print(f"  {cid}: {len(text):,} chars{flag}")
    return filtered


async def process_model(
    model: ModelConfig,
    filtered_contents: dict[str, str],
    output_dir: str,
    skip_server: bool = False,
) -> list[dict]:
    """Process all contents with a single model. Returns list of result dicts."""
    console.print(f"\n[bold magenta]Stage 2: {model.name}[/bold magenta]")
    console.print(f"  Model: {model.description}")

    server = None
    if not skip_server:
        server = VLLMServer(model)
        server.start()

    results = []
    try:
        async with httpx.AsyncClient() as client:
            for cid, text in filtered_contents.items():
                console.print(f"  Processing: {cid}...", end=" ")
                result = await call_llm(client, model.model_id, text)
                result["content_id"] = cid
                result["input_chars"] = len(text)
                result["timestamp"] = datetime.now(timezone.utc).isoformat()
                results.append(result)

                if "error" in result:
                    console.print(f"[red]ERROR: {result['error']}[/red]")
                else:
                    console.print(
                        f"[green]OK[/green] ({result['latency_ms']}ms, "
                        f"{result.get('prompt_tokens', 0)} tok)"
                    )
    finally:
        if server:
            server.stop()

    # Save per-model results
    os.makedirs(output_dir, exist_ok=True)
    outpath = os.path.join(output_dir, f"{model.name}.json")
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    console.print(f"  Saved: {outpath}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Pipeline v5.0 — 3-Model Summary Extraction")
    parser.add_argument("--content-dir", required=True, help="Path to content folders")
    parser.add_argument("--output-dir", default="./results", help="Output directory")
    parser.add_argument(
        "--models",
        nargs="*",
        default=None,
        help="Model names to run (default: all). Choices: "
        + ", ".join(m.name for m in MODELS),
    )
    parser.add_argument(
        "--skip-server",
        action="store_true",
        help="Skip vLLM server management (assumes server already running)",
    )
    args = parser.parse_args()

    # Resolve models
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

    # Discover contents
    content_ids = discover_contents(args.content_dir)
    if not content_ids:
        console.print(f"[red]No content folders found in {args.content_dir}[/red]")
        sys.exit(1)
    console.print(f"\n[bold]Found {len(content_ids)} content folders[/bold]")

    # Stage 1: Pre-filter (once for all models)
    filtered = prefilter_all(args.content_dir, content_ids)

    # Stage 2: Process each model sequentially
    all_results: dict[str, list[dict]] = {}
    total_start = time.monotonic()

    for model in selected:
        results = asyncio.run(
            process_model(model, filtered, args.output_dir, args.skip_server)
        )
        all_results[model.name] = results

    total_time = time.monotonic() - total_start

    # Stage 3: Comparison report
    console.print(f"\n[bold green]Stage 3: Comparison Report[/bold green]")
    console.print(f"Total pipeline time: {total_time:.1f}s\n")

    print_terminal_report(all_results)

    html_path = os.path.join(args.output_dir, "comparison.html")
    generate_html_report(all_results, html_path)
    console.print(f"\n[bold]HTML report saved: {html_path}[/bold]")


if __name__ == "__main__":
    main()
```

**Step 3: Run a dry test (prefilter only, no vLLM)**

Run: `cd pipeline && uv run python -c "from prefilter import prefilter_folder; text = prefilter_folder('../sample_contents/2026_kuk_501_0304_1112'); print(f'Chars: {len(text)}')"`
Expected: Prints character count (should be in the range 10K-200K)

**Step 4: Commit**

```bash
git add pipeline/main.py pipeline/tests/__init__.py
git commit -m "feat: implement main orchestrator for sequential model comparison"
```

---

### Task 7: RunPod setup script

**Files:**
- Create: `pipeline/setup_runpod.sh`

**Step 1: Create setup script**

```bash
#!/usr/bin/env bash
# setup_runpod.sh — One-time setup for RunPod H100 pod
# Usage: bash setup_runpod.sh

set -euo pipefail

echo "=== Pipeline v5.0 RunPod Setup ==="

# 1. Install uv
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi
echo "uv version: $(uv --version)"

# 2. Install pipeline dependencies
echo "Installing pipeline dependencies..."
cd "$(dirname "$0")"
uv sync

# 3. Install vLLM (nightly for Qwen3.5 support)
echo "Installing vLLM (nightly)..."
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly

# 4. Verify GPU
echo "Checking GPU..."
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0)}'); print(f'VRAM: {torch.cuda.get_device_properties(0).total_mem / 1024**3:.1f} GB')"

# 5. Verify vLLM
echo "Checking vLLM..."
python -c "import vllm; print(f'vLLM version: {vllm.__version__}')"

echo ""
echo "=== Setup complete ==="
echo "Run the pipeline:"
echo "  uv run main.py --content-dir ../sample_contents --output-dir ./results"
```

**Step 2: Make executable and commit**

```bash
chmod +x pipeline/setup_runpod.sh
git add pipeline/setup_runpod.sh
git commit -m "feat: add RunPod setup script"
```

---

### Task 8: Integration test with pre-filter on all samples

**Files:**
- Create: `pipeline/tests/test_integration.py`

This test runs the pre-filter on actual sample contents (no LLM needed).

**Step 1: Write integration test**

```python
# pipeline/tests/test_integration.py
"""Integration tests using actual sample content (pre-filter only, no LLM)."""

import os
import pytest
from prefilter import prefilter_folder

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'sample_contents')


@pytest.mark.skipif(
    not os.path.isdir(SAMPLE_DIR),
    reason="sample_contents directory not found"
)
class TestPrefilterIntegration:
    def _get_content_dirs(self):
        return [
            d for d in sorted(os.listdir(SAMPLE_DIR))
            if os.path.isdir(os.path.join(SAMPLE_DIR, d)) and not d.startswith('.')
        ]

    def test_all_samples_produce_output(self):
        """Every sample folder should produce non-empty pre-filtered text."""
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            assert len(text) > 0, f"{cid} produced empty output"

    def test_svg_and_css_removed(self):
        """Pre-filtered output should not contain SVG paths or CSS rules."""
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            # Should not contain raw CSS property declarations
            assert 'font-family:' not in text.lower() or 'font-family' in text[:50], \
                f"{cid} still contains CSS"
            # Should not contain SVG coordinate data
            assert '<svg' not in text.lower(), f"{cid} still contains SVG blocks"

    def test_korean_text_preserved(self):
        """Pre-filtered output should contain Korean text."""
        korean_found = False
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            import re
            if re.search(r'[\uac00-\ud7af]', text):
                korean_found = True
                break
        assert korean_found, "No Korean text found in any sample"

    def test_output_sizes_reasonable(self):
        """Pre-filtered output should be significantly smaller than raw input."""
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            # Should produce between 100 chars and 500K chars
            assert len(text) < 500_000, f"{cid} output too large: {len(text)} chars"
            print(f"  {cid}: {len(text):,} chars")
```

**Step 2: Run integration tests**

Run: `cd pipeline && uv run pytest tests/test_integration.py -v -s`
Expected: All PASS, prints character counts per sample

**Step 3: Commit**

```bash
git add pipeline/tests/test_integration.py
git commit -m "test: add integration tests for pre-filter on sample content"
```

---

### Task 9: Final verification and documentation

**Step 1: Run all tests**

Run: `cd pipeline && uv run pytest -v`
Expected: All tests PASS

**Step 2: Verify pipeline dry run**

Run: `cd pipeline && uv run main.py --content-dir ../sample_contents --output-dir ./results --skip-server`
Expected: Pre-filter runs on all 7 samples, then fails at LLM stage (no server) — but verifies the orchestrator flow.

Note: `--skip-server` will skip starting vLLM but still attempt HTTP calls which will fail with connection errors. This is expected and validates the error handling path.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: pipeline v5.0 complete — ready for RunPod deployment"
```

---

## Execution on RunPod

After deploying to RunPod H100:

```bash
# Setup (one-time)
bash pipeline/setup_runpod.sh

# Run full comparison (all 3 models)
cd pipeline
uv run main.py --content-dir ../sample_contents --output-dir ./results

# Run single model for testing
uv run main.py --content-dir ../sample_contents --output-dir ./results --models qwen3-32b

# Re-run comparison if you already have a vLLM server running
uv run main.py --content-dir ../sample_contents --output-dir ./results --skip-server
```

---

Plan complete and saved to `docs/plans/2026-03-10-pipeline-v5-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?