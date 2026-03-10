# Interactive Summary Extraction — Pipeline v5.0

교육용 인터랙티브 HTML 콘텐츠에서 3줄 한국어 요약을 자동 추출하는 LLM-first 파이프라인.

- 엔진 탐지 없이 모든 콘텐츠 유형에 범용 적용
- vLLM + Qwen3.5 로컬 추론 (토큰 비용 $0)
- H100 SXM 80GB 단일 GPU로 300,000건 처리

## 프로젝트 구조

```
├── pyproject.toml          Python 의존성 (vLLM) — uv sync로 설치
├── pipeline/               Node.js 파이프라인
│   ├── index.js            오케스트레이터 (CLI)
│   ├── prefilter.js        유니버설 프리필터 (SVG/CSS/스타일/주석 제거)
│   ├── synthesizer.js      LLM 합성 (vLLM / Gemini 백엔드)
│   ├── .env.example        환경변수 템플릿
│   └── test/               유닛 테스트
├── sample_contents/        테스트용 샘플 콘텐츠 (7개)
└── docs/                   설계 문서
```

---

## RunPod H100 SXM 환경 설정

### 1. Pod 생성

- RunPod에서 **GPU Pod** 생성
- GPU: **H100 SXM 80GB**
- Template: **RunPod Pytorch 2.x** (CUDA, Python 사전설치됨)
- Disk: 최소 100GB (모델 다운로드용)

### 2. uv 설치

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
```

### 3. Node.js 설치

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

### 4. 레포 클론 및 의존성 설치

```bash
git clone https://git.i-screammedia.com/hoonhan/interactive_summary_extraction.git
cd interactive_summary_extraction

# Python 의존성 (vLLM)
uv sync

# Node.js 의존성
cd pipeline
npm install
cp .env.example .env
cd ..
```

### 5. vLLM 서버 시작

```bash
uv run vllm serve Qwen/Qwen3.5-35B-A3B \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 131072 \
  --dtype auto \
  --gpu-memory-utilization 0.92
```

첫 실행 시 Hugging Face에서 모델을 다운로드합니다 (~70GB, 수 분 소요).
`INFO: Application startup complete.` 메시지가 나올 때까지 대기합니다.

> `--max-model-len 131072` (128K 토큰): 프리필터 후 대부분의 콘텐츠에 충분.
> 더 큰 콘텐츠가 있을 경우 `--max-model-len 262144`로 높이되, 메모리 부족 시 `--quantization fp8`을 추가.

### 6. 파이프라인 실행

```bash
cd pipeline

# 단일 콘텐츠 폴더 처리
node index.js ../sample_contents/2026_kuk_501_0304_1112

# 전체 샘플 배치 처리
node index.js ../sample_contents

# 프로덕션 (300K 콘텐츠)
node index.js /path/to/all/contents
```

---

## 3-모델 비교 테스트

3개 모델의 결과를 자동으로 비교합니다.

| 모델 | HuggingFace ID | Context | VRAM |
|------|---------------|---------|------|
| Qwen3.5-35B-A3B | `Qwen/Qwen3.5-35B-A3B` | 262K | ~70GB FP16 |
| EXAONE 4.0 32B | `LGAI-EXAONE/EXAONE-4.0-32B` | 131K | ~62GB BF16 |
| Qwen3-32B | `Qwen/Qwen3-32B` | 32K | ~64GB FP16 |

### 자동 비교 (권장)

```bash
# 프로젝트 루트에서 실행
bash run_compare.sh sample_contents
```

이 스크립트는 순차적으로:
1. vLLM 서버 시작 (모델 A) → 파이프라인 실행 → 결과 저장
2. vLLM 서버 재시작 (모델 B) → 파이프라인 실행 → 결과 저장
3. vLLM 서버 재시작 (모델 C) → 파이프라인 실행 → 결과 저장
4. 3개 모델 결과 비교표 출력

### 수동 비교

모델별로 직접 실행할 경우:

```bash
cd pipeline

# 모델 1
VLLM_MODEL=Qwen/Qwen3.5-35B-A3B node index.js ../sample_contents

# 모델 2 (vLLM 서버를 해당 모델로 재시작 후)
VLLM_MODEL=LGAI-EXAONE/EXAONE-4.0-32B node index.js ../sample_contents

# 모델 3 (vLLM 서버를 해당 모델로 재시작 후)
VLLM_MODEL=Qwen/Qwen3-32B node index.js ../sample_contents

# 비교
node compare.js
```

### 비교 결과

- 터미널에 모델별 요약 비교표 출력
- `pipeline/output/comparison.json`에 JSON 형태로 저장

---

## 출력 형식

단일 처리 시 `pipeline/output/<folder_name>_<model>.json`:
```json
{
  "id": "2026_kuk_501_0304_1112",
  "model": "Qwen/Qwen3.5-35B-A3B",
  "summary": "학습 주제. 주요 학습 활동. 학습 목표 및 기대 효과",
  "metadata": {
    "extractedAt": "2026-03-10T12:00:00.000Z",
    "charCount": 45230,
    "fileCount": 11,
    "pipeline": "v5.0"
  }
}
```

배치 처리 시 `pipeline/output/report_<model>_<timestamp>.jsonl` (한 줄 = 한 콘텐츠).

---

## 환경 변수 (.env)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BACKEND` | `vllm` | `vllm` (로컬) 또는 `gemini` (API 폴백) |
| `VLLM_BASE_URL` | `http://localhost:8000/v1` | vLLM 서버 주소 |
| `VLLM_MODEL` | `Qwen/Qwen3.5-35B-A3B` | vLLM 모델명 |
| `GEMINI_API_KEY` | - | Gemini API 키 (gemini 백엔드 사용 시) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini 모델명 |
| `MAX_CHARS` | `400000` | 프리필터 후 최대 문자수 (초과 시 잘림) |
| `CONCURRENCY` | `1` | 배치 처리 동시성 (vLLM 배칭에 의존하므로 1 권장) |

---

## 테스트

```bash
cd pipeline
npm test
```

---

## 모델 선택 가이드

| 모델 | 타입 | VRAM | 용도 |
|------|------|------|------|
| Qwen3.5-35B-A3B | MoE | ~70GB FP16 | **기본 추천** — 35B 성능, 3B 속도 |
| Qwen3.5-9B | Dense | ~18GB | MoE 문제 시 대안 |
| Qwen3.5-122B-A10B | MoE | ~65GB Q4 | 품질 개선 필요 시 |

모델 변경 시 `.env`의 `VLLM_MODEL`과 vLLM serve 명령의 모델명을 함께 수정.

---

## 트러블슈팅

**vLLM OOM (Out of Memory)**
```bash
# FP8 양자화로 메모리 절약
uv run vllm serve Qwen/Qwen3.5-35B-A3B --quantization fp8 --max-model-len 131072

# 또는 더 작은 모델 사용
uv run vllm serve Qwen/Qwen3.5-9B --max-model-len 131072
```

**vLLM 서버 연결 실패**
- 서버가 완전히 시작되었는지 확인 (`Application startup complete`)
- `curl http://localhost:8000/v1/models` 로 서버 상태 확인

**결과에 summary가 null**
- `charCount`가 100 미만이면 이미지 중심 콘텐츠 (Vision LLM 필요)
- `error` 필드 확인 — LLM 응답 파싱 실패 가능성
