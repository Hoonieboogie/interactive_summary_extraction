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
| **GPU** | 1x A100 80GB SXM | Qwen3.5-27B-FP8 uses ~31 GB; ~49 GB left for KV cache |
| **Container Disk** | 30 GB | OS + venv + code (rebuilt each pod) |
| **Network Volume** | 120 GB | Model weights + repo (persists across pod restarts) |
| **Template** | PyTorch 2.x / CUDA 12.x | Standard RunPod template |

> The Network Volume is mounted at `/workspace`. Model weights are cached at `/workspace/.cache/huggingface` so they survive pod termination. The venv is placed on local container disk to avoid MFS filesystem issues.

---

### Step 1 — Clone the Repo

The GitLab server blocks cloud IPs, so clone from GitHub on RunPod:

```bash
cd /workspace
git clone https://github.com/Hoonieboogie/interactive_summary_extraction.git
cd interactive_summary_extraction
```

To pull updates later:
```bash
cd /workspace/interactive_summary_extraction && git pull
```

---

### Step 2 — Run Setup

```bash
bash pipeline/setup_runpod.sh
source ~/.bashrc
```

This installs uv, Python dependencies, and vLLM. Takes ~5 minutes on first run. Model weights are downloaded on first pipeline execution (~15 GB for FP8).

**What the setup script does:**
1. Sets `UV_LINK_MODE=copy` (RunPod MFS doesn't support hardlinks)
2. Routes HuggingFace cache to `/workspace/.cache/huggingface` (persists across pods)
3. Symlinks `.venv` to `/tmp/` (avoids MFS stale file handle errors)
4. Installs uv, pipeline deps, and vLLM nightly
5. Verifies CUDA, GPU, and all dependencies

---

### Step 3 — Run the Pipeline

```bash
cd pipeline/pipeline_v2

# Run all content folders
uv run main.py --content-dir ../../sample_contents --output-dir ./results

# Run specific content folders only
uv run main.py --content-dir ../../sample_contents --output-dir ./results \
    --content-ids 2018sah401_0301_0607 2026_kuk_501_0202_0203

# Use an already-running vLLM server (skip auto-start)
uv run main.py --content-dir ../../sample_contents --output-dir ./results --skip-server
```

#### CLI Reference

```
uv run main.py --content-dir <path>           # Required: root of content folders
               --output-dir <path>            # Default: ./results
               --model <name>                 # Default: qwen3.5-27b
               --content-ids <id> [id ...]    # Process specific folders (default: all)
               --num-gpus <N>                 # Default: 1 (tensor parallelism)
               --skip-server                  # Don't start/stop vLLM server
```

---

### Step 4 — Monitor Progress

Open a second terminal (RunPod web terminal or SSH) to monitor.

#### What happens when you run the pipeline

| Phase | What to watch | Duration |
|---|---|---|
| vLLM server start | Model loads into GPU memory | 2-5 min (first run downloads weights: ~15 min) |
| Stage 1: Discovery | Files discovered, ordering LLM call | < 1 min per content |
| Stage 2: Map | Per-file LLM calls (one per readable file) | 1-30 sec per file |
| Stage 3: Reduce | Merge all summaries into final result | < 1 min per content |
| Stage 4: Output | JSON written to disk | Instant |

#### GPU and vLLM monitoring

```bash
# GPU memory & utilization — watch model load into VRAM (~31 GB)
watch -n 1 nvidia-smi

# Check if vLLM server is ready (returns model list when ready)
curl -s http://localhost:8000/v1/models | python3 -m json.tool

# Poll until server is ready
watch -n 5 'curl -s http://localhost:8000/v1/models 2>/dev/null && echo "READY" || echo "Loading..."'

# Check vLLM process
ps aux | grep vllm
```

#### Model weight download (first run only)

```bash
# Watch download progress (~15 GB for Qwen3.5-27B-FP8)
watch -n 5 'du -sh /workspace/.cache/huggingface/hub/ 2>/dev/null'
```

#### Pipeline log output

The pipeline logs to stderr with timestamps. Key log messages to watch:

```
INFO  Processing: <content_id>          # Starting a content folder
INFO  <path>: cannot read as text ...   # Binary file skipped (expected)
INFO  Skipped <id>: no text-readable    # Entire folder is binary (logged to skipped_contents.json)
INFO  File <path> overflows context...  # File too large, chunking (self-correcting)
INFO  Summaries overflow context...     # Reduce overflow, pairwise merge (self-correcting)
INFO  Done: <content_id>               # Content folder complete
```

#### Disk and results

```bash
# Check disk space
df -h /workspace

# Watch results appear
watch -n 5 'ls -la pipeline/pipeline_v2/results/qwen3.5-27b/ 2>/dev/null'

# Read a result
cat pipeline/pipeline_v2/results/qwen3.5-27b/<content_id>.json | python3 -m json.tool

# Check skipped contents
cat pipeline/pipeline_v2/results/skipped_contents.json 2>/dev/null | python3 -m json.tool
```

---

### Step 5 — View Results

```bash
# List all result files
ls results/qwen3.5-27b/

# View a specific result
cat results/qwen3.5-27b/2018sah401_0301_0607.json

# View skipped (binary-only) contents
cat results/skipped_contents.json

# Count: processed vs skipped
echo "Processed: $(ls results/qwen3.5-27b/*.json 2>/dev/null | wc -l)"
echo "Skipped: $(python3 -c "import json; print(len(json.load(open('results/skipped_contents.json'))))" 2>/dev/null || echo 0)"
```

---

### After Terminating a Pod (Pod Recreation)

When you create a new pod with the **same Network Volume**, code and model weights are still on `/workspace`. Only the container environment (uv, venv, shell config) is lost.

```bash
# 1. Pull latest code
cd /workspace/interactive_summary_extraction
git pull

# 2. Re-run setup (re-installs uv + venv; model weights already cached)
bash pipeline/setup_runpod.sh
source ~/.bashrc

# 3. Run pipeline
cd pipeline/pipeline_v2
uv run main.py --content-dir ../../sample_contents --output-dir ./results
```

Setup is faster on pod recreation (~2 min) because model weights don't need re-downloading.

---

## Running Tests

```bash
cd pipeline/pipeline_v2
uv sync --dev
uv run pytest -v
```

61 tests covering all stages, with mocked LLM calls.

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
└── tests/                   # 61 tests
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
└── setup_runpod.sh          # One-time RunPod setup script

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
