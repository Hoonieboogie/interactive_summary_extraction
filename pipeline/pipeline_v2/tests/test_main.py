import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pathlib import Path
from main import process_content, parse_args


class TestParseArgs:
    def test_required_content_dir(self):
        args = parse_args(["--content-dir", "/data/contents"])
        assert args.content_dir == Path("/data/contents")

    def test_defaults(self):
        args = parse_args(["--content-dir", "/data"])
        assert args.output_dir == Path("./results")
        assert args.model == "qwen3.5-27b"
        assert args.num_gpus == 1
        assert args.skip_server is False

    def test_content_ids(self):
        args = parse_args(["--content-dir", "/data", "--content-ids", "c1", "c2"])
        assert args.content_ids == ["c1", "c2"]

    def test_skip_server_flag(self):
        args = parse_args(["--content-dir", "/data", "--skip-server"])
        assert args.skip_server is True


class TestProcessContent:
    @pytest.mark.asyncio
    async def test_skips_binary_only_content(self, tmp_path):
        content_dir = tmp_path / "flash_content"
        content_dir.mkdir()
        (content_dir / "animation.swf").write_bytes(b"CWS" + b"\x00" * 100)

        output_dir = tmp_path / "output"
        llm = AsyncMock()

        result = await process_content(content_dir, output_dir, "qwen3.5-27b", llm)
        assert result is None  # skipped
        llm.call.assert_not_called()
