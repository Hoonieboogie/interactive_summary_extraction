"""Universal pre-filter for educational HTML/JS content.

Strips provably non-educational data (SVG, CSS, styles, comments)
while preserving text, media references, and educational content.
"""

import os
import re


def strip_svg(text: str) -> str:
    """Remove <svg>...</svg> blocks."""
    return re.sub(r'<svg[\s\S]*?</svg>', '', text, flags=re.IGNORECASE)


def strip_css(text: str) -> str:
    """Remove <style>...</style> blocks."""
    return re.sub(r'<style[\s\S]*?</style>', '', text, flags=re.IGNORECASE)


def strip_inline_styles(text: str) -> str:
    """Remove style=\"...\" attributes from tags."""
    return re.sub(r'\s*style="[^"]*"', '', text)


def strip_comments(text: str) -> str:
    """Remove HTML comments <!-- ... -->."""
    return re.sub(r'<!--[\s\S]*?-->', '', text)


def strip_svg_paths(text: str) -> str:
    """Remove SVG path data attributes d=\"...\"."""
    return re.sub(r'\s*d="[^"]*"', '', text)


_KOREAN_RE = re.compile(r'[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]')


def strip_long_minified_lines(text: str, max_len: int = 500) -> str:
    """Remove lines longer than max_len that contain no Korean text."""
    lines = text.split('\n')
    kept = []
    for line in lines:
        if len(line) > max_len and not _KOREAN_RE.search(line):
            continue
        kept.append(line)
    return '\n'.join(kept)


def prefilter_text(text: str) -> str:
    """Apply all pre-filter stages to raw text."""
    text = strip_comments(text)
    text = strip_svg(text)
    text = strip_css(text)
    text = strip_svg_paths(text)
    text = strip_inline_styles(text)
    text = strip_long_minified_lines(text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


_TARGET_EXTENSIONS = {'.html', '.js', '.json'}


def prefilter_folder(folder_path: str) -> str:
    """Read all .html/.js/.json files from a content folder, apply pre-filter."""
    parts: list[str] = []

    for root, _dirs, files in os.walk(folder_path):
        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in _TARGET_EXTENSIONS:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                if content.strip():
                    rel = os.path.relpath(fpath, folder_path)
                    parts.append(f"--- FILE: {rel} ---\n{content}")
            except (OSError, UnicodeDecodeError):
                continue

    raw = '\n\n'.join(parts)
    return prefilter_text(raw)
