# Pipeline v5.0 — Implementation Summary

## Architecture

Sequential 3-model comparison on H100 80GB GPU (single or multi-GPU with tensor parallelism).
Each model is loaded via vLLM as a subprocess, processes all content, then unloads.

```
For each model:
  1. Start vLLM server (subprocess, localhost:8000, optional --tensor-parallel-size)
  2. Pre-filter all content folders (cached, done once)
  3. Send each content via HTTP POST to /v1/chat/completions
  4. Save results as JSON
  5. Kill vLLM process
Generate comparison report (terminal + HTML)
```

## Models

| Model | HuggingFace ID | Type | Active Params | Precision | VRAM | vLLM Version |
|---|---|---|---|---|---|---|
| EXAONE 4.0 32B | `LGAI-EXAONE/EXAONE-4.0-32B` | Dense | 32B | BF16 (FP8 not supported) | ~60 GB | >= 0.10.0 |
| Qwen3-32B | `Qwen/Qwen3-32B` | Dense | 32.8B | FP8 | ~33 GB | >= 0.8.4 |
| Qwen3.5-35B-A3B | `Qwen/Qwen3.5-35B-A3B` | MoE+DeltaNet | 3B | FP8 | ~35 GB | Nightly only |

**EXAONE 4.0**: Non-commercial license. Best Korean benchmarks (KMMLU-Redux 72.7). Requires transformers >= 4.54.0.

**Qwen3-32B**: Apache 2.0. Thinking/non-thinking mode (pipeline uses non-thinking for speed). 32K native context, 131K with YaRN.

**Qwen3.5-35B-A3B**: Apache 2.0. Novel architecture (Gated DeltaNet + 256 experts, 8 active per token). Dramatically faster inference (3B active params). Requires vLLM nightly.

## Pre-filter Design

**Language-agnostic**: Educational content detected by natural language density (multi-word phrases in any script + CJK characters), not by any specific language.

**Format-agnostic**: Reads all text-based formats — .html, .htm, .js, .json, .asp, .xml, .txt, .csv, .php, .jsp. No directory-name or file-name assumptions (except .min.js and node_modules).

### Filtering Pipeline (per file)

1. Strip `<!-- comments -->`
2. Strip `<svg>...</svg>` blocks
3. Strip `<style>...</style>` blocks
4. Strip SVG `d="..."` path data
5. Strip `style="..."` inline attributes
6. **Mega-line extraction** (>50K chars): extract only quoted strings with natural language
7. **Long-line stripping** (>500 chars): drop lines without natural language
8. **File-level density check**: include only if natural language density >= 5%

### Content Format Coverage (355,883 interactive contents)

| Format | Count | % | Status |
|---|---|---|---|
| swf | 133,161 | 37.42% | Partial — reads companion text files, flags if binary-only |
| html | 116,687 | 32.79% | Fully handled |
| fla | 74,318 | 20.88% | Partial — same as swf |
| asp | 19,141 | 5.38% | Handled (.asp in target extensions) |
| (null) | 12,533 | 3.52% | Best-effort |
| mp4/ai/sw/f4v/etc | <40 | <0.01% | Not handled (binary) |

**SWF/FLA gap**: 58% of content is Flash (binary). Pipeline outputs empty result and flags these. Future approach: Flash decompilation tool or Vision LLM on rendered screenshots.

### Universality

The pre-filter approach is universal for all **text-based web content** because it targets web fundamentals common to every engine: HTML/CSS/SVG stripping and NL density detection in JS/JSON strings. The LLM handles remaining engine-specific noise (UI labels, nav text) without per-engine code.

**Known gaps** (require different Stage 1 input — Stages 2-3 stay the same):

| Gap | % of Content | Reason | Future Approach |
|---|---|---|---|
| Flash binary (SWF/FLA) | 58% | Text compiled in binary | Flash decompiler or Vision LLM |
| Image-only content | Unknown | Text baked into images/diagrams | Vision LLM |
| Audio-only content | Unknown | Narration without transcript | Speech-to-text (Whisper) |
| Obfuscated JS | Unknown | Encoded/encrypted strings bypass NL detection | Not seen in practice yet |

## Module Details

### `prefilter.py`
- `strip_svg()`, `strip_css()`, `strip_inline_styles()`, `strip_comments()`, `strip_svg_paths()` — regex-based strippers
- `strip_long_minified_lines()` — handles mega-lines and code lines
- `_has_natural_language()` — detects multi-word phrases or CJK in any language
- `_count_natural_lang_chars()` — counts letters in multi-word phrases + CJK chars
- `prefilter_folder()` — walks directory, filters per file, includes by NL density

### `synthesizer.py`
- `build_messages()` — constructs system + user chat messages, truncates at 200K chars
- `parse_llm_response()` — extracts JSON summary, handles markdown fences, `<think>` tags, plain text fallback
- `call_llm()` — async HTTP POST to vLLM, returns summary + metrics
- `VLLMServer` — manages vLLM subprocess (start with health check + spinner, stop with graceful termination, optional `num_gpus` for tensor parallelism)

### `compare.py`
- `print_terminal_report()` — Rich table with model columns, latency/token stats
- `generate_html_report()` — single-file HTML with per-sample cards, low-text flagging, totals table

### `config.py`
- `ModelConfig` dataclass — name, model_id, vllm_args, description
- `MODELS` — list of 3 model configs (EXAONE BF16, Qwen models FP8, max-model-len 32768)
- `SYSTEM_PROMPT` — Korean 3-line summary extraction prompt
- Constants: `VLLM_PORT=8000`, `MAX_TOKENS=512`, `TEMPERATURE=0`, `MAX_CONTENT_CHARS=80000`

### `main.py`
- `discover_contents()` — finds content subdirectories
- `prefilter_all()` — pre-filters all content (runs once, shared across models)
- `process_model()` — async: starts vLLM, processes all content, saves JSON, stops vLLM
- `main()` — CLI entry point with argparse (`--content-dir`, `--output-dir`, `--models`, `--num-gpus`, `--skip-server`)

## Test Coverage

45 tests across 4 test files:
- `test_prefilter.py` — 30 tests (stripping, NL detection, folder filtering, multi-language)
- `test_synthesizer.py` — 8 tests (message building, response parsing, API calls with mocks)
- `test_compare.py` — 3 tests (terminal output, HTML generation)
- `test_integration.py` — 4 tests (real sample content, NL preserved, sizes reasonable)

## Dependencies

Pipeline dependencies (in `pyproject.toml`):
- `httpx>=0.28` — async HTTP client for vLLM API
- `rich>=13.0` — terminal table rendering
- `jinja2>=3.1` — HTML report templating

vLLM installed separately (not a pipeline dependency):
```bash
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly
```
