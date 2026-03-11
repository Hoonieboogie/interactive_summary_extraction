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
    ordered_entries, ordering_response = await order_files(entries, llm)

    # Stage 2: Per-File Summarization (Map)
    # Conservative chunk size: max_model_len * 2 chars (~2 chars/token for mixed content)
    # Ensures first split produces multiple chunks for overflowing files
    initial_chunk_size = max_model_len * 2
    total_files = len(ordered_entries)
    file_summaries = []
    for entry in ordered_entries:
        summary, responses = await summarize_file(entry, total_files, llm, initial_chunk_size)
        file_summaries.append(summary)

    # Stage 3: Recursive Merge (Reduce)
    merge_result, merge_responses = await merge_summaries(file_summaries, llm)

    # Stage 4: Output
    save_result(output_dir, model_name, content_id, merge_result)
    logger.info(f"Done: {content_id}")

    return {
        "content_id": content_id,
        "summary": merge_result.summary,
        "keywords": merge_result.keywords,
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
