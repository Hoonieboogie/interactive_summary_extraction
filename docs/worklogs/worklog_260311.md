# Work Log: Pipeline v2 Design & Implementation Plan
**Date:** Tuesday, March 11, 2026
**Objective:** Finalize the Pipeline v2 (map-reduce summarization) design document and write the implementation plan.

---

## Part 1: Design Finalization

### Context
Pipeline v1 (pre-filter + single LLM call) hits context window limits on large content folders. Pipeline v2 uses a map-reduce approach: summarize each file individually, then recursively merge into a final 3-line summary + keywords. This handles arbitrarily large content without truncation.

### Design Iterations
The design document went through 10+ rounds of comprehensive analysis. Key decisions made today:

1. **Simplified output format** — reduced to 4 fields: `content_id`, `model`, `summary`, `keywords`. Removed `file_summaries`, `total_files`, `llm_calls`, token counts, and latency.

2. **Zero-text-file routing** — binary-only content folders (Flash SWF, images) are logged to `skipped_contents.json` only. No output JSON produced. Clean separation: output JSON = processed content, skipped log = unprocessable content.

3. **All prompts defined** — five distinct prompts across the pipeline:
   - Per-file prompt (Stage 2): educational content detection + summary
   - Chunk prompt (Stage 2): plain text summary of file portion
   - Chunk merge prompt (Stage 2): combine chunks into file-level summary
   - Intermediate merge prompt (Stage 3): paragraph-length summary + keywords
   - Final merge prompt (Stage 3): 3-line summary + best 10 keywords from accumulated pool

4. **Single model per run** — `--model` (singular), not `--models`. Modular config via dataclass for future model additions.

5. **Qwen3.5-27B only** — replaced all 3 previous models. Dense 27B, 262K context, FP8 (~31GB), Apache 2.0, requires vLLM nightly.

6. **All summaries enter merge** — Stage 3 receives both educational and non-educational file summaries. No filtering.

7. **Odd-number pairwise merge** — last unpaired summary carries forward as-is (no extra LLM call).

### Renamed v6 → v2
File renamed from `pipeline-v6-design.md` to `pipeline-v2-design.md` to match the v1/v2 directory separation.

---

## Part 2: Implementation Plan

Wrote `pipeline/pipeline_v2/docs/2026-03-11-pipeline-v2-plan.md` — 13 tasks (Task 0–12) following TDD:

| Task | Component | Files |
|---|---|---|
| 0 | Scaffold project | `pyproject.toml`, `tests/__init__.py` |
| 1 | Lenient JSON parser | `json_parser.py` |
| 2 | Model config | `config.py` |
| 3 | LLM client | `llm_client.py` |
| 4 | Stage 1 — File discovery | `stage1_discovery.py` |
| 5 | Stage 1 — Sequence ordering | `stage1_ordering.py` |
| 6 | Stage 2 — Per-file summarization | `stage2_map.py` |
| 7 | Stage 3 — Recursive merge | `stage3_reduce.py` |
| 8 | Stage 4 — Output | `stage4_output.py` |
| 9 | vLLM server management | `server.py` |
| 10 | Main orchestrator | `main.py` |
| 11 | Integration test | `tests/test_integration.py` |
| 12 | Full test suite + push | — |

Each task: write failing test → implement → verify → commit.

---

## Commits

| Commit | Description |
|---|---|
| `9aee50d` | Initial pipeline v6.0 design document |
| `eadbacc` | Restructure into pipeline_v1 and pipeline_v2 |
| `0037c34` | Co-locate pipeline docs |
| `7603599` | Design: 9 fixes from re-analysis |
| `164daae` | Finalize design, rename v6 → v2 |

---

## Part 3: Implementation

Executed all 13 tasks from the plan. **61 tests, all passing.**

### Bugs Found & Fixed
1. **Plan bug**: `summarize_file` tests used `result = await ...` but function returns tuple — fixed to `result, responses = await ...`
2. **Binary detection**: Files with null bytes (SWF, FLA) passed UTF-8 decode — added null byte check in `_try_read_text`
3. **EUC-KR detection**: Short Korean text misdetected by charset-normalizer — used longer test strings
4. **Chunk splitting**: Test used `"x" * 1000` (no newlines) which can't split at newline boundaries — fixed to multi-line content
5. **pyproject.toml**: `[project.optional-dependencies]` not resolved by `uv sync --dev` — changed to `[dependency-groups]`

### Commits

| Commit | Description |
|---|---|
| `b9817d1` | Scaffold project with pyproject.toml |
| `cfc44a8` | Add lenient JSON parser |
| `7b857be` | Add modular model config |
| `1bd017b` | Add LLM client with context overflow detection |
| `70f95d0` | Add Stage 1 file discovery with encoding auto-detect |
| `b2e4a62` | Add Stage 1 sequence ordering with validation and fallback |
| `4c24c5b` | Add Stage 2 per-file summarization with chunking |
| `410e00b` | Add Stage 3 recursive merge with pairwise fallback |
| `cc449a3` | Add Stage 4 output and skipped content logging |
| `4f4ca8e` | Add vLLM server management |
| `41746ca` | Add main orchestrator with CLI |
| `5918994` | Add end-to-end integration test |

---

## Part 4: RunPod Deployment & Debugging

### README Rewrite
Rewrote `README.md` from scratch as a deployment guide covering:
- Pod spec (A100 80GB SXM, 30GB container disk, 120GB network volume)
- Step-by-step setup, run, and monitoring instructions
- Dependency verification commands
- Pod recreation workflow

### Setup Script Updates
Updated `pipeline/setup_runpod.sh` for v2:
- Correct directory (`pipeline_v2` not `pipeline_v1`)
- Stable vLLM (`uv pip install vllm`) — nightly was only needed for Qwen3.5-35B-A3B (MoE), not Qwen3.5-27B (dense)
- Dependency verification step

### Deployment Issues & Fixes

| Issue | Root Cause | Fix |
|---|---|---|
| vLLM nightly install fails | Only aarch64 wheels on nightly index; Qwen3.5-27B (dense) doesn't need nightly | Use stable vLLM |
| `server.py` subprocess can't find vLLM | Used bare `"python"` — system python has no vLLM | Changed to `sys.executable` to use uv venv python |
| OOM at `max_model_len=262144` | KV cache pre-allocation consumed 72/80 GiB VRAM, leaving no room for inference | Lowered to `65536` |
| A100 FP8 warning | A100 lacks native FP8 compute, uses Marlin kernel for weight-only decompression | Not an error, just info. Slightly slower than H100 |
| **Context overflow not detected** | vLLM returns flat `{"message": "..."}` but client parsed nested `{"error": {"message": "..."}}` — error message never matched, `ContextOverflowError` never raised, chunking never triggered | Fixed to check both formats: `body.get("message", "") or body.get("error", {}).get("message", "")` |
| **Chunking produces 1 chunk (no split)** | `INITIAL_CHUNK_SIZE = 500K` chars, but 65K tokens ≈ ~130-260K chars — files under 500K chars were never actually split on first attempt, causing 2 wasted 400 round-trips before halving kicked in | Derive from model config: `initial_chunk_size = max_model_len * 2` (~131K chars for 65K context) |

### Operational Notes
- vLLM server takes 2-5 min to start (loading ~15 GB weights from network volume to GPU)
- Keep vLLM server running between pipeline runs; use `--skip-server` flag
- Start server manually in terminal 1, run pipeline with `--skip-server` in terminal 2
- Throughput: ~48 tokens/s generation, ~1700-4700 tokens/s prompt processing

### Commits

| Commit | Description |
|---|---|
| `3861f38` | Rewrite README for pipeline v2, update setup script |
| `4e4981e` | Use stable vLLM instead of nightly |
| `20595cb` | Add dependency verification command to README |
| `56e54ac` | Use `sys.executable` for vLLM subprocess, lower max-model-len to 65K |
| `4481def` | Fix vLLM flat error format for context overflow detection |
| `a985fad` | Derive initial chunk size from model context window |

---

## Next Steps

- [x] Execute implementation plan (13 tasks, TDD)
- [x] Run full test suite (62/62 pass)
- [x] Deploy to RunPod (A100 80GB SXM)
- [x] Fix deployment issues (vLLM install, subprocess path, VRAM, error format)
- [ ] Complete first successful pipeline run on sample content
- [ ] Evaluate Qwen3.5-27B summary quality
- [ ] Run on all 7 sample contents
- [ ] Run on full 300K+ contents
