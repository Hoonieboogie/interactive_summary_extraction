import pytest
import os
from pathlib import Path
from stage1_discovery import discover_files, FileEntry


class TestDiscoverFiles:
    def test_reads_text_files(self, tmp_path):
        (tmp_path / "page.html").write_text("<p>안녕</p>", encoding="utf-8")
        (tmp_path / "script.js").write_text("var x = 1;", encoding="utf-8")
        files = discover_files(tmp_path)
        assert len(files) == 2
        paths = {f.filepath for f in files}
        assert "page.html" in paths
        assert "script.js" in paths

    def test_skips_binary_files(self, tmp_path):
        (tmp_path / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        (tmp_path / "page.html").write_text("<p>text</p>", encoding="utf-8")
        files = discover_files(tmp_path)
        assert len(files) == 1
        assert files[0].filepath == "page.html"

    def test_reads_subdirectories(self, tmp_path):
        sub = tmp_path / "lesson"
        sub.mkdir()
        (sub / "intro.html").write_text("<p>hello</p>", encoding="utf-8")
        files = discover_files(tmp_path)
        assert len(files) == 1
        assert files[0].filepath == "lesson/intro.html"

    def test_auto_detects_euc_kr(self, tmp_path):
        text = "한글 인코딩 테스트입니다. 이 파일은 교육 콘텐츠를 포함하고 있으며 분수의 덧셈과 뺄셈을 설명합니다."
        (tmp_path / "korean.html").write_bytes(text.encode("euc-kr"))
        files = discover_files(tmp_path)
        assert len(files) == 1
        assert "한글" in files[0].raw_content

    def test_empty_folder_returns_empty(self, tmp_path):
        files = discover_files(tmp_path)
        assert files == []

    def test_binary_only_folder_returns_empty(self, tmp_path):
        (tmp_path / "flash.swf").write_bytes(b"CWS" + b"\x00" * 100)
        files = discover_files(tmp_path)
        assert files == []

    def test_file_entry_has_relative_path(self, tmp_path):
        (tmp_path / "data.json").write_text('{"a": 1}', encoding="utf-8")
        files = discover_files(tmp_path)
        assert files[0].filepath == "data.json"
        assert not os.path.isabs(files[0].filepath)

    def test_raw_content_preserved(self, tmp_path):
        content = "<html><style>body{color:red}</style><p>교육</p></html>"
        (tmp_path / "page.html").write_text(content, encoding="utf-8")
        files = discover_files(tmp_path)
        # Raw content — no stripping, no filtering
        assert "<style>" in files[0].raw_content
        assert "교육" in files[0].raw_content
