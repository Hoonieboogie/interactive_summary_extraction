# Pipeline v5.0 — LLM-First Universal Summary Extractor

## Context

- **Over 300,000** interactive HTML educational contents
- Engine types: uncategorized, poorly documented
- Known engines so far: Aspen Editor (i-Scream), iSpring (PPT export), unknown custom HTML5
- Building per-engine parsers for all content types is too slow as a first step

## Approach: LLM-First Baseline

Skip engine detection and engine-specific parsing.
Pass raw content directly to a local LLM — no per-token cost.

```
ANY content folder
       │
       ▼
┌─────────────────────────────────────────────────┐
│  STAGE 1: UNIVERSAL PRE-FILTER                   │
│                                                  │
│  Read all .js/.html files in the folder          │
│  Pass through raw, but strip provably            │
│  non-educational data to fit context window:     │
│                                                  │
│  STRIP (never educational):                      │
│    • <svg>...</svg> blocks (vector paths/coords) │
│    • <style>...</style> blocks (CSS rules)       │
│    • inline style="..." attributes               │
│    • HTML comments <!-- ... -->                   │
│    • SVG path data (d="M0,0 V15.685 H23...")     │
│                                                  │
│  KEEP (may contain educational value):           │
│    • All text (Korean, English, any language)     │
│    • Image refs (src="...", base64 data URIs)     │
│    • Audio/video refs (mediaID, .mp3, .mp4)      │
│    • File structure and paths                    │
│                                                  │
│  WHY KEEP MEDIA: Some educational content is     │
│  embedded in images/audio. Keeping references    │
│  enables future Vision LLM / audio processing.  │
│                                                  │
│  This is ENGINE-AGNOSTIC. No detection needed.   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  STAGE 2: LLM SYNTHESIS (Local Model)            │
│                                                  │
│  Local LLM (e.g. Qwen3 8B via vLLM) receives    │
│  pre-filtered content and:                       │
│  1. Ignores remaining HTML tags, code, markup    │
│  2. Ignores UI noise (버튼, 다음, 확인, etc.)     │
│  3. Focuses on educationally meaningful content  │
│  4. Outputs 3-line Korean summary as JSON        │
│                                                  │
│  Token cost = $0 (local inference)               │
│  No fine-tuning needed — prompt engineering only │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  STAGE 3: REPORT                                 │
│                                                  │
│  {                                               │
│    id: "folder_name",                            │
│    summary: "line1. line2. line3",                │
│    metadata: { extractedAt, charCount,           │
│                pipeline: "v5.0" }                │
│  }                                               │
│                                                  │
│  Flag if < 100 chars text after pre-filter       │
│  (likely image-heavy, needs Vision LLM later)    │
└─────────────────────────────────────────────────┘
```

### Future Multi-Modal Expansion

The pipeline preserves media references so it can evolve:
- **Now**: Text-only summary via local LLM
- **Future**: Image analysis via Vision LLM (educational diagrams, text in images)
- **Future**: Audio transcription (narration, dialogue)

## Why This Over v4.0 (Per-Engine Parsing)

| Criterion            | v4.0 (per-engine)                    | v5.0 (LLM-first)                    |
|----------------------|--------------------------------------|--------------------------------------|
| New engine support   | Build new parser each time           | Zero work — universal                |
| Time to cover 300K   | Months (analyze → categorize → build)| Days (extract → batch → done)        |
| Maintenance          | N parsers to maintain                | 1 prompt to maintain                 |
| Accuracy on Aspen    | Higher (structural filtering)        | Slightly lower but sufficient        |
| Accuracy on unknown  | No coverage until parser built       | Works immediately                    |

v4.0 remains valuable as an **optimization layer** — for high-volume engine types, a structural parser can reduce token cost and improve accuracy. But v5.0 is the **baseline that covers everything**.

## Why Pre-Filter Instead of Raw Pass-Through

With a local model, token cost is $0 — so why not pass raw files directly?

**Context window is the constraint.** Aspen `data.js` can be 1.6MB (~400K tokens), exceeding
most local model context limits (Qwen3 8B = 128K tokens).

The pre-filter is NOT about cost savings — it's about **fitting content into the context window**
by stripping data that is provably non-educational (SVG paths, CSS rules, inline styles).

| What you send           | Avg tokens/content | Fits 128K context? |
|-------------------------|--------------------|--------------------|
| Raw file contents       | ~120,000           | Most yes, some no  |
| After pre-filter        | ~30,000-50,000     | Yes                |

The pre-filter is universal (SVG/CSS/style attributes exist in all web content)
and preserves all text + media references.

## LLM Prompt Template

```
너는 교육 콘텐츠 분석 전문가야.

아래는 교육용 인터랙티브 콘텐츠에서 추출한 원본 텍스트야.
이 텍스트에는 HTML 태그, 코드, UI 요소(버튼, 메뉴, 네비게이션 텍스트) 등이
포함되어 있을 수 있어.

[지시사항]
1. HTML 태그, JavaScript, CSS 코드를 모두 무시해.
2. 버튼 라벨, 네비게이션 텍스트, UI 요소 텍스트를 무시해.
3. 교육적으로 의미 있는 내용만 파악해.
4. 해당 콘텐츠의 핵심 교육 내용을 한국어 3줄로 요약해.
5. 원본 텍스트에 없는 내용을 절대 추가하지 마.

규칙:
- 첫째 줄: 학습 주제 (무엇을 배우는가)
- 둘째 줄: 주요 학습 활동 (어떤 활동을 하는가)
- 셋째 줄: 학습 목표 및 기대 효과 (무엇을 할 수 있게 되는가)

[출력형식]
JSON 형식으로 응답할 것:
{ "summary": "line1. line2. line3" }

[원본 텍스트]
{CONTENT}
```


## Validation Strategy

```
Phase 1: POC           →  100 samples, 3 models in parallel, evaluate quality
Phase 2: Validation    →  1,000 samples, human review scoring (1-5)
Phase 3: Production    →  Batch all 300K, post-validate flagged items (~5-10%)
```
