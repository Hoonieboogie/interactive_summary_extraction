import pytest
from prefilter import strip_svg, strip_css, strip_inline_styles, strip_comments, strip_svg_paths, strip_long_minified_lines, prefilter_text, prefilter_folder
import os
import tempfile


class TestStripSvg:
    def test_removes_svg_block(self):
        html = '<div>Hello</div><svg xmlns="..."><path d="M0,0"/></svg><p>World</p>'
        assert strip_svg(html) == '<div>Hello</div><p>World</p>'

    def test_removes_multiline_svg(self):
        html = '<div>Keep\n<svg>\n<circle/>\n</svg>\nKeep2</div>'
        assert strip_svg(html) == '<div>Keep\n\nKeep2</div>'

    def test_no_svg_unchanged(self):
        html = '<div>No SVG here</div>'
        assert strip_svg(html) == html


class TestStripCss:
    def test_removes_style_block(self):
        html = '<style>.foo{color:red}</style><div>Content</div>'
        assert strip_css(html) == '<div>Content</div>'

    def test_removes_multiple_style_blocks(self):
        html = '<style>a{}</style><p>Hi</p><style>b{}</style>'
        assert strip_css(html) == '<p>Hi</p>'


class TestStripInlineStyles:
    def test_removes_style_attribute(self):
        html = '<div style="color:red;font-size:12px">Text</div>'
        assert strip_inline_styles(html) == '<div>Text</div>'

    def test_preserves_other_attributes(self):
        html = '<img src="a.png" style="width:100%" alt="img">'
        assert strip_inline_styles(html) == '<img src="a.png" alt="img">'


class TestStripComments:
    def test_removes_html_comments(self):
        html = '<!-- comment --><div>Keep</div><!-- another -->'
        assert strip_comments(html) == '<div>Keep</div>'


class TestStripSvgPaths:
    def test_removes_d_attribute(self):
        html = '<path d="M0,0 V15.685 H23.527 L12,0 Z"/>'
        result = strip_svg_paths(html)
        assert 'M0,0' not in result


class TestStripLongMinifiedLines:
    def test_removes_long_lines_without_korean(self):
        long_js = 'a' * 600
        short_text = '한국어 교육 콘텐츠'
        text = f'{long_js}\n{short_text}\n'
        result = strip_long_minified_lines(text)
        assert short_text in result
        assert long_js not in result

    def test_keeps_long_lines_with_korean(self):
        long_with_korean = 'x' * 400 + '한국어 텍스트' + 'y' * 200
        result = strip_long_minified_lines(long_with_korean)
        assert '한국어 텍스트' in result


class TestPrefilterText:
    def test_full_pipeline(self):
        html = (
            '<!-- comment -->'
            '<style>.x{color:red}</style>'
            '<svg><path d="M0,0"/></svg>'
            '<div style="font-size:12px">교육 콘텐츠</div>'
        )
        result = prefilter_text(html)
        assert '교육 콘텐츠' in result
        assert 'color:red' not in result
        assert 'M0,0' not in result
        assert 'comment' not in result
        assert 'font-size' not in result


class TestPrefilterFolder:
    def test_reads_html_and_js_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'index.html'), 'w') as f:
                f.write('<div>교육 내용</div>')
            with open(os.path.join(tmpdir, 'data.js'), 'w') as f:
                f.write('window.apnExeFile={"title":"수학 학습"}')
            with open(os.path.join(tmpdir, 'image.png'), 'wb') as f:
                f.write(b'\x89PNG')

            result = prefilter_folder(tmpdir)
            assert '교육 내용' in result
            assert '수학 학습' in result
            assert 'PNG' not in result

    def test_returns_char_count(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'index.html'), 'w') as f:
                f.write('<div>Hello</div>')
            result = prefilter_folder(tmpdir)
            assert len(result) > 0
