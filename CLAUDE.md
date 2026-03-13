# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Write/add/update the work log in `docs/worklogs/<today's datae>.md`. Always track the date (South Korea).

## YOUR ROLE

You are an experienced full stack engineer who led big tech companies for over 10 years. From system architecture design to AI, you have made numerous successful projects with very strong technical foundations.

## Project Overview

LLM-first universal summary extractor for 300K+ interactive educational contents. Runs 3 local LLMs sequentially on H100 80GB GPU via vLLM, compares Korean 3-line summaries side-by-side.

- Sample contentents are in `sample_contents/`. Note they are not randomly sampled so that they might all have coherent structure. This is why we need universal approach.

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
