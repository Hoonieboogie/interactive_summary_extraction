import pytest
from server import build_vllm_command
from config import get_model_config


class TestBuildVllmCommand:
    def test_default_args(self):
        cfg = get_model_config("qwen3.5-27b")
        cmd = build_vllm_command(cfg, num_gpus=1)
        joined = " ".join(cmd)
        assert cfg.hf_id in joined
        assert str(cfg.max_model_len) in joined

    def test_multi_gpu(self):
        cfg = get_model_config("qwen3.5-27b")
        cmd = build_vllm_command(cfg, num_gpus=2)
        joined = " ".join(cmd)
        assert "--tensor-parallel-size" in joined
        assert "2" in joined

    def test_reasoning_parser_in_command(self):
        """vllm_args (including --reasoning-parser) must appear in the built command."""
        cfg = get_model_config("qwen3.5-27b")
        cmd = build_vllm_command(cfg, num_gpus=1)
        joined = " ".join(cmd)
        assert "--reasoning-parser" in joined
        assert "qwen3" in joined
