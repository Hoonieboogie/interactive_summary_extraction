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
