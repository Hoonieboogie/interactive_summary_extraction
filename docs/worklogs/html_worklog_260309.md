# Work Log: Navigation Research + Pipeline v4.0 Architecture
**Date:** Sunday, March 9, 2026
**Objective:** Understand Aspen Engine navigation, design a universal extraction pipeline, and handle multiple content engines.

---

## Part 1: Aspen Engine Navigation Research

### 1. `?PGO=` URL Parameter Does NOT Work
- The `index.html` code reads a `PGO` query parameter and passes it to `exe.run(undefined, undefined, parseInt(PGO))`.
- **Result:** The engine ignores the page ID argument. It always loads the first page (order=1, title `_101`) regardless of the PGO value.
- `runByIndex()` also does not work for direct page jumps.

### 2. Page IDs Are NOT Sequential
The numeric page IDs in `data.js` are arbitrary, not sequential. For `2026_kuk_501_0303_0708`:

| Page ID | Order | Title (suffix) | Section |
|---------|-------|-----------------|---------|
| 40 | 1 | _101 | 도입/다가가기 |
| 33 | 2 | _201 | 배울 내용 |
| 41 | 3 | _301 | 이해하기 1 |
| 45 | 4 | _302 | 이해하기 2 |
| 46 | 5 | _303 | 이해하기 3 |
| 42 | 6 | _304 | 이해하기 4 |
| 47 | 7 | _401 | 실천하기 |
| 38 | 8 | _501 | 돌아보기/평가 |

System pages (`S`, `E`, `I`, `C`) are non-content structural pages.

### 3. Working Navigation Method
The only reliable way to navigate pages locally is via the DevTools console:

```js
sgg$exe.runNext()          // go to next page
sgg$exe.runPrev()          // go to previous page
sgg$GetCurrentPageName()   // check current page name
```

**Why this works but direct jump doesn't:** The engine requires proper page shutdown/transition lifecycle. `runNext()` triggers the full transition pipeline (`execShut` → `PageTransition` → `execInit`), while direct `run(pageID)` bypasses it.

### 4. Why `index.html` Appears As a Single Page
- The content is designed to run inside the **i-Scream platform shell**, which provides external prev/next navigation controls via an iframe.
- Opening `index.html` standalone shows only the first page because there are no built-in nav buttons.
- Some transitions are also locked behind **audio completion** or **character click interactions** (layer swapping, not page changes).

---

## Part 2: Deep Analysis of data.js Content

### Structural Analysis (all three Aspen projects)
- Ran automated analysis across all three `data.js` files to understand where text lives and what is noise vs content.
- **~55% of raw extracted text is noise** (widget titles like "Image", UI labels like "정답 확인", internal IDs like "sigongmg1").
- Primary content source: `edu.wgt.keyText` → `styles.text`
- Secondary source: `apn.wgt.rect` → `styles.text` (quiz questions, passages)
- **`wds[].txt` is useless** — contains only standalone `믐` characters and punctuation fragments, never actual content sentences.

### The `믐` (U+BBD0) Character
- Appears as a prefix on many text strings in `styles.text`.
- Initially hypothesized (by Gemini) to be a **speaker/dialogue marker** for an Aspen mascot character.
- **Proven wrong:** `믐` appears on learning objectives, quiz instructions, answer choices, narration, AND dialogue equally. It is a **visual formatting marker** (triggers highlighting in the keyText widget), not a speaker label.
- **Correct handling:** Convert `믐` to `- ` (markdown bullet) to preserve list structure. Do NOT label it as character speech.

---

## Part 3: Pipeline Design Debate (Claude vs Gemini)

### Gemini's Original 3-Stage Proposal
1. Forensics (detect `data.js`)
2. Smart Distillation (recursive crawl for text/html/label keys)
3. AI Synthesis (Gemini generates summary)

### Points of Agreement
- **Widget-targeted extraction** is better than generic recursive crawling (Claude's insight, Gemini agreed)
- **Keyword blocklist is fragile** — "whack-a-mole" that doesn't scale to new projects (Claude's critique, Gemini agreed)
- **Section bucketing (_1xx/_3xx/_5xx) broke on Project 3** — the `_4xx` pages contained the main activity, not the wrapup. Solution: flat page sequence, let the LLM decide structure (both agreed)
- **`믐` is NOT a speaker label** — Gemini conceded after Claude showed evidence across page types
- **Convert `믐` to bullet `- ` instead of stripping** — preserves list structure for the LLM (Gemini's refinement, Claude agreed)

### Points of Disagreement
- **Media magnitude as "secret sauce"** — Gemini proposed checking audio file sizes to weight page importance. Claude found ~50% of audio refs are CDN-hosted (`RAS` prefix, not local). Verdict: optional tiebreaker, not a primary signal.
- **Heuristic summary (no LLM) as baseline** — Claude proposed Option B (zero-cost 3-line extract). Gemini argued it lacks "soul" for a teacher-facing catalog. Verdict: LLM synthesis is the right call for quality output.

---

## Part 4: Multi-Engine Discovery

### The iSpring Content
- User added `Daily_Inventor_Maker_29th_PPT/` — a **completely different engine** (iSpring, PPT-to-HTML export).
- No `data.js`, no `window.apnExeFile`. Instead: `data/slide{1-27}.js` files with inline HTML strings + `data/player.js` (1.7MB iSpring player).
- Text lives in `<span>` tags embedded within HTML string literals inside each slide JS file.
- The current Aspen-only pipeline rejects it at Stage 1.

### Key Realization
The pipeline must handle **any** interactive HTML content, not just Aspen. This led to the plugin architecture:
- Stage 1 (Forensics): detect engine type — **universal**
- Stage 2 (Distillation): engine-specific plugin — **swappable**
- Stage 3 (LLM Synthesis): same prompt/format — **universal**
- Stage 4 (Report): same output — **universal**

Adding a new engine = add signature check + write distiller plugin. Stages 3-4 work automatically.

---

## Part 5: Pipeline v4.0 Built

### Code Delivered (Aspen distiller working)
- `pipeline/detect.js` — Aspen forensics (to be expanded for multi-engine)
- `pipeline/distiller.js` — Widget-whitelist extraction + cleaning
- `pipeline/synthesizer.js` — Gemini prompt for 3-line Korean summary
- `pipeline/config.js` — Widget whitelist, min lengths, thresholds
- `pipeline/index.js` — Orchestrator with `--all` and `--distill-only` modes

### Test Results (distill-only, all three Aspen projects)
```
2026_kuk_501_0303_0708:  8 pages → Intro: 4 texts, Activity: 109 texts, Wrap-up: 35 texts
2026_kuk_501_0304_1112:  4 pages → Intro: 3 texts, Activity: 32 texts, Wrap-up: 0 texts
2026_kuk_601_m100_0102:  7 pages → Intro: 17 texts, Activity: 1 texts, Wrap-up: 60 texts
```

Project 3's activity/wrapup imbalance confirmed that section bucketing is unreliable — pipeline v4.0 will use flat page sequence instead.

### Documentation
- `docs/pipeline_v4_diagram.md` — Full architecture document covering multi-engine plugin design and Aspen-specific deep dive.

---

## Status

| Item | Status |
|------|--------|
| Aspen navigation research | Done |
| data.js content analysis | Done |
| Pipeline v3.0 code (Aspen) | Done (working, needs v4 refactor) |
| Pipeline v4.0 architecture doc | Done |
| v4 code refactor (flat sequence, drop buckets) | To do |
| iSpring distiller | To do |
| Fallback path (unknown engines) | To do |
| LLM synthesis test (Gemini API) | To do |
| Human validation of summary quality | To do |
