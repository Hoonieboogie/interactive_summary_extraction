#!/bin/bash
set -e

# ============================================================
#  3-Model Comparison Script
#  Runs the pipeline with 3 different models sequentially,
#  then compares results side-by-side.
#
#  Usage: bash run_compare.sh <content-path>
#  Example: bash run_compare.sh sample_contents
# ============================================================

CONTENT_PATH="${1:?Usage: bash run_compare.sh <content-path>}"

MODELS=(
  "Qwen/Qwen3.5-35B-A3B"
  "LGAI-EXAONE/EXAONE-4.0-32B"
  "Qwen/Qwen3-32B"
)

MAX_MODEL_LENS=(
  131072    # Qwen3.5-35B-A3B: 262K 지원, 128K로 설정
  131072    # EXAONE 4.0 32B: 131K 지원
  32768     # Qwen3-32B: 기본 32K (YaRN 시 131K)
)

VLLM_BASE_URL="${VLLM_BASE_URL:-http://localhost:8000/v1}"
GPU_UTIL="${GPU_UTIL:-0.92}"

echo "============================================================"
echo "  3-Model Comparison"
echo "  Content: $CONTENT_PATH"
echo "============================================================"
echo ""

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  MAX_LEN="${MAX_MODEL_LENS[$i]}"
  TAG=$(echo "$MODEL" | cut -d'/' -f2)

  echo "──────────────────────────────────────────────────────────"
  echo "  [$((i+1))/3] $MODEL"
  echo "──────────────────────────────────────────────────────────"

  # Stop any running vLLM server
  echo "Stopping existing vLLM server..."
  pkill -f "vllm serve" 2>/dev/null || true
  sleep 3

  # Start vLLM with this model
  echo "Starting vLLM with $MODEL (max_model_len=$MAX_LEN)..."
  uv run vllm serve "$MODEL" \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len "$MAX_LEN" \
    --dtype auto \
    --gpu-memory-utilization "$GPU_UTIL" \
    > "/tmp/vllm_${TAG}.log" 2>&1 &

  VLLM_PID=$!

  # Wait for vLLM to be ready
  echo "Waiting for vLLM server to start..."
  for attempt in $(seq 1 120); do
    if curl -s "$VLLM_BASE_URL/models" > /dev/null 2>&1; then
      echo "vLLM server ready! (took ${attempt}s)"
      break
    fi
    if ! kill -0 $VLLM_PID 2>/dev/null; then
      echo "ERROR: vLLM server crashed. Check /tmp/vllm_${TAG}.log"
      exit 1
    fi
    sleep 1
  done

  # Verify server is actually responding
  if ! curl -s "$VLLM_BASE_URL/models" > /dev/null 2>&1; then
    echo "ERROR: vLLM server did not start within 120s. Check /tmp/vllm_${TAG}.log"
    kill $VLLM_PID 2>/dev/null || true
    exit 1
  fi

  # Run pipeline
  echo "Running pipeline..."
  cd pipeline
  VLLM_MODEL="$MODEL" BACKEND=vllm node index.js "../$CONTENT_PATH"
  cd ..

  echo ""
  echo "  [$TAG] Done."
  echo ""
done

# Stop vLLM
pkill -f "vllm serve" 2>/dev/null || true

# Compare results
echo "============================================================"
echo "  Comparing results..."
echo "============================================================"
cd pipeline
node compare.js
