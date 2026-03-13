"""Lightweight file-based progress logger for pipeline observability."""
import json
import time
from pathlib import Path

_log_path: Path | None = None
_intermediates_dir: Path | None = None
_start_time: float = 0.0


def init(output_dir: Path, model_name: str, content_id: str) -> None:
    """Initialize progress log file for a content run."""
    global _log_path, _intermediates_dir, _start_time
    log_dir = output_dir / model_name
    log_dir.mkdir(parents=True, exist_ok=True)
    _log_path = log_dir / f"{content_id}.progress.log"
    _intermediates_dir = log_dir / f"{content_id}.intermediates"
    _intermediates_dir.mkdir(parents=True, exist_ok=True)
    _start_time = time.monotonic()
    # Overwrite previous log
    _log_path.write_text("")
    _write("PIPELINE_START", f"content_id={content_id}, model={model_name}")


def _write(event: str, detail: str = "") -> None:
    if _log_path is None:
        return
    elapsed = round(time.monotonic() - _start_time, 1)
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] +{elapsed}s | {event} | {detail}\n"
    with open(_log_path, "a") as f:
        f.write(line)


def stage(name: str, detail: str = "") -> None:
    _write(f"STAGE_{name}", detail)


def event(name: str, detail: str = "") -> None:
    _write(name, detail)


def save_intermediate(stage_name: str, filename: str, data: dict) -> None:
    """Save intermediate output as a JSON file for post-run analysis."""
    if _intermediates_dir is None:
        return
    stage_dir = _intermediates_dir / stage_name
    stage_dir.mkdir(parents=True, exist_ok=True)
    filepath = stage_dir / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
