"""Stage 4 — Output. Saves per-content JSON results and skipped content log."""
import json
from pathlib import Path

from stage3_reduce import MergeResult

SKIPPED_FILENAME = "skipped_contents.json"


def save_result(
    output_dir: Path, model_name: str, content_id: str, result: MergeResult,
    llm_calls: int = 0,
) -> Path:
    """Save one JSON file per content at <output-dir>/<model>/<content_id>.json."""
    model_dir = Path(output_dir) / model_name
    model_dir.mkdir(parents=True, exist_ok=True)

    output = {
        "content_id": content_id,
        "model": model_name,
        "summary": result.summary,
        "keywords": result.keywords,
        "llm_calls": llm_calls,
    }

    output_path = model_dir / f"{content_id}.json"
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


def load_skipped_contents(output_dir: Path) -> list[dict]:
    """Load existing skipped contents log."""
    path = Path(output_dir) / SKIPPED_FILENAME
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_skipped_content(
    output_dir: Path, content_id: str, file_types: list[str]
) -> None:
    """Append a skipped content entry to skipped_contents.json."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    entries = load_skipped_contents(output_dir)
    entries.append({
        "content_id": content_id,
        "reason": "no_text_files",
        "file_types_found": file_types,
    })

    path = output_dir / SKIPPED_FILENAME
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
