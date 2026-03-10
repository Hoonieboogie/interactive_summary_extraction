const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { stripSvg, stripStyles, stripInlineStyles, stripComments, stripSvgPathData, prefilter, readContentFolder } = require('../prefilter');

describe('stripSvg', () => {
  it('removes simple SVG blocks', () => {
    const input = '<div>Hello</div><svg xmlns="http://www.w3.org/2000/svg"><path d="M0,0"/></svg><p>World</p>';
    assert.equal(stripSvg(input), '<div>Hello</div><p>World</p>');
  });

  it('removes nested SVG', () => {
    const input = '<svg><g><circle r="5"/></g></svg>text';
    assert.equal(stripSvg(input), 'text');
  });

  it('handles multiple SVG blocks', () => {
    const input = '<svg>a</svg>keep<svg>b</svg>';
    assert.equal(stripSvg(input), 'keep');
  });
});

describe('stripStyles', () => {
  it('removes style blocks', () => {
    const input = '<style>.foo{color:red}</style><p>Hello</p>';
    assert.equal(stripStyles(input), '<p>Hello</p>');
  });

  it('removes multiple style blocks', () => {
    const input = '<style>a{}</style>text<style>b{}</style>';
    assert.equal(stripStyles(input), 'text');
  });
});

describe('stripInlineStyles', () => {
  it('removes double-quoted style attributes', () => {
    const input = '<div style="color:red">Hello</div>';
    assert.equal(stripInlineStyles(input), '<div>Hello</div>');
  });

  it('removes single-quoted style attributes', () => {
    const input = "<div style='color:red'>Hello</div>";
    assert.equal(stripInlineStyles(input), '<div>Hello</div>');
  });

  it('preserves other attributes', () => {
    const input = '<img src="img.png" style="width:100px" alt="photo">';
    const result = stripInlineStyles(input);
    assert.ok(result.includes('src="img.png"'));
    assert.ok(result.includes('alt="photo"'));
    assert.ok(!result.includes('style='));
  });
});

describe('stripComments', () => {
  it('removes HTML comments', () => {
    const input = '<!-- comment -->Hello<!-- another -->';
    assert.equal(stripComments(input), 'Hello');
  });

  it('removes multiline comments', () => {
    const input = '<!--\n  multi\n  line\n-->text';
    assert.equal(stripComments(input), 'text');
  });
});

describe('stripSvgPathData', () => {
  it('removes d="..." attributes (SVG path data)', () => {
    const input = '<path d="M0,0 V15.685 H23.457 L10,20 Z"/>';
    const result = stripSvgPathData(input);
    assert.ok(!result.includes('d="M0,0'));
  });

  it('preserves non-path content', () => {
    const input = '<div>data</div>';
    const result = stripSvgPathData(input);
    assert.ok(result.includes('data'));
  });
});

describe('prefilter', () => {
  it('applies all stripping in sequence', () => {
    const input = '<!-- comment --><style>.x{}</style><svg><path/></svg><div style="color:red">교육 콘텐츠</div>';
    const result = prefilter(input);
    assert.equal(result, '<div>교육 콘텐츠</div>');
  });

  it('preserves image references', () => {
    const input = '<img src="data/img1.png" style="width:100px">';
    const result = prefilter(input);
    assert.ok(result.includes('src="data/img1.png"'));
    assert.ok(!result.includes('style='));
  });

  it('preserves audio references', () => {
    const input = '"mediaID":"RIS1bdc_mp3"';
    const result = prefilter(input);
    assert.ok(result.includes('mediaID'));
  });

  it('handles empty input', () => {
    assert.equal(prefilter(''), '');
  });
});

describe('readContentFolder', () => {
  const sampleDir = path.resolve(__dirname, '../../sample_contents');

  it('reads Aspen content folder', async () => {
    const result = await readContentFolder(path.join(sampleDir, '2026_kuk_501_0304_1112'));
    assert.ok(result.charCount > 0, 'should have content');
    assert.ok(result.fileCount > 0, 'should have files');
    assert.ok(!result.text.includes('<svg'), 'SVG should be stripped');
    assert.ok(!result.text.includes('<style'), 'style blocks should be stripped');
  });

  it('reads iSpring content folder', async () => {
    const result = await readContentFolder(path.join(sampleDir, 'Daily_Inventor_Maker_29th_PPT'));
    assert.ok(result.charCount > 0, 'should have content');
    assert.ok(result.fileCount > 0, 'should have files');
  });

  it('returns charCount for size estimation', async () => {
    const result = await readContentFolder(path.join(sampleDir, '2026_kuk_501_0304_1112'));
    assert.equal(typeof result.charCount, 'number');
    console.log(`  Aspen pre-filtered: ${(result.charCount / 1024).toFixed(1)} KB`);
  });
});
