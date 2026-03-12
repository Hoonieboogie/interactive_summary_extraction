"""Stage 1 — Sequence Ordering. LLM-inferred reading order with validation."""
import logging
from dataclasses import dataclass

from stage1_discovery import FileEntry
from json_parser import parse_json

logger = logging.getLogger(__name__)

ORDERING_SYSTEM_PROMPT = """You are given a list of file paths from an educational content package.
Return them in the optimal reading order as a JSON object:
{"ordered_files": ["first.html", "second.html", ...]}

Infer order from numbering (page_01, slide_02), naming conventions (intro, activity, quiz), and directory hierarchy."""


@dataclass
class OrderedFileEntry:
    position: int
    filepath: str
    raw_content: str


def validate_ordering(
    ordered_paths: list[str], entries: list[FileEntry]
) -> list[OrderedFileEntry]:
    """Validate LLM ordering against discovered files.
    - Ignore paths not in entries.
    - Append entries missing from ordering at the end.
    """
    entry_map = {e.filepath: e for e in entries}
    seen = set()
    result = []

    for path in ordered_paths:
        if path in entry_map and path not in seen:
            seen.add(path)
            result.append(entry_map[path])

    # Append missing
    for entry in entries:
        if entry.filepath not in seen:
            result.append(entry)

    return [
        OrderedFileEntry(position=i + 1, filepath=e.filepath, raw_content=e.raw_content)
        for i, e in enumerate(result)
    ]


def order_files_fallback(entries: list[FileEntry]) -> list[OrderedFileEntry]:
    """Fallback: alphabetical sort."""
    sorted_entries = sorted(entries, key=lambda e: e.filepath)
    return [
        OrderedFileEntry(position=i + 1, filepath=e.filepath, raw_content=e.raw_content)
        for i, e in enumerate(sorted_entries)
    ]


async def order_files(entries: list[FileEntry], llm_client) -> tuple[list[OrderedFileEntry], list]:
    """Call LLM to determine reading order. Retry once, then fallback.
    Returns (ordered_entries, list_of_LLMResponses)."""
    file_list = "\n".join(e.filepath for e in entries)
    responses = []

    for attempt in range(2):
        try:
            response = await llm_client.call(ORDERING_SYSTEM_PROMPT, file_list)
            responses.append(response)
            parsed = parse_json(response.text)
            if parsed and isinstance(parsed, dict) and "ordered_files" in parsed:
                return validate_ordering(parsed["ordered_files"], entries), responses
        except Exception:
            logger.warning(f"Ordering attempt {attempt + 1} failed")

    logger.warning("Ordering unparseable after retry, using alphabetical fallback")
    return order_files_fallback(entries), responses
