"""Stage 1 — File Discovery. Reads all text files from a content folder."""
import os
import logging
from dataclasses import dataclass
from pathlib import Path

from charset_normalizer import from_bytes

logger = logging.getLogger(__name__)


@dataclass
class FileEntry:
    filepath: str  # relative path from content root
    raw_content: str


def _try_read_text(file_path: Path) -> str | None:
    """Try reading a file as text. Returns content or None if binary."""
    raw = file_path.read_bytes()

    # Null bytes indicate binary content
    if b"\x00" in raw:
        return None

    # Try UTF-8 first
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        pass

    # Auto-detect encoding
    result = from_bytes(raw).best()
    if result is not None:
        return str(result)

    return None


def discover_files(content_dir: Path) -> list[FileEntry]:
    """Walk content directory, read all text files. Skip binary."""
    entries = []
    content_dir = Path(content_dir)

    for root, _dirs, filenames in os.walk(content_dir):
        for filename in filenames:
            file_path = Path(root) / filename
            relative = str(file_path.relative_to(content_dir))

            content = _try_read_text(file_path)
            if content is None:
                logger.info(f"{relative}: cannot read as text (binary or encoding error)")
                continue

            entries.append(FileEntry(filepath=relative, raw_content=content))

    return entries
