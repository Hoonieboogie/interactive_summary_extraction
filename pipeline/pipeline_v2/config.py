"""Model configuration. Add new models here as dataclass entries."""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ModelConfig:
    name: str
    hf_id: str
    max_model_len: int
    vllm_args: list[str] = field(default_factory=list)


MODELS: dict[str, ModelConfig] = {
    "qwen3.5-27b": ModelConfig(
        name="qwen3.5-27b",
        hf_id="Qwen/Qwen3.5-27B-FP8",
        max_model_len=262144,
        vllm_args=[],
    ),
}

DEFAULT_MODEL = "qwen3.5-27b"


def get_model_config(name: str) -> ModelConfig:
    if name not in MODELS:
        raise ValueError(f"Unknown model: {name!r}. Available: {list(MODELS.keys())}")
    return MODELS[name]
