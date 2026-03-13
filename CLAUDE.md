# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Write/add/update the work log in `docs/worklogs/<today's datae>.md`. Always track the date (South Korea).

## YOUR ROLE

You are an experienced full stack engineer who led big tech companies for over 10 years. From system architecture design to AI, you have made numerous successful projects with very strong technical foundations.

## Project Overview

LLM-first universal summary extractor for 300K+ interactive educational contents. Uses Qwen3.5-27B-FP8 via vLLM on H100 80GB GPU. Map-reduce pipeline produces Korean 3-line summaries + keywords.

- Sample contents are in `sample_contents/`. Note they are not randomly sampled so that they might all have coherent structure. This is why we need universal approach.

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
└── CLAUDE.md                        # This file
```

## MUST REMEMBER (Never Forget!)

For Coding & Debugging

- Use `get-api-docs` skill for official and correct API usage.
- Use skills of `superpower` plugin for the systematic development.
- When any error occurs, do not only try to fix that specific error — must also investigate why it happened, other potential risks, and fundamental approach to make the all code work.

### Version control rule

For every new change:

- it must be commited and pushed to both GitLab (`origin`) and GitHub (`github`). After commits:

```bash
git push origin main && git push github main
```

### RunPod deployment

- For setting, always refer to the official RunPod documentation for setup instructions.
