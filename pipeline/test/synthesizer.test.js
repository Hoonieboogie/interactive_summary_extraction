const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPrompt, parseResponse } = require('../synthesizer');

describe('buildPrompt', () => {
  it('inserts content into prompt template', () => {
    const prompt = buildPrompt('교육 내용 텍스트');
    assert.ok(prompt.includes('교육 내용 텍스트'), 'content should be in prompt');
    assert.ok(prompt.includes('3줄로 요약'), 'should ask for 3-line summary');
    assert.ok(prompt.includes('JSON'), 'should ask for JSON');
  });

  it('includes key prompt elements', () => {
    const prompt = buildPrompt('test');
    assert.ok(prompt.includes('교육 콘텐츠 분석 전문가'));
    assert.ok(prompt.includes('학습 주제'));
    assert.ok(prompt.includes('주요 학습 활동'));
    assert.ok(prompt.includes('학습 목표 및 기대 효과'));
    assert.ok(prompt.includes('"summary"'));
  });

  it('truncates content exceeding max chars', () => {
    const longContent = 'x'.repeat(500000);
    const prompt = buildPrompt(longContent, 400000);
    assert.ok(prompt.length < 500000, 'should be truncated');
    assert.ok(prompt.includes('[TRUNCATED'), 'should indicate truncation');
  });
});

describe('parseResponse', () => {
  it('parses clean JSON response with summary field', () => {
    const raw = '{"summary": "주제. 활동. 목표"}';
    const result = parseResponse(raw);
    assert.deepEqual(result, { summary: '주제. 활동. 목표' });
  });

  it('parses JSON in markdown code block', () => {
    const raw = '```json\n{"summary": "주제. 활동. 목표"}\n```';
    const result = parseResponse(raw);
    assert.deepEqual(result, { summary: '주제. 활동. 목표' });
  });

  it('parses JSON embedded in text', () => {
    const raw = 'Here is the result:\n{"summary": "주제. 활동. 목표"}\nDone.';
    const result = parseResponse(raw);
    assert.deepEqual(result, { summary: '주제. 활동. 목표' });
  });

  it('returns null for invalid response', () => {
    const result = parseResponse('This is not JSON at all');
    assert.equal(result, null);
  });
});
