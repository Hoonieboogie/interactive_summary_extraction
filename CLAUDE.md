# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM-first universal summary extractor for 300K+ interactive educational contents. Runs 3 local LLMs sequentially on H100 80GB GPU via vLLM, compares Korean 3-line summaries side-by-side. 

- Sample contentents are in `sample_contents/`. Note they are not randomly sampled so that they might all have coherent structure. This is why we need universal approach.


## Commands

All Python work happens inside `pipeline/`. The project uses **uv** (not pip/poetry). 

```bash
cd pipeline

# Install dependencies
uv sync --dev

# Run all tests
uv run pytest -v

# Run a single test file
uv run pytest -v tests/test_prefilter.py

# Run a single test class or function
uv run pytest -v tests/test_prefilter.py::TestStripSvg
uv run pytest -v tests/test_synthesizer.py::TestParseLlmResponse::test_plain_text_fallback

# Run pipeline (on RunPod with GPU)
uv run main.py --content-dir ../sample_contents --output-dir ./results --models exaone4-32b
uv run main.py --content-dir ../sample_contents --output-dir ./results --num-gpus 2
```

No linter or formatter is configured.

## Architecture

Refer to the `pipeline/IMPLEMENTATION.md`.


## MUST REMEMBER

## For coding & debuging
- Use `get-api-docs` skill for official and correct API usage.
- Use skills of `superpower` plugin for the systematic development.
- When any error occurs, do not only try to fix that specific error — must also investigate why it happened, other potential risks, and fundamental approach to make the all code work.

### Version control rule

For every new change:
- it must be commited and pushed to both GitLab (`origin`) and GitHub (`github`). After commits:
```bash
git push origin main && git push github main
```

- Write/add/update the work log in `docs/worklogs/<today's datae>.md`. Always track the date (South Korea). 

### RunPod deployment

- For setting, always refer to the official RunPod documentation for setup instructions.
- 
- `setup_runpod.sh` installs uv + dependencies + vLLM nightly. Must set `UV_LINK_MODE=copy` for RunPod's network filesystem (MFS doesn't support hardlinks). The venv may need to be symlinked to local disk (`/tmp`) if MFS causes stale file handle errors.
