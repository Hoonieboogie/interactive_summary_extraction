import pytest
import json
import os
import tempfile
from compare import print_terminal_report, generate_html_report


SAMPLE_RESULTS = {
    "exaone4-32b": [
        {
            "content_id": "test_content_1",
            "summary": "주제: 수학. 활동: 문제 풀기. 목표: 수학 실력 향상",
            "input_chars": 45000,
            "prompt_tokens": 12000,
            "completion_tokens": 50,
            "latency_ms": 1500,
        },
        {
            "content_id": "test_content_2",
            "summary": "주제: 과학. 활동: 실험. 목표: 과학적 사고력",
            "input_chars": 30000,
            "prompt_tokens": 8000,
            "completion_tokens": 45,
            "latency_ms": 1200,
        },
    ],
    "qwen3-32b": [
        {
            "content_id": "test_content_1",
            "summary": "수학 기초를 배운다. 연습 문제를 풀어본다. 수학 능력을 기른다",
            "input_chars": 45000,
            "prompt_tokens": 11500,
            "completion_tokens": 48,
            "latency_ms": 1800,
        },
        {
            "content_id": "test_content_2",
            "summary": "과학 원리를 학습한다. 실험을 수행한다. 탐구력을 키운다",
            "input_chars": 30000,
            "prompt_tokens": 7800,
            "completion_tokens": 42,
            "latency_ms": 1100,
        },
    ],
}


class TestTerminalReport:
    def test_prints_without_error(self, capsys):
        print_terminal_report(SAMPLE_RESULTS)
        captured = capsys.readouterr()
        assert "test_content_1" in captured.out
        assert "test_content_2" in captured.out


class TestHtmlReport:
    def test_generates_html_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            outpath = os.path.join(tmpdir, "comparison.html")
            generate_html_report(SAMPLE_RESULTS, outpath)

            assert os.path.exists(outpath)
            with open(outpath, 'r') as f:
                html = f.read()
            assert "test_content_1" in html
            assert "test_content_2" in html
            assert "수학" in html
            assert "과학" in html

    def test_html_contains_all_models(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            outpath = os.path.join(tmpdir, "comparison.html")
            generate_html_report(SAMPLE_RESULTS, outpath)

            with open(outpath, 'r') as f:
                html = f.read()
            assert "exaone4-32b" in html
            assert "qwen3-32b" in html
