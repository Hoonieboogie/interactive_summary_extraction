"""Pipeline v2 — Map-Reduce Summarization. Main orchestrator."""
import argparse
import asyncio
import logging
import os
import time
from pathlib import Path

import httpx

from config import get_model_config, DEFAULT_MODEL
from llm_client import LLMClient, ContextOverflowError
from server import start_server, stop_server, wait_for_server, VLLM_PORT
from stage1_discovery import discover_files
from stage1_ordering import order_files, order_files_fallback
from stage2_map import summarize_file
from stage3_reduce import merge_summaries
from stage4_output import save_result, save_skipped_content
import progress_log

logger = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pipeline v2 — Map-Reduce Summarization")
    parser.add_argument("--content-dir", type=Path, required=True, help="Path to content folders")
    parser.add_argument("--output-dir", type=Path, default=Path("./results"), help="Output directory")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model name")
    parser.add_argument("--content-ids", nargs="+", default=None, help="Specific content folder names")
    parser.add_argument("--num-gpus", type=int, default=1, help="Number of GPUs for tensor parallelism")
    parser.add_argument("--skip-server", action="store_true", help="Use existing vLLM server")
    parser.add_argument("--map-concurrency", type=int, default=4, help="Max concurrent files in map phase")
    return parser.parse_args(argv)


async def process_content(
    content_dir: Path, output_dir: Path, model_name: str, llm: LLMClient,
    map_concurrency: int = 4,
) -> dict | None:
    """Process a single content folder through all stages. Returns None if skipped."""
    content_id = content_dir.name
    logger.info(f"Processing: {content_id}")
    t_total = time.monotonic()

    progress_log.init(output_dir, model_name, content_id)

    # Stage 1: File Discovery
    progress_log.stage("DISCOVERY_START", f"dir={content_dir}")
    entries = discover_files(content_dir)

    if not entries:
        file_types = list({
            Path(f).suffix for f in os.listdir(content_dir)
            if os.path.isfile(content_dir / f)
        })
        save_skipped_content(output_dir, content_id, file_types)
        progress_log.event("SKIPPED", f"no text-readable files, types={file_types}")
        logger.info(f"Skipped {content_id}: no text-readable files")
        return None

    progress_log.stage("DISCOVERY_DONE", f"files={len(entries)}, types={list({Path(e.filepath).suffix for e in entries})}")

    # Stage 1: Ordering
    progress_log.stage("ORDERING_START", f"files={len(entries)}")
    t_ordering = time.monotonic()
    ordered_entries, ordering_responses = await order_files(entries, llm)
    wall_ordering = round(time.monotonic() - t_ordering, 2)
    all_responses = list(ordering_responses)
    llm_calls = len(ordering_responses)
    progress_log.stage("ORDERING_DONE", f"wall={wall_ordering}s, llm_calls={llm_calls}")
    progress_log.save_intermediate("ordering", "file_order.json", {
        "wall_seconds": wall_ordering,
        "llm_calls": llm_calls,
        "ordered_files": [{"pos": e.position, "path": e.filepath, "chars": len(e.raw_content)} for e in ordered_entries],
    })

    # Stage 2: Per-File Summarization (Map) — parallel
    progress_log.stage("MAP_START", f"files={len(ordered_entries)}, concurrency={map_concurrency}")
    t_map = time.monotonic()
    total_files = len(ordered_entries)
    file_summaries = []
    total_overflow_retries = 0

    sem = asyncio.Semaphore(map_concurrency)

    async def _summarize_one(entry):
        async with sem:
            return await summarize_file(entry, total_files, llm)

    results = await asyncio.gather(
        *[_summarize_one(e) for e in ordered_entries],
        return_exceptions=True,
    )

    for i, result in enumerate(results):
        filepath = ordered_entries[i].filepath
        if isinstance(result, Exception):
            if isinstance(result, (httpx.HTTPError, ContextOverflowError, OSError)):
                logger.warning(f"File {filepath} failed ({type(result).__name__}), skipping")
                progress_log.event("MAP_FILE_FAIL", f"{filepath} error={type(result).__name__}")
            else:
                logger.error(
                    f"Unexpected error summarizing {filepath}, skipping",
                    exc_info=(type(result), result, result.__traceback__),
                )
                progress_log.event("MAP_FILE_FAIL", f"{filepath} error={type(result).__name__}: {result}")
            continue
        summary, responses, overflow_retries = result
        file_summaries.append(summary)
        all_responses.extend(responses)
        llm_calls += len(responses)
        total_overflow_retries += overflow_retries
        progress_log.event("MAP_FILE_DONE", f"{filepath} llm_calls={len(responses)}, overflows={overflow_retries}, edu={summary.has_educational_content}")
        # Save per-file intermediate
        safe_name = filepath.replace("/", "_").replace("\\", "_")
        progress_log.save_intermediate("map", f"{i:03d}_{safe_name}.json", {
            "filepath": filepath,
            "position": summary.position,
            "has_educational_content": summary.has_educational_content,
            "summary": summary.summary[:500],  # truncate for readability
            "summary_full_length": len(summary.summary),
            "llm_calls": len(responses),
            "overflow_retries": overflow_retries,
            "latencies": [round(r.duration_seconds, 2) for r in responses],
            "tokens": [{"prompt": r.prompt_tokens, "completion": r.completion_tokens} for r in responses],
        })
    wall_map = round(time.monotonic() - t_map, 2)

    progress_log.stage("MAP_DONE", f"wall={wall_map}s, files_ok={len(file_summaries)}/{len(ordered_entries)}, overflows={total_overflow_retries}")

    if not file_summaries:
        progress_log.event("ABORT", "all files failed")
        logger.error(f"All files failed for {content_id}, skipping content")
        return None

    # Stage 3: Recursive Merge (Reduce)
    progress_log.stage("REDUCE_START", f"summaries={len(file_summaries)}")
    t_reduce = time.monotonic()
    merge_result, merge_responses = await merge_summaries(file_summaries, llm)
    wall_reduce = round(time.monotonic() - t_reduce, 2)
    progress_log.stage("REDUCE_DONE", f"wall={wall_reduce}s, llm_calls={len(merge_responses)}")
    progress_log.save_intermediate("reduce", "final_merge.json", {
        "wall_seconds": wall_reduce,
        "llm_calls": len(merge_responses),
        "summary": merge_result.summary,
        "keywords": merge_result.keywords,
        "latencies": [round(r.duration_seconds, 2) for r in merge_responses],
        "tokens": [{"prompt": r.prompt_tokens, "completion": r.completion_tokens} for r in merge_responses],
    })
    all_responses.extend(merge_responses)
    llm_calls += len(merge_responses)

    wall_total = round(time.monotonic() - t_total, 2)

    # Compute latency stats from all LLM responses
    durations = [r.duration_seconds for r in all_responses]
    latency_stats = {
        "total": round(sum(durations), 2),
        "avg": round(sum(durations) / len(durations), 2) if durations else 0,
        "max": round(max(durations), 2) if durations else 0,
        "min": round(min(durations), 2) if durations else 0,
    }

    metrics = {
        "wall_clock_seconds": {
            "total": wall_total,
            "ordering": wall_ordering,
            "map": wall_map,
            "reduce": wall_reduce,
        },
        "overflow_retries": total_overflow_retries,
        "latency_stats": latency_stats,
    }

    # Stage 4: Output
    progress_log.stage("OUTPUT", f"llm_calls={llm_calls}, wall_total={wall_total}s, keywords={len(merge_result.keywords)}")
    save_result(output_dir, model_name, content_id, merge_result, llm_calls, metrics)
    progress_log.event("PIPELINE_DONE", f"llm_calls={llm_calls}, wall={wall_total}s, overflows={total_overflow_retries}")
    logger.info(f"Done: {content_id} (LLM calls: {llm_calls}, wall: {wall_total}s)")

    return {
        "content_id": content_id,
        "summary": merge_result.summary,
        "keywords": merge_result.keywords,
        "llm_calls": llm_calls,
        "metrics": metrics,
    }


async def run(args: argparse.Namespace) -> None:
    """Run the pipeline."""
    model_cfg = get_model_config(args.model)
    process = None

    try:
        # Start vLLM server if needed
        if not args.skip_server:
            process = start_server(model_cfg, args.num_gpus)
            await wait_for_server()

        llm = LLMClient(
            base_url=f"http://localhost:{VLLM_PORT}",
            model=model_cfg.hf_id,
        )

        # Discover content folders
        content_dir = args.content_dir
        if args.content_ids:
            folders = [content_dir / cid for cid in args.content_ids]
        else:
            folders = sorted([
                d for d in content_dir.iterdir() if d.is_dir()
            ])

        # Process each content folder
        for folder in folders:
            if not folder.is_dir():
                logger.warning(f"Not a directory: {folder}")
                continue
            try:
                await process_content(folder, args.output_dir, args.model, llm, args.map_concurrency)
            except (httpx.HTTPError, ContextOverflowError, OSError) as e:
                logger.warning(f"Content {folder.name} failed ({type(e).__name__}), skipping")
                continue
            except Exception:
                logger.error(f"Unexpected error processing {folder.name}, skipping", exc_info=True)
                continue

        await llm.close()

    finally:
        if process:
            stop_server(process)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
