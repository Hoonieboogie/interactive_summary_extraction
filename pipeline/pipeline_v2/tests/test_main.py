import httpx
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pathlib import Path
from main import process_content, parse_args
from llm_client import LLMResponse, ContextOverflowError


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

    def test_map_concurrency_default(self):
        args = parse_args(["--content-dir", "/data"])
        assert args.map_concurrency == 4

    def test_map_concurrency_custom(self):
        args = parse_args(["--content-dir", "/data", "--map-concurrency", "8"])
        assert args.map_concurrency == 8


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


class TestErrorIsolation:

    @pytest.mark.asyncio
    async def test_file_timeout_skips_file_continues(self):
        """If one file crashes with ReadTimeout, skip it and process remaining files."""
        call_count = 0

        async def mock_call(system_prompt, user_message):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise httpx.ReadTimeout("timeout")
            return LLMResponse(
                text='{"has_educational_content": true, "summary": "ok"}',
                prompt_tokens=10, completion_tokens=5, duration_seconds=1.0,
            )

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = mock_call

        with patch("main.discover_files") as mock_discover, \
             patch("main.order_files") as mock_order, \
             patch("main.merge_summaries") as mock_merge, \
             patch("main.save_result"):

            entries = [
                MagicMock(position=1, filepath="a.html", raw_content="content a"),
                MagicMock(position=2, filepath="b.html", raw_content="content b"),
                MagicMock(position=3, filepath="c.html", raw_content="content c"),
            ]
            mock_discover.return_value = entries
            mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.5)])
            mock_merge.return_value = (MagicMock(summary="final", keywords=["k"]), [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.3)])

            result = await process_content(
                Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm
            )

            assert result is not None

    @pytest.mark.asyncio
    async def test_all_files_fail_returns_none(self):
        """If every file fails, process_content returns None without crashing."""
        async def always_fail(system_prompt, user_message):
            raise httpx.ReadTimeout("timeout")

        mock_llm = AsyncMock()
        mock_llm.call.side_effect = always_fail

        with patch("main.discover_files") as mock_discover, \
             patch("main.order_files") as mock_order, \
             patch("main.save_result") as mock_save:

            entries = [
                MagicMock(position=1, filepath="a.html", raw_content="content a"),
                MagicMock(position=2, filepath="b.html", raw_content="content b"),
            ]
            mock_discover.return_value = entries
            mock_order.return_value = (entries, [LLMResponse(text="", prompt_tokens=0, completion_tokens=0, duration_seconds=0.5)])

            result = await process_content(
                Path("/fake/content"), Path("/fake/output"), "test-model", mock_llm
            )

            assert result is None
            mock_save.assert_not_called()
