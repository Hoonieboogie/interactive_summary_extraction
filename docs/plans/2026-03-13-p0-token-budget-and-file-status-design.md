# P0 Design: Token-Aware Budget Management + Per-File Status Tracking

Date: 2026-03-13

## Context

Run test 2 revealed two P0 issues:
1. **Thinking token budget exhaustion**: `data.js` (1.3MB, most important file) chunked → chunk response exhausted entire generation budget on thinking tokens → `content` empty → `ValueError`. Root cause: no `max_tokens` in API call, so vLLM defaults to `max_model_len - prompt_tokens`. Thinking + content share this budget.
2. **Failed files invisible in output**: `asyncio.gather` catches exceptions, but the `(summary, responses, overflow_retries)` tuple is lost entirely. No record of what failed or why.

## Requirements

- Zero educational content loss — every file must be summarized or explicitly flagged as failed
- No pipeline crashes
- Token counts must match what vLLM actually sees (same tokenizer)

## Design

### P0-1: Token-Aware Budget Management

#### Tokenizer Choice

Use `transformers.AutoTokenizer.from_pretrained(hf_id)` — the same class and model ID that vLLM uses internally. Guarantees identical tokenization including chat template via `apply_chat_template()`.

Dependency: `transformers` (without `[torch]` extra). Already installed on RunPod (vLLM depends on it).

#### Architecture

```
config.py
└── ModelConfig.min_generation_tokens = 4096  # floor for generation budget

LLMClient (enhanced)
├── tokenizer: AutoTokenizer       # loaded at __init__
├── max_model_len: int             # from ModelConfig
├── count_tokens(messages) -> int  # apply_chat_template(tokenize=True)
├── call(system, user)             # auto-calculates max_tokens before API call
│   ├── counts prompt tokens via apply_chat_template
│   ├── max_tokens = max_model_len - prompt_tokens
│   ├── raises if max_tokens < min_generation_tokens
│   └── passes max_tokens to API request body

stage2_map.py (enhanced)
├── split_into_chunks_by_tokens()  # token-aware chunking
│   ├── counts total file tokens once
│   ├── derives file-specific chars_per_token ratio
│   ├── calculates max_chunk_chars = max_prompt_tokens / chars_per_token
│   └── splits at newline boundaries (reuses existing logic)
└── summarize_file()
    ├── tries full file first (LLMClient auto-sets max_tokens)
    ├── on overflow OR insufficient budget → chunk by tokens
    └── each chunk guaranteed to have >= min_generation_tokens headroom
```

#### Token Counting Flow

```python
messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_message},
]
prompt_tokens = len(tokenizer.apply_chat_template(messages, tokenize=True))
max_tokens = max_model_len - prompt_tokens

if max_tokens < min_generation_tokens:
    raise InsufficientBudgetError(prompt_tokens, max_tokens)
```

This is exact — no safety margin needed because `apply_chat_template` includes all template overhead.

#### Chunking Strategy

When a file needs chunking (overflow or insufficient budget):

```python
total_tokens = count_tokens(content)  # tokenize raw content once
chars_per_token = len(content) / total_tokens  # file-specific ratio

# Max chars per chunk such that prompt fits and leaves min_generation_tokens
system_prompt_tokens = count_tokens(system_prompt)  # small, can cache
max_content_tokens = max_model_len - system_prompt_tokens - template_overhead - min_generation_tokens
max_chunk_chars = int(max_content_tokens * chars_per_token)

chunks = split_into_chunks(content, max_chunk_chars)  # existing newline-boundary logic
```

Per-file ratio gives precision without tokenizing every chunk individually.

### P0-2: Per-File Status Tracking

#### Data Model

```python
@dataclass
class FileResult:
    filepath: str
    status: str              # "success" | "failed"
    error: str | None        # error type + message if failed
    chunks: int              # number of chunks processed
    has_educational_content: bool | None
```

#### Changes to process_content()

```python
file_results = []

for i, result in enumerate(results):
    filepath = ordered_entries[i].filepath
    if isinstance(result, Exception):
        file_results.append({
            "filepath": filepath,
            "status": "failed",
            "error": f"{type(result).__name__}: {result}",
            "chunks": 0,
            "has_educational_content": None,
        })
        # ... existing logging ...
        continue
    summary, responses, overflow_retries = result
    file_results.append({
        "filepath": filepath,
        "status": "success",
        "chunks": max(1, overflow_retries + len(responses)),
        "has_educational_content": summary.has_educational_content,
    })
    # ... existing collection ...
```

#### Output JSON Addition

```json
{
  "content_id": "...",
  "summary": "...",
  "keywords": [...],
  "file_results": [
    {"filepath": "data.js", "status": "success", "chunks": 4, "has_educational_content": true},
    {"filepath": "aspen-runscript-1.0.js", "status": "failed", "error": "ReadTimeout: 300s exceeded", "chunks": 0, "has_educational_content": null}
  ],
  "files_succeeded": 8,
  "files_failed": 2,
  "metrics": { ... }
}
```

### Dependency Change

```toml
# pyproject.toml
dependencies = [
    "httpx>=0.28",
    "charset-normalizer>=3.0",
    "transformers>=5.0",
]
```

No `[torch]` extra — tokenizer-only usage.

### Error Handling

- `InsufficientBudgetError` (new): raised when a chunk is at minimum size but still can't fit with `min_generation_tokens` headroom. Caught by `asyncio.gather`, recorded in `file_results`.
- `ValueError` (empty content): added to expected error list in `main.py:84` alongside `httpx.HTTPError`, `ContextOverflowError`, `OSError`.

### What This Does NOT Change

- Prompt templates (stage2, stage3) — unchanged
- Reduce phase — unchanged (already handles its own context)
- Ordering phase — unchanged
- Output format — backward compatible (new fields added, none removed)
