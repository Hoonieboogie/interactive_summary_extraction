# Pipeline v5.0 — LLM-First Universal Summary Extractor

## Context

- **300,000** interactive HTML educational contents
- Engine types: uncategorized, poorly documented
- Known engines so far: Aspen Editor (i-Scream), iSpring (PPT export), unknown custom HTML5
- Building per-engine parsers for all content types is too slow as a first step

## Approach: LLM-First Baseline

Skip engine detection and engine-specific parsing. Instead:

```
ANY content folder
       │
       ▼
┌─────────────────────────────────────────────────┐
│  STAGE 1: UNIVERSAL TEXT EXTRACTION              │
│                                                  │
│  Read all .js/.html files in the folder          │
│  → Extract all text strings                      │
│  → Keep strings containing Korean (한글)          │
│  → Strip <script>, <style>, <svg> contents       │
│  → Collapse whitespace, deduplicate              │
│                                                  │
│  This is ENGINE-AGNOSTIC. No detection needed.   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  STAGE 2: LLM SYNTHESIS                          │
│                                                  │
│  Prompt-engineered LLM receives all text and:    │
│  1. Ignores HTML tags, code, technical markup    │
│  2. Ignores UI noise (버튼, 다음, 확인, etc.)     │
│  3. Focuses on educationally meaningful content  │
│  4. Outputs 3-line Korean summary as JSON        │
│                                                  │
│  No fine-tuning needed — prompt engineering only │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  STAGE 3: REPORT                                 │
│                                                  │
│  {                                               │
│    id: "folder_name",                            │
│    summary: [line1, line2, line3],               │
│    metadata: { extractedAt, charCount,           │
│                pipeline: "v5.0" }                │
│  }                                               │
│                                                  │
│  Flag if < 100 chars Korean text extracted        │
│  (likely image-heavy, needs manual review)       │
└─────────────────────────────────────────────────┘
```

## Why This Over v4.0 (Per-Engine Parsing)

| Criterion            | v4.0 (per-engine)                    | v5.0 (LLM-first)                    |
|----------------------|--------------------------------------|--------------------------------------|
| New engine support   | Build new parser each time           | Zero work — universal                |
| Time to cover 300K   | Months (analyze → categorize → build)| Days (extract → batch → done)        |
| Maintenance          | N parsers to maintain                | 1 prompt to maintain                 |
| Accuracy on Aspen    | Higher (structural filtering)        | Slightly lower but sufficient        |
| Accuracy on unknown  | No coverage until parser built       | Works immediately                    |

v4.0 remains valuable as an **optimization layer** — for high-volume engine types, a structural parser can reduce token cost and improve accuracy. But v5.0 is the **baseline that covers everything**.

## Pre-Extraction: Why Not Send Raw Files

Raw `data.js` (Aspen) is ~700KB, mostly engine metadata (hex colors, pixel coords, class names, hash IDs). Sending everything wastes 50x tokens.

| What you send              | Avg tokens/content | Cost at 300K (Gemini Flash Lite) |
|----------------------------|--------------------|---------------------------------|
| Raw file contents          | ~120,000           | ~$3,600                         |
| Korean text only (filtered)| ~3,000             | ~$57                            |

The pre-filter ("keep only strings containing Korean characters") is universal across ALL engines and cuts cost dramatically.

## LLM Prompt Template

```
당신은 교육 콘텐츠 분석 전문가입니다.

아래는 교육용 인터랙티브 콘텐츠에서 추출한 원본 텍스트입니다.
이 텍스트에는 HTML 태그, 코드, UI 요소(버튼, 메뉴, 네비게이션 텍스트) 등이
포함되어 있을 수 있습니다.

[지시사항]
1. HTML 태그, JavaScript, CSS 코드를 모두 무시하세요.
2. 버튼 라벨, 네비게이션 텍스트, UI 요소 텍스트를 무시하세요.
3. 교육적으로 의미 있는 내용만 파악하세요.
4. 해당 콘텐츠의 핵심 교육 내용을 한국어 3줄로 요약하세요.
5. 원본 텍스트에 없는 내용을 추가하지 마세요.

규칙:
- 첫째 줄: 학습 주제 (무엇을 배우는가)
- 둘째 줄: 주요 학습 활동 (어떤 활동을 하는가)
- 셋째 줄: 학습 목표 및 기대 효과 (무엇을 할 수 있게 되는가)

JSON 형식으로 응답하세요:
{ "line1": "...", "line2": "...", "line3": "..." }

[원본 텍스트]
{content}
```

## Cost Analysis (300K Contents)

Assumptions: ~3,000 input tokens avg, ~200 output tokens avg per content.

| Model                          | Total Cost | Batch Discount | Korean Quality |
|--------------------------------|------------|----------------|----------------|
| Gemini 2.5 Flash Lite (batch)  | $114       | **$57**        | Good           |
| Qwen3 8B (API)                 | **$69**    | N/A            | Best           |
| GPT-4o-mini (batch)            | $171       | ~$86           | Good           |
| Gemini 2.5 Flash (batch)       | $420       | $210           | Good           |
| Claude Haiku 3.5 (batch)       | $960       | $480           | Very Good      |
| Qwen3 8B (local, A100)         | **$20-50** | N/A            | Best           |

## Infrastructure Options

### API-Based (Recommended for first run)

- **Gemini Batch API**: No predefined quota limits, 50% cost discount, hours to complete
- **Claude Batch API**: 24hr SLA, 10K requests per batch, 50% discount
- Implement: async workers + exponential backoff + retry

### Local Model (For ongoing/repeated use)

- **Qwen3 8B** on A100 80GB via vLLM: ~3,000 tok/s, finishes in ~5-6 hours
- **Qwen3 8B** on RTX 4090 (Q4): ~100-140 tok/s, finishes in ~5-7 days
- VRAM: ~7GB (Q4) or ~16GB (FP16)

## Risks & Mitigations

| Risk                          | Severity | Mitigation                                          |
|-------------------------------|----------|-----------------------------------------------------|
| Hallucination                 | Low      | temperature=0, "only use source content" instruction |
| Output inconsistency          | Medium   | Run once, cache results                              |
| Image-heavy content (no text) | Medium   | Flag if < 100 chars Korean text; future: Vision LLM  |
| Mixed/code-heavy content      | Low      | Prompt explicitly ignores code                       |
| Korean quality varies         | Low      | Qwen3 > Claude > GPT > Gemini > Llama for Korean    |

## Validation Strategy

```
Phase 1: POC           →  100 samples, 3 models in parallel, evaluate quality
Phase 2: Validation    →  1,000 samples, human review scoring (1-5)
Phase 3: Production    →  Batch all 300K, post-validate flagged items (~5-10%)
```

## File Structure

```
pipeline/
├── index.js              Orchestrator (extract → synthesize → report)
├── extractor.js          Universal Korean text extraction (engine-agnostic)
├── synthesizer.js        LLM prompt + API call
├── .env                  API key
└── package.json
```

## Relationship to v4.0

v5.0 does NOT replace v4.0. They serve different purposes:

- **v5.0** = baseline that works on ALL 300K contents immediately
- **v4.0** = optimization for known engine types (better accuracy, lower token cost)

Future: v4 engine-specific distillers can feed cleaner input to the same LLM prompt, improving quality for high-volume engine types while v5 handles the long tail.

## Sources

- ScrapeGraphAI-100k: LLM-Based Web Information Extraction (arXiv, Feb 2026)
- HalluLens: LLM Hallucination Benchmark (ACL 2025) — 1.5-4.6% hallucination rate
- DataRobot 2025: LLM scrapers require 70% less maintenance than rule-based parsers
- Gemini API Pricing: ai.google.dev/gemini-api/docs/pricing
- Qwen3 Technical Report: arxiv.org/pdf/2505.09388
- vLLM Performance Benchmarks: blog.vllm.ai/2024/09/05/perf-update.html
