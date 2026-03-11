"""Stage 3 — Recursive Merge (Reduce). Merges per-file summaries into final result."""
import logging
from dataclasses import dataclass, field

from stage2_map import FileSummary
from llm_client import LLMClient, LLMResponse, ContextOverflowError
from json_parser import parse_json

logger = logging.getLogger(__name__)

FINAL_MERGE_SYSTEM_PROMPT = """당신은 교육 콘텐츠 요약 전문가입니다.
아래는 하나의 교육 콘텐츠를 구성하는 파일들의 개별 요약입니다.
이 요약들을 종합하여 전체 콘텐츠의 최종 요약과 키워드를 생성하세요.

반드시 다음 JSON 형식으로 응답하세요:
{"summary": "정확히 3줄로 요약 (줄1. 줄2. 줄3)", "keywords": ["키워드1", "키워드2", ...]}

- summary: 전체 교육 내용을 정확히 3문장으로 요약
- keywords: 핵심 키워드 최대 10개"""

INTERMEDIATE_MERGE_SYSTEM_PROMPT = """아래 요약들을 하나의 문단 길이 요약으로 통합하고 키워드를 추출하세요.

반드시 다음 JSON 형식으로 응답하세요:
{"summary": "통합 요약 (문단 길이)", "keywords": ["키워드1", "키워드2", ...]}"""

FINAL_PAIRWISE_SYSTEM_PROMPT = """아래 요약을 정확히 3줄로 압축하고, 제공된 키워드 풀에서 최적의 키워드를 최대 10개 선택하세요.

반드시 다음 JSON 형식으로 응답하세요:
{"summary": "줄1. 줄2. 줄3", "keywords": ["키워드1", "키워드2", ...]}"""


@dataclass
class MergeResult:
    summary: str
    keywords: list[str] = field(default_factory=list)


def parse_merge_result(raw: str) -> MergeResult:
    """Parse merge response. Fallback: entire response as summary, empty keywords."""
    parsed = parse_json(raw)
    if parsed and isinstance(parsed, dict) and "summary" in parsed:
        return MergeResult(
            summary=parsed["summary"],
            keywords=parsed.get("keywords", []),
        )
    return MergeResult(summary=raw, keywords=[])


def _build_summaries_text(summaries: list[FileSummary]) -> str:
    parts = []
    for s in summaries:
        label = "교육" if s.has_educational_content else "비교육"
        parts.append(f"[{s.position}] {s.filepath} ({label}): {s.summary}")
    return "\n".join(parts)


async def pairwise_tree_merge(
    summary_texts: list[str], llm: LLMClient
) -> tuple[MergeResult, list[LLMResponse]]:
    """Pairwise tree merge with keyword accumulation."""
    all_responses = []
    all_keywords = []
    current = summary_texts

    while len(current) > 1:
        next_level = []
        i = 0
        while i < len(current):
            if i + 1 < len(current):
                # Merge pair
                pair_text = f"Summary A:\n{current[i]}\n\nSummary B:\n{current[i+1]}"
                for attempt in range(2):
                    resp = await llm.call(INTERMEDIATE_MERGE_SYSTEM_PROMPT, pair_text)
                    all_responses.append(resp)
                    result = parse_merge_result(resp.text)
                    if result.summary != resp.text or attempt == 1:
                        break
                all_keywords.extend(result.keywords)
                next_level.append(result.summary)
                i += 2
            else:
                # Odd one: carry forward
                next_level.append(current[i])
                i += 1
        current = next_level

    # Final merge: condense to 3 lines + select best keywords
    final_text = f"Summary:\n{current[0]}\n\nAccumulated keywords:\n{', '.join(all_keywords)}"
    for attempt in range(2):
        resp = await llm.call(FINAL_PAIRWISE_SYSTEM_PROMPT, final_text)
        all_responses.append(resp)
        result = parse_merge_result(resp.text)
        if result.summary != resp.text or attempt == 1:
            break

    return result, all_responses


async def merge_summaries(
    summaries: list[FileSummary], llm: LLMClient
) -> tuple[MergeResult, list[LLMResponse]]:
    """Merge all per-file summaries into final result."""
    # No educational content -> skip merge
    if all(not s.has_educational_content for s in summaries):
        return MergeResult(
            summary="교육 및 학습과 관련된 내용이 없는 콘텐츠입니다.",
            keywords=[],
        ), []

    summaries_text = _build_summaries_text(summaries)
    all_responses = []

    # Try single merge
    try:
        for attempt in range(2):
            resp = await llm.call(FINAL_MERGE_SYSTEM_PROMPT, summaries_text)
            all_responses.append(resp)
            result = parse_merge_result(resp.text)
            if result.summary != resp.text or attempt == 1:
                break
        return result, all_responses
    except ContextOverflowError:
        logger.info("Summaries overflow context, falling back to pairwise merge")

    # Pairwise tree merge
    texts = [f"{s.filepath}: {s.summary}" for s in summaries]
    result, pw_responses = await pairwise_tree_merge(texts, llm)
    all_responses.extend(pw_responses)
    return result, all_responses
