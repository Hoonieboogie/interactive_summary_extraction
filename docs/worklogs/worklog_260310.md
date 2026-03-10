# Work Log: Pipeline v5.0 Implementation & RunPod Deployment
**Date:** Monday, March 10, 2026
**Objective:** Design, implement, and deploy the LLM-first universal summary extraction pipeline (v5.0) on RunPod H100 GPU.

---

## Background: Why v5.0 (LLM-First) Over v4.0 (Per-Engine Parsing)

### The Problem with v4.0
After the March 9 work session, we had a working v4.0 architecture with per-engine plugin design:
- Stage 1: Forensics (detect engine type — Aspen, iSpring, unknown)
- Stage 2: Engine-specific distiller plugin (parse `data.js` for Aspen, `slide{N}.js` for iSpring, etc.)
- Stage 3: LLM synthesis (Gemini API)
- Stage 4: Report generation

**The core issue:** With 300K+ interactive contents spanning unknown/undocumented engine types, building per-engine parsers would take **months**. The March 9 session revealed that even adding one new engine (iSpring) required significant reverse-engineering effort. Scaling this to hundreds of unknown engine variants was impractical.

### The v5.0 Insight
**Skip engine detection entirely.** Since we're running local LLMs on H100 (no per-token cost), we can:
1. Pre-filter all text-based files universally (strip SVG, CSS, comments — these exist in ALL web content)
2. Pass the pre-filtered content directly to the LLM
3. Let the LLM ignore remaining noise (HTML tags, UI labels, code) and extract educational meaning

This covers **every engine type immediately** with zero parser development. v4.0's per-engine parsers remain valuable as a future optimization layer for high-volume engines, but v5.0 provides the baseline that covers everything in days instead of months.

---

## Part 1: Design & Planning (10:20 ~ 12:38)

### Pipeline v5.0 Design Document
- Created `docs/pipeline_v5_design.md` — conceptual architecture with 3 stages:
  1. **Universal Pre-filter**: Strip provably non-educational data (SVG, CSS, inline styles, comments) to fit context window
  2. **LLM Synthesis**: Local model via vLLM generates 3-line Korean summary as JSON
  3. **Report**: Per-model JSON + comparison report
- Key design decision: Pre-filter is NOT about cost savings (local inference = $0). It's about **fitting content into the context window** — raw Aspen `data.js` can be 1.6MB (~400K tokens), exceeding model context limits.

### 3-Model Comparison Design
- Created `docs/plans/2026-03-10-pipeline-v5-implementation.md` — detailed implementation plan
- Selected 3 models for evaluation on single H100 80GB:

| Model | Params | Context | Korean Capability | License | Quantization |
|---|---|---|---|---|---|
| EXAONE 4.0 32B | 32B (dense) | 128K | Best (KMMLU-Redux 72.7) | Non-commercial | BF16 (FP8 not supported) |
| Qwen3-32B | 32.8B (dense) | 32K (131K w/ YaRN) | Good | Apache 2.0 | FP8 |
| Qwen3.5-35B-A3B | 35B total / 3B active (MoE) | 256K | Good | Apache 2.0 | FP8 |

- Architecture: Sequential model loading — one model at a time on single GPU, process all contents, unload, load next model.

### Commits
- `620a6ed` (10:20) — New pipeline plan
- `e3c1f05` (11:21) — Pipeline v5.0 design document
- `95114d7` (12:20) — README with RunPod setup guide, pyproject.toml for vLLM
- `1b80ea7` (12:27) — 3-model comparison implementation plan
- `eeca78e` (12:38) — Align design doc structure with code

---

## Part 2: Implementation (13:29 ~ 13:42)

### Pipeline Code (Python, uv project)
Implemented the complete pipeline in rapid succession:

1. **`e0a6655` (13:29) — Project initialization**
   - `pyproject.toml` with dependencies: httpx, rich, jinja2
   - uv project setup

2. **`45f04cf` (13:31) — Universal pre-filter (`prefilter.py`)**
   - Regex-based strippers: SVG blocks, CSS blocks, inline styles, HTML comments, SVG path data
   - Natural language detection: multi-word phrase density + CJK character detection
   - Mega-line extraction: for minified JS files (>50K char lines), extract only quoted strings with NL
   - File-level density check: include file only if NL density >= 5%
   - Format-agnostic: reads .html, .js, .json, .asp, .xml, .txt, .csv, .php, .jsp

3. **`6c85642` (13:33) — Model configs & synthesizer (`config.py`, `synthesizer.py`)**
   - `ModelConfig` dataclass with vLLM args per model
   - `VLLMServer` class: subprocess management, health check polling, graceful shutdown
   - `call_llm()`: async HTTP POST to vLLM `/v1/chat/completions`
   - `parse_llm_response()`: JSON extraction handling markdown fences, `<think>` tags
   - System prompt: Korean 3-line educational summary format

4. **`5b38f75` (13:36) — Comparison report (`compare.py`)**
   - Terminal report via Rich table (model columns, latency, token stats)
   - HTML report via Jinja2 (single-file, per-sample cards, side-by-side comparison)

5. **`8b2e395` (13:37) — Orchestrator & RunPod setup (`main.py`, `setup_runpod.sh`)**
   - CLI: `--content-dir`, `--output-dir`, `--models`, `--skip-server`
   - Workflow: discover contents → pre-filter all (once) → process each model → comparison report
   - RunPod setup script: install uv, sync dependencies, install vLLM nightly

6. **`27584a8` (13:42) — Pre-filter improvements**
   - Skip framework directories (node_modules, .min.js)
   - Better extraction from mega-lines

7. **`87cee69` (13:42) — v5.0 complete, ready for RunPod**

### Post-Implementation Refinements
- `9b38196` (13:56) — Made pre-filter truly engine-agnostic (content-based NL density filter, no Korean-specific assumptions)
- `2e46a8c` (14:05) — Made pre-filter format-aware (reads all text-based file extensions)
- `88b2e34` (14:14) — Added README, IMPLEMENTATION.md, removed old Node.js v4 pipeline code

### Test Coverage
- 45 tests across 4 files:
  - `test_prefilter.py` (30 tests) — stripping, NL detection, folder filtering, multi-language
  - `test_synthesizer.py` (8 tests) — message building, response parsing, API calls with mocks
  - `test_compare.py` (3 tests) — terminal output, HTML generation
  - `test_integration.py` (4 tests) — real sample content end-to-end

---

## Part 3: RunPod Deployment — First Attempt (14:42 ~ 16:20)

### Initial Setup (SCP-based workflow)
Since GitLab (`git.i-screammedia.com`) blocks cloud/datacenter IP ranges, `git clone` doesn't work on RunPod. Established SCP-based transfer workflow:
1. Clone on Mac → tar.gz → SCP to RunPod → extract
- `ca086fd` (14:42) — RunPod deployment guide in README
- `3cac94a` (14:43) — Reorganized README (RunPod setup first)

### Issue 1: CRLF Line Endings
- **Symptom:** `\r': command not found` errors when running bash scripts on RunPod (Ubuntu)
- **Cause:** macOS created files with CRLF line endings; bash on Ubuntu can't parse them
- **Fix:** Converted all files to LF, added `.gitattributes` with `* text=auto eol=lf`
- `5f84d1b` (14:50)

### Issue 2: Zip File Corruption
- **Symptom:** `End-of-central-directory signature not found` when unzipping on RunPod
- **Cause:** zip format unreliable over SCP transfer
- **Fix:** Switched from zip to tar.gz
  - Mac: `COPYFILE_DISABLE=1 tar czf repo.tar.gz ...` (strips macOS `._` metadata files)
  - RunPod: `tar xzf repo.tar.gz --no-same-owner` (avoids uid 501 ownership warnings)
- `9ff72eb` (14:52), `b041060` (14:56)

### Issue 3: Python API Mismatch
- **Symptom:** `AttributeError: 'total_mem'` in setup_runpod.sh GPU verification
- **Fix:** Changed to `total_memory` (correct PyTorch API)
- `a4b759b` (15:05)

### Issue 4: Setup Script Reliability
- **Symptom:** Multiple errors: `uv: command not found`, `No module named 'vllm'`, verification step using bare `python` instead of `uv run python`
- **Root cause:** Script had accumulated one-by-one fixes instead of being holistically designed
- **Fix:** Complete rewrite of `setup_runpod.sh`:
  - Install uv, persist PATH to `~/.bashrc`
  - `uv sync` (clean dependencies from pyproject.toml)
  - `uv pip install vllm` (add vLLM on top)
  - All verification via `uv run python` (ensures correct virtualenv)
- `d5bfac4` (15:12), `81865c6` (15:22), `ceb52b8` (15:38)

### Issue 5: No Visual Progress Indicator
- **Symptom:** Pipeline runs with no visible progress during vLLM model loading (takes 3-10 min) or content processing
- **Fix:** Added Rich-based UI:
  - **Spinner** with elapsed time during vLLM model loading (polls `/v1/models` endpoint)
  - **Progress bar** with per-item status during content processing
  - vLLM error output displayed on failure (last 3000 chars) instead of being swallowed
- `6053f93` (15:43), `4fbdb50` (15:50)

### Issue 6: EXAONE 4.0 FP8 Not Supported
- **Symptom:** `RuntimeError` — vLLM server failed to start for EXAONE with `--quantization fp8`
- **Cause:** EXAONE 4.0 32B does not support FP8 quantization on current vLLM nightly
- **Fix:** Removed `--quantization fp8` from EXAONE config; runs in BF16 (~60 GiB, fits on H100 with `--gpu-memory-utilization 0.95`)
- **Note:** Qwen models still use FP8 (not yet tested on RunPod)
- `2633af7` (16:02)

### Issue 7: uv PATH Not Persisted Across Terminals
- **Symptom:** `uv: command not found` after opening new RunPod terminal
- **Fix:** Updated README to use `source $HOME/.local/bin/env` after setup
- `df03dc6` (16:16), `50013ac` (16:19)

---

## Part 4: GitHub Integration & Second RunPod Attempt (16:40 ~ 17:00)

### GitHub Remote Added
- Problem: SCP workflow is slow and error-prone for iterative fixes
- Solution: Added GitHub as second remote (`git@github.com:Hoonieboogie/interactive_summary_extraction.git`)
- SSH key (`~/.ssh/id_ed25519.pub`, originally for RunPod) added to GitHub
- Now pushing to both GitLab (`origin`) and GitHub (`github`) on each commit
- RunPod can `git clone` from GitHub directly — no more SCP
- `fb2d75e` (16:40)

### Health Check Timeout Fix
- **Symptom:** vLLM server was actually ready (confirmed via `curl http://localhost:8000/v1/models`) but the pipeline's health check timed out at 600s
- **Fix:**
  - Timeout increased 600s → 900s
  - Exception handling: catches `ReadTimeout` and `TimeoutException` in addition to `ConnectError`
  - Poll interval: 5s → 3s (faster detection)
  - Health check request timeout: 5s → 10s
- `891d72e` (16:49)

### RunPod Network Filesystem Issues
- **Symptom:** `Stale file handle (os error 116)` when uv installs packages on RunPod network volume (MFS)
- **Cause:** RunPod's network-mounted `/workspace` doesn't support hardlinks; uv uses hardlinks by default
- **Fix:** Added `export UV_LINK_MODE=copy` to `setup_runpod.sh`
- **Additional workaround:** Create venv on local disk (`/tmp/pipeline-venv`) and symlink to `/workspace`, since MFS is unreliable for large file operations
- `5166033` (16:56)

---

## Part 5: Current RunPod Deployment (In Progress)

### Pod Configuration
- **GPU:** 2x H100 80GB (upgraded from 1x)
- **Disk:** 200 GB container + 200 GB network volume
- **Template:** PyTorch 2.x / CUDA 13.0
- **Note:** Network volume pod does not support exposed TCP (no SCP), but GitHub clone works

### Deployment Steps Completed
1. `git clone` from GitHub on RunPod
2. Symlinked `.venv` to `/tmp/pipeline-venv` (local disk) to avoid MFS stale file handle errors
3. `setup_runpod.sh` completed successfully with `UV_LINK_MODE=copy`
4. Started pipeline: `uv run main.py --content-dir ../sample_contents --output-dir ./results --models exaone4-32b`

### Current Status
- EXAONE 4.0 32B is loading weights to GPU (BF16, ~60 GB)
- VRAM usage: 97% (expected — vLLM pre-allocates for KV cache)
- Disk usage: 74 GB (model weights cached in HuggingFace hub)
- **Pending:** First successful inference run; Qwen3-32B and Qwen3.5-35B-A3B not yet tested

---

## Summary of Commits (March 10, 2026)

| Time | Commit | Description |
|---|---|---|
| 10:20 | `620a6ed` | New pipeline plan (v4 → v5 direction) |
| 11:21 | `e3c1f05` | Pipeline v5.0 design document |
| 12:20 | `95114d7` | README + pyproject.toml |
| 12:27 | `1b80ea7` | 3-model comparison implementation plan |
| 12:38 | `eeca78e` | Align design doc with code structure |
| 13:29 | `e0a6655` | Initialize uv project |
| 13:31 | `45f04cf` | Universal pre-filter |
| 13:33 | `6c85642` | Model configs + synthesizer |
| 13:36 | `5b38f75` | Comparison report |
| 13:37 | `8b2e395` | Main orchestrator + RunPod setup |
| 13:42 | `27584a8` | Pre-filter improvements |
| 13:42 | `87cee69` | **v5.0 complete** |
| 13:56 | `9b38196` | Pre-filter: engine-agnostic NL density |
| 14:05 | `2e46a8c` | Pre-filter: format-aware extensions |
| 14:14 | `88b2e34` | README + IMPLEMENTATION.md |
| 14:42 | `ca086fd` | RunPod deployment guide |
| 14:43 | `3cac94a` | Reorganize README |
| 14:50 | `5f84d1b` | Fix CRLF line endings |
| 14:51 | `cef8a4a` | Quiet unzip |
| 14:52 | `9ff72eb` | Switch to tar.gz |
| 14:56 | `b041060` | Fix tar warnings |
| 15:05 | `a4b759b` | Fix total_memory API |
| 15:12 | `d5bfac4` | Rewrite setup_runpod.sh |
| 15:22 | `81865c6` | Normalize CRLF |
| 15:38 | `ceb52b8` | Persist uv PATH |
| 15:43 | `6053f93` | Spinner + progress bar |
| 15:50 | `4fbdb50` | Show vLLM error output |
| 16:02 | `2633af7` | Remove EXAONE FP8 |
| 16:16 | `df03dc6` | Source bashrc guide |
| 16:19 | `50013ac` | Use uv env script |
| 16:40 | `fb2d75e` | GitHub clone for RunPod |
| 16:49 | `891d72e` | Health check timeout 900s |
| 16:56 | `5166033` | UV_LINK_MODE=copy for MFS |

---

## Lessons Learned

1. **Mac → Linux deployment is full of traps**: CRLF line endings, macOS tar metadata (`._` files, xattr), zip corruption, uid ownership mismatches. Use `.gitattributes` + `COPYFILE_DISABLE=1` + `--no-same-owner`.

2. **uv virtualenv isolation matters**: Always use `uv run python` (not bare `python`). `uv sync` enforces pyproject.toml strictly (removes unlisted packages like vLLM), so vLLM must be installed separately with `uv pip install`.

3. **RunPod network volumes (MFS) don't support hardlinks**: Set `UV_LINK_MODE=copy` or use local disk for virtualenvs. Large installs on MFS are unreliable.

4. **vLLM model compatibility varies**: EXAONE 4.0 doesn't support FP8 quantization — runs in BF16 only. Always test each model's quantization support.

5. **Health checks need generous timeouts**: 32B model loading on H100 can take 10+ minutes (download + GPU transfer + CUDA graph compilation). 600s wasn't enough; increased to 900s.

6. **GitHub as second remote eliminates SCP**: Once code is on GitHub, RunPod can `git clone`/`git pull` directly. Much faster iteration than the tar.gz + SCP workflow.

---

## Next Steps

- [ ] Complete first successful inference run with EXAONE 4.0
- [ ] Test Qwen3-32B and Qwen3.5-35B-A3B on RunPod
- [ ] Evaluate summary quality across all 3 models
- [ ] Add `--tensor-parallel-size` GPU config for multi-GPU pods
- [ ] If single-model quality is good, proceed to Phase 2 (1,000 sample validation)
