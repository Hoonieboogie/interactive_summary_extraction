# pipeline/main.py
"""Pipeline v5.0 orchestrator.

Usage:
    uv run main.py --content-dir ../sample_contents --output-dir ./results
    uv run main.py --content-dir ../sample_contents --output-dir ./results --models exaone4-32b qwen3-32b
    uv run main.py --content-dir ../sample_contents --output-dir ./results --skip-server
    uv run main.py --content-dir ../sample_contents --output-dir ./results --num-gpus 2
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone

import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn, MofNCompleteColumn

from compare import generate_html_report, print_terminal_report
from config import MODELS, ModelConfig
from prefilter import prefilter_folder
from synthesizer import VLLMServer, call_llm

console = Console()


def discover_contents(content_dir: str) -> list[str]:
    """Find all content subdirectories."""
    entries = []
    for name in sorted(os.listdir(content_dir)):
        path = os.path.join(content_dir, name)
        if os.path.isdir(path) and not name.startswith('.'):
            entries.append(name)
    return entries


def prefilter_all(content_dir: str, content_ids: list[str]) -> dict[str, str]:
    """Pre-filter all content folders. Returns {content_id: filtered_text}."""
    console.print("\n[bold cyan]Stage 1: Pre-filtering content[/bold cyan]")
    filtered = {}
    for cid in content_ids:
        folder = os.path.join(content_dir, cid)
        text = prefilter_folder(folder)
        filtered[cid] = text
        flag = " [yellow](low text)[/yellow]" if len(text) < 100 else ""
        console.print(f"  {cid}: {len(text):,} chars{flag}")
    return filtered


async def process_model(
    model: ModelConfig,
    filtered_contents: dict[str, str],
    output_dir: str,
    skip_server: bool = False,
    num_gpus: int = 1,
) -> list[dict]:
    """Process all contents with a single model. Returns list of result dicts."""
    console.print(f"\n[bold magenta]Stage 2: {model.name}[/bold magenta]")
    console.print(f"  Model: {model.description}")
    if num_gpus > 1:
        console.print(f"  GPUs: {num_gpus} (tensor parallel)")

    server = None
    if not skip_server:
        server = VLLMServer(model, num_gpus=num_gpus)
        server.start()

    results = []
    try:
        async with httpx.AsyncClient() as client:
            with Progress(
                SpinnerColumn(),
                TextColumn("[bold]{task.description}"),
                BarColumn(),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                console=console,
            ) as progress:
                task = progress.add_task(model.name, total=len(filtered_contents))
                for cid, text in filtered_contents.items():
                    progress.update(task, description=f"{model.name} → {cid}")
                    result = await call_llm(client, model.model_id, text)
                    result["content_id"] = cid
                    result["input_chars"] = len(text)
                    result["timestamp"] = datetime.now(timezone.utc).isoformat()
                    results.append(result)

                    if "error" in result:
                        progress.console.print(f"  [red]✗ {cid}: {result['error']}[/red]")
                    else:
                        progress.console.print(
                            f"  [green]✓ {cid}[/green] ({result['latency_ms']}ms, "
                            f"{result.get('prompt_tokens', 0)} tok)"
                        )
                    progress.advance(task)
    finally:
        if server:
            server.stop()

    # Save per-model results
    os.makedirs(output_dir, exist_ok=True)
    outpath = os.path.join(output_dir, f"{model.name}.json")
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    console.print(f"  Saved: {outpath}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Pipeline v5.0 — 3-Model Summary Extraction")
    parser.add_argument("--content-dir", required=True, help="Path to content folders")
    parser.add_argument("--output-dir", default="./results", help="Output directory")
    parser.add_argument(
        "--models",
        nargs="*",
        default=None,
        help="Model names to run (default: all). Choices: "
        + ", ".join(m.name for m in MODELS),
    )
    parser.add_argument(
        "--skip-server",
        action="store_true",
        help="Skip vLLM server management (assumes server already running)",
    )
    parser.add_argument(
        "--num-gpus",
        type=int,
        default=1,
        help="Number of GPUs for tensor parallelism (default: 1)",
    )
    args = parser.parse_args()

    # Resolve models
    if args.models:
        model_map = {m.name: m for m in MODELS}
        selected = []
        for name in args.models:
            if name not in model_map:
                console.print(f"[red]Unknown model: {name}[/red]")
                console.print(f"Available: {', '.join(model_map.keys())}")
                sys.exit(1)
            selected.append(model_map[name])
    else:
        selected = MODELS

    # Discover contents
    content_ids = discover_contents(args.content_dir)
    if not content_ids:
        console.print(f"[red]No content folders found in {args.content_dir}[/red]")
        sys.exit(1)
    console.print(f"\n[bold]Found {len(content_ids)} content folders[/bold]")

    # Stage 1: Pre-filter (once for all models)
    filtered = prefilter_all(args.content_dir, content_ids)

    # Stage 2: Process each model sequentially
    all_results: dict[str, list[dict]] = {}
    total_start = time.monotonic()

    for model in selected:
        results = asyncio.run(
            process_model(model, filtered, args.output_dir, args.skip_server, args.num_gpus)
        )
        all_results[model.name] = results

    total_time = time.monotonic() - total_start

    # Stage 3: Comparison report
    console.print(f"\n[bold green]Stage 3: Comparison Report[/bold green]")
    console.print(f"Total pipeline time: {total_time:.1f}s\n")

    print_terminal_report(all_results)

    html_path = os.path.join(args.output_dir, "comparison.html")
    generate_html_report(all_results, html_path)
    console.print(f"\n[bold]HTML report saved: {html_path}[/bold]")


if __name__ == "__main__":
    main()
