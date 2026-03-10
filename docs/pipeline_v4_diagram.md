# Interactive Content Summary Extraction Pipeline v4.0

## The Problem

We deal with **multiple types of interactive HTML educational content**, each built
on a different engine with a different internal structure. The goal is to extract
a 3-line educational summary from ANY of them, regardless of engine.

## Known Content Engines

```
┌──────────────┬────────────────────────────┬─────────────────────────────────┐
│ Engine       │ Signature                  │ Text Location                   │
├──────────────┼────────────────────────────┼─────────────────────────────────┤
│ Aspen Editor │ data.js containing         │ Widget JSON objects             │
│ (i-Scream)   │ window.apnExeFile          │ → styles.text in keyText/rect   │
├──────────────┼────────────────────────────┼─────────────────────────────────┤
│ iSpring      │ data/slide{N}.js +         │ HTML string literals in JS      │
│ (PPT export) │ data/player.js             │ → <span> tags inside each slide │
├──────────────┼────────────────────────────┼─────────────────────────────────┤
│ Unknown /    │ No known signature         │ Requires headless browser +     │
│ Custom HTML5 │                            │ DOM scraping or Vision LLM      │
└──────────────┴────────────────────────────┴─────────────────────────────────┘

Real examples in this project:

┌─────────────────────────────────┬─────────────┬───────────────────────┐
│ Folder                          │ Engine      │ Distiller             │
├─────────────────────────────────┼─────────────┼───────────────────────┤
│ 2026_kuk_501_0303_0708/         │ aspen       │ distillers/aspen.js   │
│ 2026_kuk_501_0304_1112/         │ aspen       │ distillers/aspen.js   │
│ 2026_kuk_601_m100_0102/         │ aspen       │ distillers/aspen.js   │
│ Daily_Inventor_Maker_29th_PPT/  │ ispring     │ distillers/ispring.js │
└─────────────────────────────────┴─────────────┴───────────────────────┘
```

## Pipeline Architecture (Universal)

Only Stage 2 (distillation) is engine-specific. Everything else is shared.

```
ANY HTML content folder
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: FORENSICS  (detect.js)                                │
│                                                                 │
│  Checks all known engine signatures in order:                   │
│                                                                 │
│  Input folder                                                   │
│       │                                                         │
│       ├──▶ Has data.js + window.apnExeFile?  ──YES──▶ "aspen"   │
│       │                                                         │
│       ├──▶ Has data/slide1.js + player.js?   ──YES──▶ "ispring" │
│       │                                                         │
│       ├──▶ (future engine checks here)                          │
│       │                                                         │
│       └──▶ None matched                      ──────▶ "unknown"  │
│                                                 (fallback path) │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: DISTILLATION  (distillers/{engine}.js)                │
│                                                                 │
│  Engine-specific extraction. Each distiller is a plugin that    │
│  reads the content in its own way but outputs the SAME common  │
│  intermediate format.                                           │
│                                                                 │
│    ┌────────────┬────────────┬────────────┬──────────────┐      │
│    │   Aspen    │  iSpring   │  Engine C  │   Fallback   │      │
│    │  distiller │  distiller │  distiller │  (Playwright  │      │
│    │   (done)   │ (to build) │  (future)  │  + Vision?)  │      │
│    └─────┬──────┘─────┬──────┘─────┬──────┘──────┬───────┘      │
│          │            │            │             │              │
│          └──────┬─────┴────────────┴─────────────┘              │
│                 │                                                │
│                 ▼                                                │
│  ┌────────────────────────────────────────────────┐              │
│  │  COMMON INTERMEDIATE FORMAT                    │              │
│  │  {                                             │              │
│  │    id: "folder_name",                          │              │
│  │    title: "...",                               │              │
│  │    engine: "aspen" | "ispring" | "unknown",    │              │
│  │    pages: [                                    │              │
│  │      {                                         │              │
│  │        order: 1,                               │              │
│  │        pageTitle: "...",                        │              │
│  │        texts: ["...", "- ...", ...],            │              │
│  │        narrationMinutes: 1.2  (if available)   │              │
│  │      },                                        │              │
│  │      { order: 2, ... },                        │              │
│  │      ...                                       │              │
│  │    ]                                           │              │
│  │  }                                             │              │
│  └────────────────────────────────────────────────┘              │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: LLM SYNTHESIS  (synthesizer.js)                       │
│                                                                 │
│  Same prompt for ALL engine types.                              │
│  LLM decides what is intro/activity/wrapup from the content.    │
│                                                                 │
│  ┌──────────────────────────────────────────────┐               │
│  │  Role: 초등학교 교육과정 전문가                  │               │
│  │                                              │               │
│  │  Input: flat page sequence JSON              │               │
│  │                                              │               │
│  │  Output (exactly 3 Korean sentences):        │               │
│  │    Line 1: 학습 주제                           │               │
│  │    Line 2: 주요 학습 활동                       │               │
│  │    Line 3: 학습 목표 / 기대 효과                │               │
│  │                                              │               │
│  │  Format: JSON { line1, line2, line3 }        │               │
│  │  Model:  Gemini 2.5 Flash                    │               │
│  └──────────────────────────────────────────────┘               │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: REPORT  (index.js)                                    │
│                                                                 │
│  {                                                              │
│    id: "...",                                                   │
│    title: "...",                                                │
│    engine: "aspen",                                             │
│    summary: [line1, line2, line3],                              │
│    metadata: { extractedAt, pageCount, pipeline: "v4.0" },     │
│    distilledData: { pages: [...] }                              │
│  }                                                              │
│                                                                 │
│  CLI:                                                           │
│    node pipeline/index.js <folder>                              │
│    node pipeline/index.js --all                                 │
│    node pipeline/index.js --distill-only <folder>               │
└─────────────────────────────────────────────────────────────────┘
```

## Target File Structure

```
pipeline/
├── index.js                Orchestrator (stages 1→2→3→4, --all, --distill-only)
├── detect.js               Multi-engine forensics
├── distillers/
│   ├── aspen.js            Aspen Engine distiller (done)
│   ├── ispring.js          iSpring PPT distiller (to build)
│   └── fallback.js         Headless browser fallback (future)
├── synthesizer.js          LLM prompt (universal)
├── config.js               Per-engine configs
├── .env                    GEMINI_API_KEY
└── package.json            @google/genai, dotenv
```

## Adding a New Engine

1. Add signature check to `detect.js`
2. Create `distillers/{engine}.js` that outputs the common intermediate format
3. Done — Stages 3 and 4 work automatically

---

## Aspen Engine Distiller — Detailed Design

The Aspen Editor (i-Scream platform) is the first and most complex engine.
Below is the full extraction logic specific to Aspen content.

### Aspen Content Structure

```
2026_kuk_*/
├── data.js              Single file containing ALL content
│                        Format: window.apnExeFile = { huge JSON }
├── index.html           Player shell (loads engine + data.js)
├── asset/A/             Local media (PNG, MP3)
├── corp/                Engine libraries
├── css/                 Stylesheets
├── exe/                 Engine scripts
├── js/                  Renderer (aspen-apx-1.0.js)
└── wgts/                Widget definitions
```

### Inside data.js

```
window.apnExeFile = {
  CTXT:     { layoutID }                        ← canvas config (1171x768)
  property: { title, corpID:"sgg", type:"P" }   ← metadata
  pages: {
    "S","E","I","C":  system pages (SKIP)
    "33","38",...:     content pages
      └── UI:      { title, order }             ← page name + sequence
      └── objects:  { ... }                     ← all widgets on page
            └── module:  "apn.CRect" | "apn.CImage" | ...
            └── create.data:
                  └── wgtID:    widget type
                  └── styles.text:                   ← display text
                  └── properties.attrs.cfg.wds[].txt: ← IGNORE (formatting only)
  layouts:  { ... }       ← templates (mostly empty)
  flow:     { pages: {} } ← empty, not used
  rsc:      { }           ← empty, media referenced inline
}
```

### Page IDs Are Non-Sequential

Page IDs are arbitrary integers. Order is determined by `UI.order`, not by ID.
Example from 2026_kuk_501_0303_0708:

```
Page ID   Order   Title Suffix   Section
  40        1        _101        Intro (다가가기)
  33        2        _201        Objectives (배울 내용)
  41        3        _301        Activity 1 (이해하기)
  45        4        _302        Activity 2
  46        5        _303        Activity 3
  42        6        _304        Activity 4
  47        7        _401        Practice (실천하기)
  38        8        _501        Assessment (돌아보기)
```

### Navigation (for manual viewing)

`index.html` is designed to run inside the i-Scream platform shell.
Opening it standalone shows only the first page (no nav buttons).

To navigate locally, use the browser DevTools console:

```js
sgg$exe.runNext()          // next page
sgg$exe.runPrev()          // previous page
sgg$GetCurrentPageName()   // current page name
```

`?PGO=` URL parameter and `runByIndex()` do NOT work.
The engine requires full page lifecycle transitions (execShut → PageTransition → execInit).

### Aspen Distillation Steps

```
  2a. PARSE
  ┌─────────────────────────────────────────────┐
  │  window.apnExeFile = { ... }                │
  │       │                                     │
  │  strip prefix ──▶ JSON.parse()              │
  │       │                                     │
  │  ┌────┴───────┐                             │
  │  │ property    │─▶ title, ID                │
  │  │ pages{}     │─▶ content pages            │
  │  │ (S,E,I,C)   │─▶ SKIP system pages       │
  │  └────────────┘                             │
  └─────────────────────────────────────────────┘

  2b. EXTRACT (Widget Whitelist)
  ┌─────────────────────────────────────────────┐
  │                                             │
  │  For each page (sorted by UI.order):        │
  │                                             │
  │  ┌──────────────────┐                       │
  │  │ edu.wgt.keyText   │──▶ styles.text       │  EXTRACT (primary)
  │  │                   │   Core dialogue,     │  Objectives, instructions,
  │  │                   │   lesson content     │  student dialogue
  │  └──────────────────┘                       │
  │                                             │
  │  ┌──────────────────┐                       │
  │  │ apn.wgt.rect      │──▶ styles.text       │  EXTRACT (if >15 chars)
  │  │                   │   Quiz text,         │  Passages, questions
  │  │                   │   longer content     │
  │  └──────────────────┘                       │
  │                                             │
  │  ┌──────────────────┐                       │
  │  │ ALL OTHER wgtIDs  │                      │  IGNORE
  │  │ button, image,    │                      │  (sgg.wgt.button,
  │  │ audio, check...   │                      │   apn.wgt.image2,
  │  └──────────────────┘                       │   apn.wgt.audio, etc.)
  │                                             │
  │  ┌──────────────────┐                       │
  │  │ Objects < 30px    │                      │  IGNORE (decorative)
  │  └──────────────────┘                       │
  │                                             │
  └─────────────────────────────────────────────┘

  2c. CLEAN
  ┌─────────────────────────────────────────────┐
  │                                             │
  │  "믐질문의 목적을 생각해 질문한다."            │
  │       │                                     │
  │   ┌───┴──────────────────────────┐          │
  │   │ 믐 (U+BBD0) ──▶ "- " bullet │          │
  │   │ <html tags> ──▶ strip       │          │
  │   │ ^L ^B ^U    ──▶ strip       │          │
  │   │ whitespace  ──▶ collapse    │          │
  │   └──────────────────────────────┘          │
  │       │                                     │
  │       ▼                                     │
  │  "- 질문의 목적을 생각해 질문한다."            │
  │                                             │
  │  IMPORTANT: 믐 is a formatting marker,      │
  │  NOT a speaker/dialogue label. It appears   │
  │  on objectives, quiz questions, answer      │
  │  choices, narration, AND dialogue equally.  │
  │  Strip it. Don't label it.                  │
  │                                             │
  │  Also IGNORE: wds[].txt (contains only      │
  │  standalone 믐 chars and punctuation         │
  │  fragments — zero content value)            │
  └─────────────────────────────────────────────┘

  2d. MEDIA MAGNITUDE (optional, local assets only)
  ┌─────────────────────────────────────────────┐
  │                                             │
  │  Audio mediaID mapping:                     │
  │    RA{hash}_mp3  ──▶ asset/A/{hash}.mp3     │
  │    RAS{hash}_mp3 ──▶ NOT LOCAL (CDN-hosted) │
  │                                             │
  │  If local file exists:                      │
  │    < 50KB  = SFX (skip)                     │
  │    ≥ 50KB  = narration (count it)           │
  │                                             │
  │  NOTE: ~50% of audio is CDN-hosted (RAS     │
  │  prefix). Media magnitude is a tiebreaker,  │
  │  not a primary signal.                      │
  └─────────────────────────────────────────────┘
```

### Noise vs Content — What We Learned

Analysis across all three Aspen projects showed ~55% of raw extracted text is noise.

```
NOISE (ignore):                      CONTENT (extract):
  "Image"                              "주의 깊게 듣고 질문할 수 있다."
  "Rectangle"                          "새로운 학급 규칙을 정하려고 회의를 열었습니다."
  "Round Rectangle"                    "「유정이네 학급 회의」를 듣고 물음에 답해 봅시다."
  "정답 확인"                           "글, 소리, 그림을 함께 사용해 자료를 만들면..."
  "다시 하기"                           "지식재산권과 관련한 분쟁을 영상을 통해..."
  "버튼영역"
  "sigongmg1"
  standalone "믐" in wds[].txt

Widget whitelist eliminates noise structurally — no keyword blocklist needed.
```

---

## Key Design Principles

```
┌──────────────────────────────────────────────────────────────┐
│  1. PLUGIN ARCHITECTURE                                      │
│     Stage 2 is engine-specific; everything else is universal │
│                                                              │
│  2. STRUCTURAL filtering (widget type + dimensions)          │
│     NOT keyword blocklists (which don't scale)               │
│                                                              │
│  3. FLAT page sequence to LLM                                │
│     NOT pre-labeled buckets (intro/activity/wrapup)          │
│     because page naming conventions vary across projects     │
│                                                              │
│  4. LLM decides structure from content                       │
│     NOT heuristic suffix-based classification                │
│                                                              │
│  5. Media magnitude as OPTIONAL metadata                     │
│     NOT a primary signal (50% CDN-hosted in Aspen)           │
│                                                              │
│  6. 믐 (U+BBD0) = formatting bullet marker                   │
│     NOT a speaker/dialogue label                             │
│     Convert to "- ", don't label as character speech         │
└──────────────────────────────────────────────────────────────┘
```
