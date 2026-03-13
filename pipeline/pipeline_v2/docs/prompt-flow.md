# Prompt Flow Reference

## The 7 Prompts

### Stage 1 — Ordering

**P1: `ORDERING_SYSTEM_PROMPT`** (`stage1_ordering.py:10`)

- **Input:** Newline-separated file paths (no content)
- **Output:** `{"ordered_files": ["a.html", "b.html", ...]}`
- **Purpose:** Determine the reading order of files so that Stage 2 summaries carry position context (e.g., "file 2 of 12"), which helps the LLM understand where a file sits in the overall lesson flow.

### Stage 2 — Map (per-file)

**P2: `PERFILE_SYSTEM_PROMPT`** (`stage2_map.py:12`)

- **Input:** File path + position + full raw file content
- **Output:** `{"has_educational_content": true/false, "summary": "1-2문장 요약"}`
- **Purpose:** The core extraction prompt. Decides whether a file contains educational content and summarizes it. This is the only prompt that sees raw content (HTML, JS, JSON, etc.).

**P3: `CHUNK_SYSTEM_PROMPT`** (`stage2_map.py:21`)

- **Input:** A raw text chunk (portion of a file that was too large)
- **Output:** Plain text summary (no JSON)
- **Purpose:** Summarize one chunk of an oversized file. Intentionally simple — just extract whatever educational content exists in this text blob. No structured output needed since chunks are intermediate.

**P4: `CHUNK_MERGE_SYSTEM_PROMPT`** (`stage2_map.py:23`)

- **Input:** All chunk summaries from P3, formatted as `Chunk 1:\n...\nChunk 2:\n...`
- **Output:** `{"has_educational_content": true/false, "summary": "통합 요약"}`
- **Purpose:** Reassemble chunk summaries into a single file-level summary. Output format matches P2 so the rest of the pipeline doesn't know chunking happened.

### Stage 3 — Reduce (merge)

**P5: `FINAL_MERGE_SYSTEM_PROMPT`** (`stage3_reduce.py:12`)

- **Input:** All per-file summaries, formatted as `[position] filepath (교육/비교육): summary`
- **Output:** `{"summary": "3문장 요약", "keywords": ["kw1", ...]}`
- **Purpose:** The final output prompt (happy path). Takes all file summaries and produces the deliverable: 3-line Korean summary + up to 10 keywords.

**P6: `INTERMEDIATE_MERGE_SYSTEM_PROMPT`** (`stage3_reduce.py:22`)

- **Input:** Two summaries (`Summary A:\n...\nSummary B:\n...`)
- **Output:** `{"summary": "문단 길이 통합 요약", "keywords": [...]}`
- **Purpose:** Pairwise reduction step when all summaries don't fit in one call. Merges two summaries into one paragraph. Keywords are accumulated across all pairs.

**P7: `FINAL_PAIRWISE_SYSTEM_PROMPT`** (`stage3_reduce.py:27`)

- **Input:** Final merged summary + all accumulated keywords from P6
- **Output:** `{"summary": "줄1. 줄2. 줄3", "keywords": ["kw1", ...]}`
- **Purpose:** Final compression after pairwise tree merge. Condenses the remaining summary to exactly 3 lines and picks the best 10 keywords from the accumulated pool.

---

## Flow Diagram

```
Content Folder
│
├─ Stage 1: Discovery + Ordering
│  └─ [P1] file paths ──→ reading order
│
├─ Stage 2: Per-File Map (parallel, --map-concurrency N, default 4)
│  │
│  ├─ File fits in context?
│  │  └─ YES ──→ [P2] raw file ──→ {has_educational, summary}
│  │
│  └─ NO (ContextOverflow)
│     ├─ Split into chunks
│     ├─ Each chunk ──→ [P3] ──→ plain text summary
│     │   └─ Chunk still overflows? Halve and retry P3
│     └─ All chunk summaries ──→ [P4] ──→ {has_educational, summary}
│         └─ Chunk merge overflows? Pairwise merge with P4
│
├─ Stage 3: Reduce (Merge all file summaries)
│  │
│  ├─ All summaries fit in context?
│  │  └─ YES ──→ [P5] ──→ {3-line summary, keywords}  ✅ FINAL OUTPUT
│  │
│  └─ NO (ContextOverflow)
│     ├─ Pairwise tree: pairs ──→ [P6] ──→ merged summary + keywords
│     │   └─ Repeat until 1 summary remains
│     └─ Final summary + accumulated keywords ──→ [P7] ──→ {3-line summary, keywords}  ✅ FINAL OUTPUT
│
└─ Stage 4: Save JSON
```
