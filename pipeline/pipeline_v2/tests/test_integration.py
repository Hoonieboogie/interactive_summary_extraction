import json
import pytest
from unittest.mock import AsyncMock
from pathlib import Path
from main import process_content
from llm_client import LLMResponse


class TestEndToEnd:
    @pytest.mark.asyncio
    async def test_full_pipeline(self, tmp_path):
        # Create a mini content folder
        content = tmp_path / "test_content"
        content.mkdir()
        (content / "intro.html").write_text("<h1>분수의 덧셈</h1><p>분수를 더하는 방법을 배웁니다.</p>")
        (content / "style.css").write_text("body { color: red; }")
        (content / "image.png").write_bytes(b"\x89PNG" + b"\x00" * 50)

        output = tmp_path / "output"
        llm = AsyncMock()

        # Ordering call
        ordering_resp = LLMResponse(
            text='{"ordered_files": ["intro.html", "style.css"]}',
            prompt_tokens=50, completion_tokens=20,
        )
        # Per-file: intro.html (educational)
        intro_resp = LLMResponse(
            text='{"has_educational_content": true, "summary": "분수의 덧셈을 설명하는 파일"}',
            prompt_tokens=100, completion_tokens=30,
        )
        # Per-file: style.css (non-educational)
        css_resp = LLMResponse(
            text='{"has_educational_content": false, "summary": "CSS 스타일 코드"}',
            prompt_tokens=50, completion_tokens=20,
        )
        # Final merge
        merge_resp = LLMResponse(
            text='{"summary": "분수의 덧셈 방법을 배운다. 통분 개념을 소개한다. 연습 문제를 풀어본다.", "keywords": ["분수", "덧셈", "통분"]}',
            prompt_tokens=80, completion_tokens=40,
        )
        llm.call.side_effect = [ordering_resp, intro_resp, css_resp, merge_resp]

        result = await process_content(content, output, "qwen3.5-27b", llm)

        # Verify result
        assert result is not None
        assert result["content_id"] == "test_content"
        assert "분수" in result["summary"]

        # Verify output file
        output_file = output / "qwen3.5-27b" / "test_content.json"
        assert output_file.exists()
        data = json.loads(output_file.read_text())
        assert data["content_id"] == "test_content"
        assert data["model"] == "qwen3.5-27b"
        assert len(data["keywords"]) == 3

    @pytest.mark.asyncio
    async def test_binary_only_content_skipped(self, tmp_path):
        content = tmp_path / "flash_only"
        content.mkdir()
        (content / "anim.swf").write_bytes(b"CWS" + b"\x00" * 100)
        (content / "asset.fla").write_bytes(b"\x00" * 100)

        output = tmp_path / "output"
        llm = AsyncMock()

        result = await process_content(content, output, "qwen3.5-27b", llm)

        assert result is None
        llm.call.assert_not_called()

        # Verify skipped log
        skipped_file = output / "skipped_contents.json"
        assert skipped_file.exists()
        entries = json.loads(skipped_file.read_text())
        assert len(entries) == 1
        assert entries[0]["content_id"] == "flash_only"
