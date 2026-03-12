"""Stage 2 — Per-File Summarization (Map). Each file -> LLM -> summary."""
import logging
from dataclasses import dataclass

from stage1_ordering import OrderedFileEntry
from llm_client import LLMClient, LLMResponse, ContextOverflowError
from json_parser import parse_json

logger = logging.getLogger(__name__)

PERFILE_SYSTEM_PROMPT = """당신은 교육 콘텐츠 분석 전문가입니다.
주어진 파일의 내용을 분석하고, 교육적 내용이 있는지 판단한 후 요약하세요.

반드시 다음 JSON 형식으로 응답하세요:
{"has_educational_content": true/false, "summary": "요약 내용"}

- has_educational_content: 교육/학습 관련 내용이 있으면 true, CSS/JS/설정 코드만 있으면 false
- summary: 파일 내용의 핵심을 1-2문장으로 요약"""

CHUNK_SYSTEM_PROMPT = """Summarize the following portion of a file. Focus on any educational content. Respond with a plain text summary."""

CHUNK_MERGE_SYSTEM_PROMPT = """Combine these chunk summaries into a single coherent summary for this file. Preserve all educational content.

반드시 다음 JSON 형식으로 응답하세요:
{"has_educational_content": true/false, "summary": "통합 요약"}"""


@dataclass
class FileSummary:
    filepath: str
    position: int
    has_educational_content: bool
    summary: str


def split_into_chunks(content: str, chunk_size: int) -> list[str]:
    """Split content by character count at newline boundaries.
    Lines longer than chunk_size are force-split at chunk_size boundaries."""
    if len(content) <= chunk_size:
        return [content]

    chunks = []
    lines = content.split("\n")
    current_chunk = []
    current_size = 0

    for line in lines:
        line_len = len(line) + 1  # +1 for newline

        # Force-split lines longer than chunk_size (e.g. minified JS)
        if line_len > chunk_size:
            # Flush current chunk first
            if current_chunk:
                chunks.append("\n".join(current_chunk))
                current_chunk = []
                current_size = 0
            # Split the long line into fixed-size pieces
            for i in range(0, len(line), chunk_size):
                chunks.append(line[i:i + chunk_size])
            continue

        if current_size + line_len > chunk_size and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_size = 0
        current_chunk.append(line)
        current_size += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def parse_file_summary(raw: str) -> FileSummary:
    """Parse LLM response into FileSummary. Fallback: treat entire response as educational summary."""
    parsed = parse_json(raw)
    if parsed and isinstance(parsed, dict) and "summary" in parsed:
        return FileSummary(
            filepath="",
            position=0,
            has_educational_content=parsed.get("has_educational_content", True),
            summary=parsed["summary"],
        )
    # Safe default -- don't lose content
    return FileSummary(filepath="", position=0, has_educational_content=True, summary=raw)


def _build_user_message(entry: OrderedFileEntry, total_files: int) -> str:
    return f"""[파일 정보]
경로: {entry.filepath}
위치: {entry.position} / {total_files}

[파일 내용]
{entry.raw_content}"""


MIN_CHUNK_SIZE = 10_000  # Floor to prevent infinite splitting


async def _summarize_chunks(
    chunks: list[str], llm: LLMClient,
) -> tuple[list[str], list[LLMResponse], int]:
    """Summarize each chunk individually. Halve on overflow.
    Returns (plain text summaries, responses, overflow_retries)."""
    summaries = []
    responses = []
    overflow_retries = 0

    pending = list(chunks)

    while pending:
        chunk = pending.pop(0)
        try:
            resp = await llm.call(CHUNK_SYSTEM_PROMPT, chunk)
            summaries.append(resp.text)
            responses.append(resp)
        except ContextOverflowError:
            overflow_retries += 1
            chunk_size = len(chunk) // 2
            if chunk_size < MIN_CHUNK_SIZE:
                chunk_size = MIN_CHUNK_SIZE
            if len(chunk) <= MIN_CHUNK_SIZE:
                logger.error(
                    f"Chunk still overflows at minimum size ({len(chunk)} chars), skipping"
                )
                summaries.append("[Content too large to summarize]")
                continue
            logger.warning(
                f"Chunk overflow ({len(chunk)} chars), halving to {chunk_size} chars"
            )
            sub_chunks = split_into_chunks(chunk, chunk_size)
            pending = sub_chunks + pending

    return summaries, responses, overflow_retries


async def summarize_file(
    entry: OrderedFileEntry,
    total_files: int,
    llm: LLMClient,
    max_model_len: int = 65536,
) -> tuple[FileSummary, list[LLMResponse], int]:
    """Summarize a single file. Self-correcting: chunk on overflow.
    Returns (summary, responses, overflow_retries)."""
    user_msg = _build_user_message(entry, total_files)
    all_responses = []
    overflow_retries = 0

    # Try sending entire file
    initial_chunk_size = None
    try:
        resp = await llm.call(PERFILE_SYSTEM_PROMPT, user_msg)
        all_responses.append(resp)
        result = parse_file_summary(resp.text)

        # Retry once if unparseable
        if result.summary == resp.text:  # fallback was used
            resp2 = await llm.call(PERFILE_SYSTEM_PROMPT, user_msg)
            all_responses.append(resp2)
            result2 = parse_file_summary(resp2.text)
            if result2.summary != resp2.text:
                result = result2

        result.filepath = entry.filepath
        result.position = entry.position
        return result, all_responses, 0

    except ContextOverflowError:
        overflow_retries += 1
        logger.info(f"File {entry.filepath} overflows context, chunking...")
        initial_chunk_size = len(entry.raw_content) // 2
        if initial_chunk_size < MIN_CHUNK_SIZE:
            initial_chunk_size = MIN_CHUNK_SIZE

    # Chunk and summarize
    chunks = split_into_chunks(entry.raw_content, initial_chunk_size)
    chunk_summaries, chunk_responses, chunk_overflows = await _summarize_chunks(
        chunks, llm
    )
    overflow_retries += chunk_overflows
    all_responses.extend(chunk_responses)

    # Merge chunk summaries — pairwise fallback if too many summaries overflow context
    try:
        merged_text = "\n\n".join(f"Chunk {i+1}:\n{s}" for i, s in enumerate(chunk_summaries))
        merge_resp = await llm.call(CHUNK_MERGE_SYSTEM_PROMPT, merged_text)
        all_responses.append(merge_resp)
    except ContextOverflowError:
        logger.warning(
            f"Chunk merge overflow ({len(chunk_summaries)} summaries), merging pairwise"
        )
        # Iterative pairwise merge until all summaries fit in one call
        current = list(chunk_summaries)
        while len(current) > 1:
            next_level = []
            for i in range(0, len(current), 2):
                group = current[i:i + 2]
                group_text = "\n\n".join(f"Chunk:\n{s}" for s in group)
                try:
                    resp = await llm.call(CHUNK_MERGE_SYSTEM_PROMPT, group_text)
                    all_responses.append(resp)
                    next_level.append(resp.text)
                except ContextOverflowError:
                    # Individual pair too large — carry forward separately for next round
                    logger.warning("Pair merge overflow, carrying summaries forward")
                    next_level.extend(group)
            current = next_level
        merge_resp = LLMResponse(text=current[0], prompt_tokens=0, completion_tokens=0)

    result = parse_file_summary(merge_resp.text)
    result.filepath = entry.filepath
    result.position = entry.position
    return result, all_responses, overflow_retries
