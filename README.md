# Interactive Summary Extraction

LLM-based map-reduce summary extractor for 300K+ interactive educational content folders. Extracts a 3-line Korean summary and up to 10 keywords from each content folder using a local LLM via vLLM.

## How It Works

```
Content Folder
  -> Stage 1: Discover text files + LLM-inferred reading order
  -> Stage 2: Summarize each file individually (map)
  -> Stage 3: Merge all summaries into 3-line summary + keywords (reduce)
  -> Stage 4: Save JSON output
```

Each content folder contains mixed files (HTML, JS, CSS, JSON, images, Flash, etc.). The pipeline reads all text-decodable files, skips binary, and lets the LLM handle content filtering — no rule-based pre-processing.

Context overflow is self-correcting: files too large for the context window are automatically chunked, summarized per-chunk, and merged. The reduce stage falls back to pairwise tree merge if all summaries combined exceed the window.

### Model

| Model | HuggingFace ID | Context | VRAM (FP8) | License |
|---|---|---|---|---|
| Qwen3.5-27B | `Qwen/Qwen3.5-27B-FP8` | 262K tokens | ~31 GB | Apache 2.0 |

> On H100 80GB, `max-model-len` is set to 65536 (not 262K) to leave room for KV cache and inference. Files exceeding this limit are automatically chunked.

### Output

One JSON per content folder at `<output-dir>/<model>/<content_id>.json`:

```json
{
  "content_id": "2018sah401_0301_0607",
  "model": "qwen3.5-27b",
  "summary": "첫째 줄. 둘째 줄. 셋째 줄",
  "keywords": ["키워드1", "키워드2"]
}
```

Binary-only content folders (Flash SWF, images only) are logged to `<output-dir>/skipped_contents.json`.

---

## Running on RunPod

### Pod Spec

| Setting | Value | Notes |
|---|---|---|
| **GPU** | 1x H100 80GB SXM | ~31 GB for model, ~43 GB for KV cache, native FP8 support |
| **Container Disk** | 30 GB | OS + venv + code (rebuilt each pod) |
| **Network Volume** | 120 GB | Model weights + repo (persists across pods) |
| **Template** | PyTorch 2.x / CUDA 12.x | Standard RunPod template |

> Network Volume mounts at `/workspace`. Model weights are cached at `/workspace/.cache/huggingface`. The venv is placed on local container disk (`/tmp/`) to avoid MFS filesystem issues.

---

### First-Time Setup (New Network Volume)

```bash
# 1. Clone repo (GitLab blocks cloud IPs, use GitHub)
cd /workspace
git clone https://github.com/Hoonieboogie/interactive_summary_extraction.git
cd interactive_summary_extraction

# 2. Install dependencies (~5 min, model weights download on first run ~15 min)
bash pipeline/setup_runpod.sh
source ~/.bashrc
```

### Pod Recreation (Existing Network Volume)

Code and model weights persist on `/workspace`. Only the container environment (uv, venv, shell config) is lost.

```bash
cd /workspace/interactive_summary_extraction
git pull
bash pipeline/setup_runpod.sh    # ~2 min (model weights already cached)
source ~/.bashrc
```

### Verify Installation

The setup script runs this automatically, but you can re-check anytime:

```bash
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2
uv run python -c "
import torch
print(f'CUDA: {torch.cuda.is_available()}')
print(f'GPU:  {torch.cuda.get_device_name(0)}')
print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')

import vllm; print(f'vLLM: {vllm.__version__}')
import httpx; print(f'httpx: {httpx.__version__}')
import charset_normalizer; print(f'charset-normalizer: {charset_normalizer.__version__}')
print('All dependencies OK')
"
```

If CUDA is `False` or any import fails, re-run `bash pipeline/setup_runpod.sh`.

---

### Running the Pipeline

Use two terminals: one for the vLLM server, one for the pipeline.

**Terminal 1 — Start vLLM server:**

```bash
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2
uv run python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen3.5-27B-FP8 \
    --max-model-len 65536 \
    --host 0.0.0.0 --port 8000
```

Wait for `Application startup complete` (2-5 min). Keep this terminal open.

**Terminal 2 — Run pipeline:**

```bash
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2

# All content folders
uv run main.py --content-dir ../../sample_contents --output-dir ./results --skip-server

# Specific folders only
uv run main.py --content-dir ../../sample_contents --output-dir ./results --skip-server \
    --content-ids 2018sah401_0301_0607 2026_kuk_501_0202_0203
```

> `--skip-server` tells the pipeline to use the already-running server. Keep the server running between pipeline runs to avoid the 2-5 min startup each time.

#### CLI Reference

```
uv run main.py --content-dir <path>           # Required: root of content folders
               --output-dir <path>            # Default: ./results
               --model <name>                 # Default: qwen3.5-27b
               --content-ids <id> [id ...]    # Process specific folders (default: all)
               --num-gpus <N>                 # Default: 1 (tensor parallelism)
               --skip-server                  # Use existing vLLM server
```

---

### Monitoring

#### GPU and vLLM

```bash
watch -n 1 nvidia-smi                          # GPU memory & utilization
curl -s http://localhost:8000/v1/models         # Check if server is ready
```

#### Pipeline logs

The pipeline logs to stderr with timestamps:

```
INFO  Processing: <content_id>          # Starting a content folder
INFO  <path>: cannot read as text ...   # Binary file skipped (expected)
INFO  Skipped <id>: no text-readable    # Entire folder is binary
INFO  File <path> overflows context...  # Chunking triggered (self-correcting)
INFO  Done: <content_id>               # Content folder complete
```

#### Results

```bash
# Watch results appear
ls results/qwen3.5-27b/

# Read a result
cat results/qwen3.5-27b/<content_id>.json | python3 -m json.tool

# Check skipped (binary-only) contents
cat results/skipped_contents.json 2>/dev/null | python3 -m json.tool

# Count: processed vs skipped
echo "Processed: $(ls results/qwen3.5-27b/*.json 2>/dev/null | wc -l)"
```

---

## Running Tests

```bash
cd pipeline/pipeline_v2
uv sync --dev
uv run pytest -v
```

62 tests covering all stages, with mocked LLM calls.

---

## Project Structure

```
pipeline/pipeline_v2/
├── main.py                  # CLI entry point + orchestrator
├── config.py                # Model configs (dataclass-based)
├── json_parser.py           # Lenient JSON parser for LLM responses
├── llm_client.py            # vLLM HTTP client + ContextOverflowError
├── server.py                # vLLM server start/stop/health
├── stage1_discovery.py      # File discovery + encoding auto-detect
├── stage1_ordering.py       # LLM-inferred reading order
├── stage2_map.py            # Per-file summarization + chunking
├── stage3_reduce.py         # Recursive merge + pairwise fallback
├── stage4_output.py         # JSON output + skipped content log
├── pyproject.toml           # Dependencies (uv)
├── docs/
│   ├── 2026-03-11-pipeline-v2-design.md   # Design specification
│   └── 2026-03-11-pipeline-v2-plan.md     # Implementation plan
└── tests/                   # 62 tests
    ├── test_json_parser.py
    ├── test_config.py
    ├── test_llm_client.py
    ├── test_stage1_discovery.py
    ├── test_stage1_ordering.py
    ├── test_stage2_map.py
    ├── test_stage3_reduce.py
    ├── test_stage4_output.py
    ├── test_main.py
    └── test_integration.py

pipeline/
└── setup_runpod.sh          # RunPod setup script

sample_contents/             # Sample educational content folders for testing
```

---

## Known Limitations

| Gap | Reason | Future Approach |
|---|---|---|
| Flash binary (SWF/FLA) | Text compiled in binary | Flash decompiler or Vision LLM |
| Image-only content | Text baked into images | Vision LLM |
| Audio-only content | Narration without transcript | Speech-to-text (Whisper) |

These are logged to `skipped_contents.json` for future processing.
