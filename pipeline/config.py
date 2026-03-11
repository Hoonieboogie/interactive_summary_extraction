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
            "--max-model-len", "32768",
            "--gpu-memory-utilization", "0.95",
        ],
        description="EXAONE 4.0 32B (LG AI Research, Korean-optimized)",
    ),
    ModelConfig(
        name="qwen3-32b",
        model_id="Qwen/Qwen3-32B",
        vllm_args=[
            "--dtype", "auto",
            "--max-model-len", "32768",
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
            "--max-model-len", "32768",
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
MAX_CONTENT_CHARS = 80_000  # Safety truncation limit for 32K token context (~2.5 chars/token for Korean)
