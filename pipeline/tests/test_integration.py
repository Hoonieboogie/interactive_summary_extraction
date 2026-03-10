# pipeline/tests/test_integration.py
"""Integration tests using actual sample content (pre-filter only, no LLM)."""

import os
import re
import pytest
from prefilter import prefilter_folder

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'sample_contents')


@pytest.mark.skipif(
    not os.path.isdir(SAMPLE_DIR),
    reason="sample_contents directory not found"
)
class TestPrefilterIntegration:
    def _get_content_dirs(self):
        return [
            d for d in sorted(os.listdir(SAMPLE_DIR))
            if os.path.isdir(os.path.join(SAMPLE_DIR, d)) and not d.startswith('.')
        ]

    def test_all_samples_produce_output(self):
        """Every sample folder should produce non-empty pre-filtered text."""
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            assert len(text) > 0, f"{cid} produced empty output"

    def test_svg_and_css_removed(self):
        """Pre-filtered output should not contain SVG blocks."""
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            assert '<svg' not in text.lower(), f"{cid} still contains SVG blocks"

    def test_korean_text_preserved(self):
        """Pre-filtered output should contain Korean text."""
        korean_found = False
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            if re.search(r'[\uac00-\ud7af]', text):
                korean_found = True
                break
        assert korean_found, "No Korean text found in any sample"

    def test_output_sizes_reasonable(self):
        """Pre-filtered output should be within reasonable size range."""
        for cid in self._get_content_dirs():
            folder = os.path.join(SAMPLE_DIR, cid)
            text = prefilter_folder(folder)
            assert len(text) < 5_000_000, f"{cid} output too large: {len(text)} chars"
            print(f"  {cid}: {len(text):,} chars")
