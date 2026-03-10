import pytest
from prefilter import (
    strip_svg, strip_css, strip_inline_styles, strip_comments,
    strip_svg_paths, strip_long_minified_lines, prefilter_text,
    prefilter_folder, _has_natural_language, _count_natural_lang_chars,
)
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


class TestNaturalLanguageDetection:
    """Tests for language-agnostic natural language detection."""

    def test_detects_korean(self):
        assert _has_natural_language("거짓 정보를 가려내고 사실 확인하기")

    def test_detects_english(self):
        assert _has_natural_language("Learn about the solar system and planets")

    def test_detects_japanese(self):
        assert _has_natural_language("算数を学ぶ")

    def test_detects_chinese(self):
        assert _has_natural_language("学习数学基础知识")

    def test_rejects_code_identifier(self):
        assert not _has_natural_language("getElementById")

    def test_rejects_short_code(self):
        assert not _has_natural_language("var x = 5;")

    def test_rejects_hex_color(self):
        assert not _has_natural_language("rgba(255,128,0,1)")

    def test_counts_korean_chars(self):
        count = _count_natural_lang_chars("거짓 정보를 가려내고")
        assert count > 5

    def test_counts_english_multi_word(self):
        count = _count_natural_lang_chars("Learn about the solar system")
        assert count > 10

    def test_counts_zero_for_code(self):
        count = _count_natural_lang_chars("function(a){return b}")
        assert count == 0


class TestStripLongMinifiedLines:
    def test_removes_long_lines_without_natural_language(self):
        long_js = 'a' * 600
        short_text = '한국어 교육 콘텐츠'
        text = f'{long_js}\n{short_text}\n'
        result = strip_long_minified_lines(text)
        assert short_text in result
        assert long_js not in result

    def test_keeps_long_lines_with_korean(self):
        long_with_korean = 'x' * 400 + '한국어 텍스트입니다' + 'y' * 200
        result = strip_long_minified_lines(long_with_korean)
        assert '한국어' in result

    def test_keeps_long_lines_with_english(self):
        long_with_english = 'x' * 400 + 'This is educational content about math' + 'y' * 200
        result = strip_long_minified_lines(long_with_english)
        assert 'educational content' in result

    def test_mega_line_extracts_any_language_strings(self):
        # Simulate minified JSON with both Korean and English educational strings
        mega = 'x' * 60000 + '"title":"Learn about fractions"' + 'y' * 10000 + '"주제":"수학 기초"' + 'z' * 5000
        result = strip_long_minified_lines(mega)
        assert 'Learn about fractions' in result
        assert '수학 기초' in result


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
                f.write('<div>이것은 한국어 교육 콘텐츠입니다</div>')
            with open(os.path.join(tmpdir, 'data.js'), 'w') as f:
                f.write('window.data={"title":"수학 학습 활동을 시작합시다"}')
            with open(os.path.join(tmpdir, 'image.png'), 'wb') as f:
                f.write(b'\x89PNG')

            result = prefilter_folder(tmpdir)
            assert '한국어' in result
            assert '수학' in result
            assert 'PNG' not in result

    def test_skips_code_heavy_files(self):
        """Framework JS files with scattered keywords should be excluded."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Realistic framework code: mostly code with minimal natural language
            code_lines = [
                'var BxCanvas=function(a){',
                '  this.el=document.createElement("canvas");',
                '  this.ctx=this.el.getContext("2d");',
                '  this.w=a.width||800;this.h=a.height||600;',
                '};',
                'BxCanvas.prototype={',
                '  clear:function(){this.ctx.clearRect(0,0,this.w,this.h);},',
                '  resize:function(w,h){this.el.width=w;this.el.height=h;},',
                '  draw:function(img,x,y){this.ctx.drawImage(img,x,y);},',
                '  fill:function(c){this.ctx.fillStyle=c;this.ctx.fillRect(0,0,this.w,this.h);},',
                '  stroke:function(x1,y1,x2,y2){this.ctx.beginPath();this.ctx.moveTo(x1,y1);this.ctx.lineTo(x2,y2);this.ctx.stroke();},',
                '  text:function(t,x,y){this.ctx.fillText(t,x,y);},',
                '  circle:function(x,y,r){this.ctx.beginPath();this.ctx.arc(x,y,r,0,Math.PI*2);this.ctx.fill();}',
                '};',
            ]
            with open(os.path.join(tmpdir, 'framework.js'), 'w') as f:
                f.write('\n'.join(code_lines))
            result = prefilter_folder(tmpdir)
            assert result == ''

    def test_keeps_files_with_korean(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'content.html'), 'w') as f:
                f.write('<div>이것은 한국어 교육 콘텐츠입니다. 수학을 배워봅시다.</div>')
            result = prefilter_folder(tmpdir)
            assert '한국어' in result
            assert '수학' in result

    def test_keeps_files_with_english(self):
        """English educational content should also be preserved."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'lesson.html'), 'w') as f:
                f.write('<div>Learn about the solar system and its planets in this interactive lesson.</div>')
            result = prefilter_folder(tmpdir)
            assert 'solar system' in result
            assert 'planets' in result

    def test_reads_asp_files(self):
        """ASP format content should be readable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'content.asp'), 'w') as f:
                f.write('<html><body>이것은 교육 콘텐츠입니다 수학을 학습합시다</body></html>')
            result = prefilter_folder(tmpdir)
            assert '교육' in result

    def test_reads_xml_files(self):
        """XML data files may contain educational content."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'data.xml'), 'w') as f:
                f.write('<content><title>Learn about photosynthesis and plant biology</title></content>')
            result = prefilter_folder(tmpdir)
            assert 'photosynthesis' in result
