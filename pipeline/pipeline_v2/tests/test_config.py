import pytest
from config import ModelConfig, get_model_config, MODELS


class TestModelConfig:
    def test_default_model_exists(self):
        cfg = get_model_config("qwen3.5-27b")
        assert cfg.name == "qwen3.5-27b"
        assert cfg.hf_id == "Qwen/Qwen3.5-27B-FP8"

    def test_unknown_model_raises(self):
        with pytest.raises(ValueError, match="Unknown model"):
            get_model_config("nonexistent-model")

    def test_model_has_required_fields(self):
        cfg = get_model_config("qwen3.5-27b")
        assert isinstance(cfg.max_model_len, int)
        assert isinstance(cfg.vllm_args, list)

    def test_models_dict_not_empty(self):
        assert len(MODELS) >= 1

    def test_qwen35_has_reasoning_parser(self):
        """Qwen3.5 is a reasoning model — vLLM must separate thinking from content."""
        cfg = get_model_config("qwen3.5-27b")
        assert "--reasoning-parser" in cfg.vllm_args
        parser_idx = cfg.vllm_args.index("--reasoning-parser")
        assert cfg.vllm_args[parser_idx + 1] == "qwen3"
