"""Universal pre-filter for interactive educational content.

Strips provably non-educational data (SVG, CSS, styles, comments, code)
while preserving natural language text and media references in ANY language.

Language-agnostic: educational value is determined by natural language
density (multi-word phrases in any script), not by any specific language.

Format-agnostic: reads all text-based files (.html, .js, .json, .asp, .xml,
.htm, .txt, .csv) regardless of content engine structure.
"""

import os
import re


# ---------------------------------------------------------------------------
# Text-level stripping (provably non-educational, universal across all web content)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Natural language detection (language-agnostic)
# ---------------------------------------------------------------------------

# Any Unicode letter: Korean, English, Chinese, Japanese, Arabic, Cyrillic, etc.
_LETTER_RE = re.compile(r'[^\W\d_]', re.UNICODE)

# Multi-word natural language phrase: 2+ words separated by spaces (any script)
# Matches: "Learn about math", "거짓 정보를 가려내고", "算数を学ぶ方法"
# Does NOT match: "getElementById", "rgba(255,0,0)", "apn.CImage"
_MULTI_WORD_RE = re.compile(r'[^\W\d_]{2,}(?:\s+[^\W\d_]{2,}){1,}', re.UNICODE)

# CJK characters (Chinese/Japanese/Korean) — these scripts may not use spaces
# between words, so we detect them by character ranges
_CJK_RE = re.compile(
    r'[\uac00-\ud7af'   # Korean Syllables
    r'\u1100-\u11ff'     # Korean Jamo
    r'\u3130-\u318f'     # Korean Compatibility Jamo
    r'\u4e00-\u9fff'     # CJK Unified Ideographs (Chinese/Japanese Kanji)
    r'\u3040-\u309f'     # Hiragana
    r'\u30a0-\u30ff'     # Katakana
    r']'
)

# Quoted strings containing natural language (multi-word or CJK)
_NATURAL_LANG_STRING_RE = re.compile(r'"([^"]{4,})"')


def _has_natural_language(text: str) -> bool:
    """Check if text contains natural language (any language).

    Returns True if text has multi-word phrases OR CJK characters.
    """
    if _MULTI_WORD_RE.search(text):
        return True
    if _CJK_RE.search(text):
        return True
    return False


def _count_natural_lang_chars(text: str) -> int:
    """Count characters that are part of natural language content.

    Counts Unicode letters in multi-word phrases and CJK characters.
    This distinguishes natural language from code identifiers like
    'getElementById' (single word, no spaces).
    """
    count = 0
    # Count chars in multi-word phrases (any script with spaces)
    for match in _MULTI_WORD_RE.finditer(text):
        count += sum(1 for c in match.group() if _LETTER_RE.match(c))
    # Count CJK characters (may not use spaces)
    count += len(_CJK_RE.findall(text))
    return count


# ---------------------------------------------------------------------------
# Line-level filtering
# ---------------------------------------------------------------------------

def strip_long_minified_lines(text: str, max_len: int = 500) -> str:
    """Remove long lines that contain no natural language text.

    For mega-lines (>50K chars, e.g. minified JSON), extracts only
    quoted strings containing natural language in any script.

    Language-agnostic: works with Korean, English, Chinese, Japanese, etc.
    """
    lines = text.split('\n')
    kept = []
    for line in lines:
        if len(line) <= max_len:
            kept.append(line)
        elif len(line) > 50_000:
            # Mega-line: extract all natural language strings
            strings = _NATURAL_LANG_STRING_RE.findall(line)
            nl_strings = [s for s in strings if _has_natural_language(s)]
            if nl_strings:
                kept.append('\n'.join(nl_strings))
        elif _has_natural_language(line):
            kept.append(line)
        # else: long line without natural language — drop it
    return '\n'.join(kept)


# ---------------------------------------------------------------------------
# Full text filter pipeline
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Folder-level filtering (format-agnostic, language-agnostic)
# ---------------------------------------------------------------------------

# All text-based web content formats (not just HTML/JS)
_TARGET_EXTENSIONS = {
    '.html', '.htm',       # HTML pages
    '.js',                 # JavaScript (data files, slide scripts)
    '.json',               # JSON data
    '.asp',                # Active Server Pages (text-based)
    '.xml',                # XML data/config
    '.txt',                # Plain text
    '.csv',                # Tabular data
    '.xhtml',              # XHTML
    '.svg',                # SVG as standalone file (will be stripped by text filter)
    '.php',                # PHP (text-based server pages)
    '.jsp',                # Java Server Pages
}

# Universally safe file-level skips
_SKIP_FILE_RE = re.compile(
    r'(\.min\.js$'         # Minified libraries — universal web convention
    r'|\.min\.css$'        # Minified CSS
    r'|_\d{8}$'            # Backup files with date suffix
    r')',
    re.IGNORECASE,
)

# After filtering, files with natural language density below this threshold
# are framework/library code, not educational content.
# Educational content: 15-60%+ natural language density after filtering.
# Framework code: <5% natural language density after filtering.
_MIN_NL_DENSITY = 0.05


def prefilter_folder(folder_path: str) -> str:
    """Read text-based files from a content folder, apply pre-filter.

    Fully engine-agnostic and language-agnostic:
    - Reads ALL text-based file formats (html, js, json, asp, xml, etc.)
    - Filters each file independently (strip SVG/CSS/comments/styles/code)
    - Includes only files with sufficient natural language density (>=5%)
    - Natural language = multi-word phrases in any script OR CJK characters
    - Does NOT assume any directory structure or content engine

    Works for: Aspen, iSpring, custom HTML5, ASP-based, Flash wrappers,
    or any unknown content engine.
    """
    parts: list[str] = []

    for root, dirs, files in os.walk(folder_path):
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

                # Filter per file, then check natural language density
                filtered = prefilter_text(content)
                if not filtered:
                    continue

                nl_chars = _count_natural_lang_chars(filtered)
                density = nl_chars / len(filtered)

                if density < _MIN_NL_DENSITY:
                    continue

                rel = os.path.relpath(fpath, folder_path)
                parts.append(f"--- FILE: {rel} ---\n{filtered}")
            except (OSError, UnicodeDecodeError):
                continue

    return '\n\n'.join(parts)
