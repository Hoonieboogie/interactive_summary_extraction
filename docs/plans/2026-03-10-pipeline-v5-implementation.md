# Pipeline v5.0 Implementation Design — 3-Model Comparison

**Date**: 2026-03-10
**Status**: Approved

## Summary

Build a Python pipeline using `uv` that runs on a single RunPod H100 80GB GPU.
It extracts educational summaries from interactive HTML content using 3 local LLMs
served sequentially via vLLM, then generates a side-by-side comparison report.

## Models Under Evaluation

| Model | HuggingFace ID | Type | Active Params | Context | Quantization | License |
|---|---|---|---|---|---|---|
| EXAONE 4.0 32B | `LGAI-EXAONE/EXAONE-4.0-32B` | Dense | 32B | 128K | FP8 | NC |
| Qwen3-32B | `Qwen/Qwen3-32B` | Dense | 32.8B | 32K (131K YaRN) | FP8 | Apache 2.0 |
| Qwen3.5-35B-A3B | `Qwen/Qwen3.5-35B-A3B` | MoE | 3B | 256K | FP8 | Apache 2.0 |

All three fit on 1x H100 80GB with FP8 (~32-35 GB weights, ~45-48 GB headroom).

## Architecture

```
sample_contents/
    ├── content_A/
    ├── content_B/
    └── ...

        │
        ▼
┌──────────────────────────┐
│  STAGE 1: PRE-FILTER     │  (runs once, cached)
│  prefilter.py            │
│                          │
│  For each content folder:│
│  - Read .html/.js/.json  │
│  - Strip SVG, CSS,       │
│    styles, comments      │
│  - Keep text + media refs│
│  - Output: cleaned text  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  STAGE 2: LLM SYNTHESIS  │  (runs 3 times, once per model)
│  synthesizer.py          │
│                          │
│  For each model:         │
│  1. Start vLLM server    │
│     (serve_model.sh)     │
│  2. Send pre-filtered    │
│     content via HTTP     │
│  3. Collect JSON results │
│  4. Stop vLLM server     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  STAGE 3: COMPARE        │
│  compare.py              │
│                          │
│  - Terminal: Rich table  │
│  - HTML: per-sample cards│
│    with all 3 outputs    │
└──────────────────────────┘
```

## vLLM Server Strategy

Each model runs as a **subprocess** via `serve_model.sh`:

```bash
# Start
vllm serve <model_id> \
    --dtype auto \
    --max-model-len 65536 \
    --gpu-memory-utilization 0.90 \
    --port 8000

# Pipeline waits for health check: GET /v1/models
# Pipeline processes all samples
# Pipeline kills the process
# Next model starts
```

### Model-Specific vLLM Flags

- **EXAONE 4.0 32B**: `--quantization fp8` (or use pre-quantized FP8 variant)
- **Qwen3-32B**: `--quantization fp8 --enable-reasoning --reasoning-parser deepseek_r1`
  - Pipeline sends with `enable_thinking=False` in chat template for speed
- **Qwen3.5-35B-A3B**: Requires vLLM nightly. `--quantization fp8`
  - Uses `qwen3_5_moe` architecture, supported in nightly builds

## Pre-filter Rules

**STRIP** (provably non-educational):
- `<svg>...</svg>` blocks (vector paths/coordinates)
- `<style>...</style>` blocks (CSS rules)
- `style="..."` inline attributes
- HTML comments `<!-- ... -->`
- SVG path data (`d="M0,0 V15..."`)
- Long minified JS lines (>500 chars with no Korean/educational text)

**KEEP** (may contain educational value):
- All Korean/English text content
- Image references (`src="..."`, base64 data URIs)
- Audio/video references (`.mp3`, `.mp4`, `mediaID`)
- JSON data structures (may contain educational metadata)
- File structure context

## LLM Prompt Template

```
너는 교육 콘텐츠 분석 전문가야.

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
{ "summary": "첫째 줄. 둘째 줄. 셋째 줄" }

[원본 텍스트]
{CONTENT}
```

## Project Structure

```
pipeline/
├── pyproject.toml         # uv project: metadata + dependencies
├── main.py                # Orchestrator: prefilter → synthesize → compare
├── prefilter.py           # Universal content pre-filter
├── synthesizer.py         # Async HTTP client for vLLM
├── compare.py             # Terminal table + HTML report generator
├── config.py              # Model definitions, prompt, paths
├── serve_model.sh         # Start vLLM server for a given model
└── results/               # Output: per-model JSON + comparison HTML
```

## Dependencies

```toml
[project]
name = "summary-extraction-pipeline"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "httpx>=0.28",
    "rich>=13.0",
    "jinja2>=3.1",
]
```

vLLM is installed separately on the RunPod pod (not a pipeline dependency):
```bash
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly
```

## RunPod Setup

```bash
# 1. Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Clone repo and install pipeline
git clone <repo-url> && cd interactive_summary_extraction/pipeline
uv sync

# 3. Install vLLM (globally, nightly for Qwen3.5 support)
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly

# 4. Run the pipeline
uv run main.py --content-dir ../sample_contents --output-dir ./results
```

## Output Format

### Per-model JSON (`results/<model_name>.json`)
```json
[
  {
    "content_id": "2026_kuk_501_0202_0203",
    "summary": "첫째 줄. 둘째 줄. 셋째 줄",
    "input_chars": 45230,
    "output_tokens": 87,
    "latency_ms": 1523,
    "timestamp": "2026-03-10T14:30:00Z"
  }
]
```

### Comparison HTML (`results/comparison.html`)
Single-file HTML with:
- Header: run metadata (date, models, GPU)
- Per-sample cards: content ID + 3 model outputs side-by-side
- Metadata: char count, token count, latency per model
- Color coding for flagged items (<100 chars text = likely image-heavy)

### Terminal output
Rich table with columns: Content ID | EXAONE 4.0 | Qwen3-32B | Qwen3.5-35B-A3B

## Risks Addressed

| Risk | Mitigation |
|---|---|
| Qwen3.5 needs vLLM nightly | Install from nightly wheels; if unstable, skip and note in report |
| Model startup takes 2-3 min | Expected; total ~9 min overhead for 3 models |
| Large content exceeds context | Pre-filter reduces to 30-50K tokens; truncate at 60K as safety net |
| vLLM OOM on FP16 | Use FP8 quantization for all models |
| Inconsistent JSON output | Retry once with stricter prompt if JSON parse fails |
