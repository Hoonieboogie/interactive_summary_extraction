import json
import pytest
from pathlib import Path
from stage4_output import save_result, save_skipped_content, load_skipped_contents
from stage3_reduce import MergeResult


class TestSaveResult:
    def test_creates_model_subdirectory(self, tmp_path):
        result = MergeResult(summary="요약", keywords=["k1"])
        save_result(tmp_path, "qwen3.5-27b", "content_123", result)
        output_file = tmp_path / "qwen3.5-27b" / "content_123.json"
        assert output_file.exists()

    def test_output_format(self, tmp_path):
        result = MergeResult(summary="줄1. 줄2. 줄3", keywords=["수학", "분수"])
        save_result(tmp_path, "qwen3.5-27b", "content_123", result)
        data = json.loads((tmp_path / "qwen3.5-27b" / "content_123.json").read_text())
        assert data == {
            "content_id": "content_123",
            "model": "qwen3.5-27b",
            "summary": "줄1. 줄2. 줄3",
            "keywords": ["수학", "분수"],
            "llm_calls": 0,
        }


class TestSkippedContents:
    def test_save_and_load(self, tmp_path):
        save_skipped_content(tmp_path, "flash_content", [".swf", ".fla"])
        entries = load_skipped_contents(tmp_path)
        assert len(entries) == 1
        assert entries[0]["content_id"] == "flash_content"
        assert entries[0]["reason"] == "no_text_files"
        assert entries[0]["file_types_found"] == [".swf", ".fla"]

    def test_appends_to_existing(self, tmp_path):
        save_skipped_content(tmp_path, "content_a", [".swf"])
        save_skipped_content(tmp_path, "content_b", [".png"])
        entries = load_skipped_contents(tmp_path)
        assert len(entries) == 2

    def test_load_nonexistent_returns_empty(self, tmp_path):
        entries = load_skipped_contents(tmp_path)
        assert entries == []
