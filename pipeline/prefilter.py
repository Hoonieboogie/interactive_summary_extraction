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

# Matches quoted strings that contain Korean text
_KOREAN_STRING_RE = re.compile(r'"([^"]*[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f][^"]*)"')


def strip_long_minified_lines(text: str, max_len: int = 500) -> str:
    """Remove lines longer than max_len that contain no Korean text.

    For mega-lines (>50K chars, e.g. minified JSON data.js), extracts only
    the Korean text strings rather than keeping the entire line.
    """
    lines = text.split('\n')
    kept = []
    for line in lines:
        if len(line) <= max_len:
            kept.append(line)
        elif len(line) > 50_000 and _KOREAN_RE.search(line):
            # Mega-line with Korean (e.g. data.js): extract Korean strings only
            strings = _KOREAN_STRING_RE.findall(line)
            if strings:
                kept.append('\n'.join(s for s in strings if _KOREAN_RE.search(s)))
        elif _KOREAN_RE.search(line):
            kept.append(line)
        # else: long line without Korean — drop it
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

# Universally safe file-level skips (not engine-specific)
_SKIP_FILE_RE = re.compile(
    r'(\.min\.js$'     # Minified libraries — universal web convention, never educational
    r'|_\d{8}$'        # Backup files with date suffix (e.g. index.html_20240325)
    r')',
    re.IGNORECASE,
)

# After filtering, files with Korean density below this are framework code
# with scattered Korean UI labels/error messages, not educational content.
# Educational content: 20-60%+ Korean density after filtering.
# Framework code: <3% Korean density after filtering.
_MIN_KOREAN_DENSITY = 0.03


def _count_korean_chars(text: str) -> int:
    """Count the number of Korean characters in text."""
    return len(_KOREAN_RE.findall(text))


def prefilter_folder(folder_path: str) -> str:
    """Read .html/.js/.json files from a content folder, apply pre-filter.

    Engine-agnostic: uses CONTENT-BASED filtering, not directory/file names.
    Each file is independently filtered, then included only if its filtered
    output has sufficient Korean text density (>=3%). This universally
    separates educational content from framework code regardless of
    content engine or directory structure.

    The filtering pipeline per file:
    1. Strip SVG, CSS, comments, inline styles, SVG paths
    2. Extract Korean strings from mega-lines (>50K chars)
    3. Strip long code lines (>500 chars without Korean)
    4. Check Korean density — include only if >=3%
    """
    parts: list[str] = []

    for root, dirs, files in os.walk(folder_path):
        # Only skip node_modules — universally safe, never educational
        dirs[:] = [d for d in dirs if d != 'node_modules']

        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in _TARGET_EXTENSIONS:
                continue
            if _SKIP_FILE_RE.search(fname):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                if not content.strip():
                    continue

                # Filter per file FIRST, then check Korean density
                filtered = prefilter_text(content)
                if not filtered:
                    continue

                korean_count = _count_korean_chars(filtered)
                density = korean_count / len(filtered) if filtered else 0

                if density < _MIN_KOREAN_DENSITY:
                    continue

                rel = os.path.relpath(fpath, folder_path)
                parts.append(f"--- FILE: {rel} ---\n{filtered}")
            except (OSError, UnicodeDecodeError):
                continue

    return '\n\n'.join(parts)
