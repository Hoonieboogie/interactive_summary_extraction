"""Pipeline v2 — Map-Reduce Summarization. Main orchestrator."""
import argparse
import asyncio
import logging
import os
import time
from pathlib import Path

from config import get_model_config, DEFAULT_MODEL
from llm_client import LLMClient
from server import start_server, stop_server, wait_for_server, VLLM_PORT
from stage1_discovery import discover_files
from stage1_ordering import order_files, order_files_fallback
from stage2_map import summarize_file
from stage3_reduce import merge_summaries
from stage4_output import save_result, save_skipped_content

logger = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pipeline v2 — Map-Reduce Summarization")
    parser.add_argument("--content-dir", type=Path, required=True, help="Path to content folders")
    parser.add_argument("--output-dir", type=Path, default=Path("./results"), help="Output directory")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model name")
    parser.add_argument("--content-ids", nargs="+", default=None, help="Specific content folder names")
    parser.add_argument("--num-gpus", type=int, default=1, help="Number of GPUs for tensor parallelism")
    parser.add_argument("--skip-server", action="store_true", help="Use existing vLLM server")
    return parser.parse_args(argv)


async def process_content(
    content_dir: Path, output_dir: Path, model_name: str, llm: LLMClient,
    max_model_len: int = 65536,
) -> dict | None:
    """Process a single content folder through all stages. Returns None if skipped."""
    content_id = content_dir.name
    logger.info(f"Processing: {content_id}")
    t_total = time.monotonic()

    # Stage 1: File Discovery
    entries = discover_files(content_dir)

    if not entries:
        # Log to skipped_contents.json
        file_types = list({
            Path(f).suffix for f in os.listdir(content_dir)
            if os.path.isfile(content_dir / f)
        })
        save_skipped_content(output_dir, content_id, file_types)
        logger.info(f"Skipped {content_id}: no text-readable files")
        return None

    # Stage 1: Ordering
    t_ordering = time.monotonic()
    ordered_entries, ordering_responses = await order_files(entries, llm)
    wall_ordering = round(time.monotonic() - t_ordering, 2)
    all_responses = list(ordering_responses)
    llm_calls = len(ordering_responses)

    # Stage 2: Per-File Summarization (Map)
    t_map = time.monotonic()
    total_files = len(ordered_entries)
    file_summaries = []
    total_overflow_retries = 0
    for entry in ordered_entries:
        summary, responses, overflow_retries = await summarize_file(
            entry, total_files, llm, max_model_len
        )
        file_summaries.append(summary)
        all_responses.extend(responses)
        llm_calls += len(responses)
        total_overflow_retries += overflow_retries
    wall_map = round(time.monotonic() - t_map, 2)

    # Stage 3: Recursive Merge (Reduce)
    t_reduce = time.monotonic()
    merge_result, merge_responses = await merge_summaries(file_summaries, llm)
    wall_reduce = round(time.monotonic() - t_reduce, 2)
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
    save_result(output_dir, model_name, content_id, merge_result, llm_calls, metrics)
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
            await process_content(folder, args.output_dir, args.model, llm, model_cfg.max_model_len)

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
