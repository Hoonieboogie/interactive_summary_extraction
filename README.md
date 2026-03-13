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
| **Template** | PyTorch 2.x / CUDA 12.x | Standard RunPod template (setup script upgrades to CUDA 12.8) |

> Network Volume mounts at `/workspace`. Model weights are cached at `/workspace/.cache/huggingface`. The venv is placed on local container disk (`/tmp/`) to avoid MFS filesystem issues.
>
> **CUDA 12.8+ required**: Qwen3.5 uses GDN (Gated Delta Network) attention, which requires flashinfer 0.6.4+, which in turn requires CUDA 12.8+ for PTX APIs. The setup script automatically upgrades from the pod's default CUDA 12.4 to 12.8.

---

### First-Time Setup (New Network Volume)

**Step 1 — Clone repo:**
```bash
cd /workspace && git clone https://github.com/Hoonieboogie/interactive_summary_extraction.git && cd interactive_summary_extraction
```

**Step 2 — Install pipeline dependencies + CUDA 12.8 (~5 min, model weights download on first run ~15 min):**
```bash
bash pipeline/setup_runpod.sh && source ~/.bashrc
```

**Step 3 — Install Claude Code + SSH key + git config:**
```bash
bash pipeline/setup_claude.sh
```

> On first run, this generates a new SSH key. Add the printed public key to GitHub → Settings → SSH Keys.

---

### Pod Recreation (Existing Network Volume)

Code and model weights persist on `/workspace`. Only the container environment (uv, venv, shell config) is lost.

**Step 1 — Pull latest code and install dependencies:**
```bash
cd /workspace/interactive_summary_extraction && git pull && bash pipeline/setup_runpod.sh && source ~/.bashrc
```

**Step 2 — Install Claude Code + restore SSH key:**
```bash
bash pipeline/setup_claude.sh
```

> SSH key is automatically restored from network volume. No need to add a new key to GitHub.

---

### Verify Installation

The setup script runs this automatically. Re-check anytime:

```bash
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2 && uv run python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0)}'); print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB'); import vllm; print(f'vLLM: {vllm.__version__}'); print('OK')"
```

If CUDA is `False` or any import fails, re-run `bash pipeline/setup_runpod.sh && source ~/.bashrc`.

---

### Install tmux

RunPod pods don't include tmux by default. Install it to run the server and pipeline in separate terminals:

```bash
apt update && apt install -y tmux
```

---

### Running the Pipeline

Use two terminals (e.g., tmux panes): one for the vLLM server, one for the pipeline.

**Terminal 1 — Start vLLM server:**

```bash
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2 && uv run python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3.5-27B-FP8 --max-model-len 65536 --host 0.0.0.0 --port 8000 --reasoning-parser qwen3
```

Wait for `Application startup complete` (~1-3 min). Keep this terminal open.

**Terminal 2 — Run pipeline:**

```bash
# All content folders
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2 && uv run main.py --content-dir ../../sample_contents --output-dir ./results --skip-server
```

```bash
# Specific folders only
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2 && uv run main.py --content-dir ../../sample_contents --output-dir ./results --skip-server --content-ids 2018sah401_0301_0607 2026_kuk_501_0202_0203
```

> `--skip-server` tells the pipeline to use the already-running server. Keep the server running between pipeline runs to avoid the startup time.

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

**Check GPU and server status:**
```bash
nvidia-smi
```

```bash
curl -s http://localhost:8000/v1/models
```

**Check results:**
```bash
ls results/qwen3.5-27b/
```

```bash
cat results/qwen3.5-27b/<content_id>.json | python3 -m json.tool
```

```bash
cat results/skipped_contents.json 2>/dev/null | python3 -m json.tool
```

**Pipeline logs** (stderr with timestamps):

```
INFO  Processing: <content_id>          # Starting a content folder
INFO  <path>: cannot read as text ...   # Binary file skipped (expected)
INFO  Skipped <id>: no text-readable    # Entire folder is binary
INFO  File <path> overflows context...  # Chunking triggered (self-correcting)
INFO  Done: <content_id>               # Content folder complete
```

---

## Running Tests

```bash
cd /workspace/interactive_summary_extraction/pipeline/pipeline_v2 && uv sync --dev && uv run pytest -v
```

83 tests covering all stages, with mocked LLM calls.

---

## Project Structure

```
├── pipeline/
│   ├── setup_runpod.sh              # RunPod setup (pipeline deps + CUDA 12.8)
│   ├── setup_claude.sh              # Claude Code + SSH key + git config
│   ├── pipeline_v1/                 # Legacy pipeline (deprecated)
│   └── pipeline_v2/                 # Current map-reduce pipeline
│       ├── main.py                  # CLI entry point + orchestrator
│       ├── config.py                # Model configs (--reasoning-parser qwen3)
│       ├── json_parser.py           # Lenient JSON parser for LLM responses
│       ├── llm_client.py            # vLLM HTTP client + ContextOverflowError
│       ├── server.py                # vLLM server start/stop/health
│       ├── stage1_discovery.py      # File discovery + encoding auto-detect
│       ├── stage1_ordering.py       # LLM-inferred reading order
│       ├── stage2_map.py            # Per-file summarization + chunking
│       ├── stage3_reduce.py         # Recursive merge + pairwise fallback
│       ├── stage4_output.py         # JSON output + skipped content log
│       ├── pyproject.toml           # Dependencies (uv)
│       ├── docs/                    # Design docs + plans
│       ├── results/                 # Pipeline output JSONs
│       └── tests/                   # 83 tests (mocked LLM calls)
├── pipeline_test/
│   └── run_test1/                   # First pipeline test run (2026-03-13)
│       ├── pipeline_run_observations.md  # Real-time monitoring notes
│       └── analysis.md              # Root cause analysis + action items
├── sample_contents/                 # Sample educational content folders
├── docs/
│   └── worklogs/                    # Daily work logs
└── CLAUDE.md                        # AI assistant instructions
```

---

## Known Limitations

| Gap | Reason | Future Approach |
|---|---|---|
| Flash binary (SWF/FLA) | Text compiled in binary | Flash decompiler or Vision LLM |
| Image-only content | Text baked into images | Vision LLM |
| Audio-only content | Narration without transcript | Speech-to-text (Whisper) |

These are logged to `skipped_contents.json` for future processing.
