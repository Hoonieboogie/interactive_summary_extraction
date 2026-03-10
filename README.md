# Interactive Summary Extraction — Pipeline v5.0

LLM-first universal summary extractor for 300K+ interactive educational contents.
Runs 3 local LLMs on a single H100 80GB GPU via vLLM, compares results side-by-side.

---

# How to Run the Project on Runpod

## Context

The GitLab server (`git.i-screammedia.com`) blocks cloud/datacenter IP ranges, so you cannot clone directly from Runpod. Instead, clone locally on your Mac and transfer via SCP.

---

## Prerequisites

- SSH public key already generated on your Mac (`~/.ssh/id_ed25519.pub`)
- Runpod pod deployed with **public IP / exposed TCP** enabled
- **GPU**: 1x H100 80GB (or A100 80GB)
- **Template**: PyTorch 2.x / CUDA 12.x
- **Disk**: 100GB+ (for model weights)

---

## Step 1 — Add SSH Key to Runpod

1. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. Go to Runpod web UI → **Settings → SSH Public Keys**
3. Paste the key and save

---

## Step 2 — Get SSH Connection Details

1. Go to your pod in the Runpod dashboard
2. Click **Connect**
3. Copy the **"SSH over exposed TCP (Supports SCP & SFTP)"** command
   - It looks like: `ssh root@<ip> -p <port> -i ~/.ssh/id_ed25519`

---

## Step 3 — Clone and Archive the Repo (on your Mac)

```bash
git clone https://HoonHan:<TOKEN>@git.i-screammedia.com/hoonhan/interactive_summary_extraction.git
COPYFILE_DISABLE=1 tar czf repo.tar.gz interactive_summary_extraction
```

---

## Step 4 — Transfer to Runpod via SCP (on your Mac)

```bash
scp -P <port> -i ~/.ssh/id_ed25519 repo.tar.gz root@<ip>:/workspace/
```

Replace `<port>` and `<ip>` with the values from Step 2.

---

## Step 5 — Extract and Install on Runpod

SSH into your pod first:
```bash
ssh root@<ip> -p <port> -i ~/.ssh/id_ed25519
```

Then on Runpod:
```bash
cd /workspace
tar xzf repo.tar.gz --no-same-owner
cd interactive_summary_extraction

# Run setup script (installs uv, dependencies, vLLM)
bash pipeline/setup_runpod.sh
```

---

## Step 6 — Run Pipeline

```bash
cd pipeline

# Run all 3 models (sequential: EXAONE → Qwen3 → Qwen3.5)
uv run main.py --content-dir ../sample_contents --output-dir ./results

# Run a single model
uv run main.py --content-dir ../sample_contents --output-dir ./results --models qwen3-32b

# Available models: exaone4-32b, qwen3-32b, qwen3.5-35b-a3b
```

---

## Step 7 — View Results

```bash
# Terminal: comparison table printed automatically
# HTML: open in browser
cat ./results/comparison.html
# Or copy to local machine and open in browser
```

---

## Notes

- The `channel XX: open failed` messages when SSHing are harmless — ignore them.
- Every time you spin up a **new pod**, you need to repeat Steps 4–5 since pods don't persist data by default. Consider using a **Runpod Network Volume** if you want persistent storage.
- SCP only works on pods with **exposed TCP / public IP**. Basic SSH (proxied) does not support SCP.

---

# Pipeline Details

## Overview

```
Content Folder → Pre-filter → vLLM (Model) → JSON Summary → Comparison Report
```

**Stage 1 — Pre-filter**: Reads all text-based files (.html, .js, .json, .asp, .xml, etc.).
Strips SVG, CSS, comments, inline styles, and code lines.
Keeps natural language text in any language.

**Stage 2 — LLM Synthesis**: Sends pre-filtered content to each model via vLLM HTTP API.
Models run sequentially (one at a time, FP8 quantization).

**Stage 3 — Comparison**: Terminal table (Rich) + HTML report with all model outputs side-by-side.

## Models

| Model | Params (Active) | Context | Korean | License |
|---|---|---|---|---|
| EXAONE 4.0 32B | 32B | 128K | Best | Non-commercial |
| Qwen3-32B | 32.8B | 32K (131K) | Good | Apache 2.0 |
| Qwen3.5-35B-A3B | 35B (3B) | 256K | Good | Apache 2.0 |

## CLI Options

```
uv run main.py --content-dir <path>    # Required: path to content folders
               --output-dir <path>     # Default: ./results
               --models <name> [name]  # Default: all three models
               --skip-server           # Use existing vLLM server (don't start/stop)
```

## Output

- `results/<model-name>.json` — Per-model results (summary, tokens, latency)
- `results/comparison.html` — Side-by-side HTML report

## Project Structure

```
pipeline/
├── main.py            # Orchestrator
├── prefilter.py       # Universal content pre-filter
├── synthesizer.py     # vLLM server management + HTTP client
├── compare.py         # Terminal + HTML report generator
├── config.py          # Model configs, prompt template
├── setup_runpod.sh    # One-time RunPod setup
├── pyproject.toml     # Python dependencies (uv)
└── tests/             # 45 tests
```

## Running Tests

```bash
cd pipeline
uv sync --dev
uv run pytest -v
```
