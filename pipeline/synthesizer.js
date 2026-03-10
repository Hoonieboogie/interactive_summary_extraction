"use strict";

require("dotenv").config();

const PROMPT_TEMPLATE = `너는 교육 콘텐츠 분석 전문가야.

아래는 교육용 인터랙티브 콘텐츠에서 추출한 원본 텍스트야.
이 텍스트에는 HTML 태그, 코드, UI 요소(버튼, 메뉴, 네비게이션 텍스트) 등이
포함되어 있을 수 있어.

[지시사항]
1. HTML 태그, JavaScript, CSS 코드를 모두 무시해.
2. 버튼 라벨, 네비게이션 텍스트, UI 요소 텍스트를 무시해.
3. 교육적으로 의미 있는 내용만 파악해.
4. 해당 콘텐츠의 핵심 교육 내용을 한국어 3줄로 요약해.
5. 원본 텍스트에 없는 내용을 절대 추가하지 마.

규칙:
- 첫째 줄: 학습 주제 (무엇을 배우는가)
- 둘째 줄: 주요 학습 활동 (어떤 활동을 하는가)
- 셋째 줄: 학습 목표 및 기대 효과 (무엇을 할 수 있게 되는가)

[출력형식]
JSON 형식으로 응답할 것:
{ "summary": "line1. line2. line3" }

[원본 텍스트]
{CONTENT}`;

function buildPrompt(content, maxChars = 400000) {
  let text = content;
  if (text.length > maxChars) {
    text =
      text.slice(0, maxChars) +
      "\n\n[TRUNCATED — content exceeded context limit]";
  }
  return PROMPT_TEMPLATE.replace("{CONTENT}", text);
}

function parseResponse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // Try extracting from markdown code block
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        /* fall through */
      }
    }
    // Try finding JSON object with "summary" key in text
    const objMatch = raw.match(
      /\{[\s\S]*?"summary"[\s\S]*?\}/,
    );
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/** Call vLLM (OpenAI-compatible API) */
async function callVllm(prompt) {
  const baseUrl = process.env.VLLM_BASE_URL || "http://localhost:8000/v1";
  const model = process.env.VLLM_MODEL || "Qwen/Qwen3.5-35B-A3B";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`vLLM error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/** Call Gemini API via @google/genai */
async function callGemini(prompt) {
  const { GoogleGenAI } = require("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature: 0, maxOutputTokens: 512 },
  });

  return response.text;
}

/** Main synthesis function */
async function synthesize(content) {
  const backend = process.env.BACKEND || "vllm";
  const prompt = buildPrompt(content);
  let raw;

  if (backend === "gemini") {
    raw = await callGemini(prompt);
  } else {
    raw = await callVllm(prompt);
  }

  const parsed = parseResponse(raw);
  if (!parsed) {
    return { error: "Failed to parse LLM response", raw };
  }

  return {
    summary: parsed.summary,
    raw,
  };
}

module.exports = {
  buildPrompt,
  parseResponse,
  callVllm,
  callGemini,
  synthesize,
};
