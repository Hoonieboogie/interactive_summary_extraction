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

# Directories that contain framework/library code, never educational content.
# This is universal across web content frameworks.
_SKIP_DIRS = {'js', 'exe', 'wgts', 'corp', 'css', 'node_modules', 'lib', 'vendor'}

# File patterns that are never educational content
_SKIP_PATTERNS = re.compile(
    r'(\.min\.js$'           # Minified libraries
    r'|_\d{8}$'              # Backup files like index.html_20240325
    r'|player\.js$'          # iSpring player engine (1.7MB, pure framework)
    r'|browsersupport\.js$'  # Browser detection scripts
    r')',
    re.IGNORECASE,
)


def prefilter_folder(folder_path: str) -> str:
    """Read educational .html/.js/.json files from a content folder, apply pre-filter.

    Skips framework directories and library files that never contain
    educational content. Walks subdirectories selectively (e.g. data/slide*.js
    for iSpring) while skipping framework dirs (js/, wgts/, corp/, etc.).
    """
    parts: list[str] = []

    for root, dirs, files in os.walk(folder_path):
        # Skip framework directories (modifying dirs in-place prunes the walk)
        rel_root = os.path.relpath(root, folder_path)
        dirs[:] = [d for d in dirs if d.lower() not in _SKIP_DIRS]

        for fname in sorted(files):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in _TARGET_EXTENSIONS:
                continue
            if _SKIP_PATTERNS.search(fname):
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
