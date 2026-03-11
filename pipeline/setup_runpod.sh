#!/usr/bin/env bash
# setup_runpod.sh — One-time setup for RunPod GPU pod
# Usage: cd pipeline/pipeline_v2 && bash ../setup_runpod.sh

set -euo pipefail

echo "=== Pipeline v2 RunPod Setup ==="

# 0. Fix for RunPod network filesystem (MFS) — hardlinks not supported
export UV_LINK_MODE=copy

# 0.1. Route HuggingFace cache to /workspace (network volume) for persistence
if [ -d /workspace ]; then
    export HF_HOME=/workspace/.cache/huggingface
    mkdir -p "$HF_HOME"
    echo "HuggingFace cache: $HF_HOME (network volume, persists across pods)"
fi

# 0.2. Put venv on local disk to avoid MFS stale file handle errors
PIPELINE_DIR="$(cd "$(dirname "$0")/pipeline_v2" && pwd)"
VENV_DIR="$PIPELINE_DIR/.venv"
if mountpoint -q /workspace 2>/dev/null && [[ "$PIPELINE_DIR" == /workspace/* ]]; then
    echo "Detected network volume — placing venv on local disk..."
    rm -rf "$VENV_DIR"
    mkdir -p /tmp/pipeline-v2-venv
    ln -sf /tmp/pipeline-v2-venv "$VENV_DIR"
    echo "venv symlinked: $VENV_DIR → /tmp/pipeline-v2-venv"
fi

# 1. Install uv
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    if ! grep -q '.local/bin' ~/.bashrc 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    fi
    echo "Installed uv: $(uv --version)"
else
    echo "uv already installed: $(uv --version)"
fi

# Persist env vars for future shell sessions
if ! grep -q 'HF_HOME' ~/.bashrc 2>/dev/null && [ -d /workspace ]; then
    echo 'export HF_HOME=/workspace/.cache/huggingface' >> ~/.bashrc
    echo 'export UV_LINK_MODE=copy' >> ~/.bashrc
fi

# 2. cd to pipeline_v2 directory
cd "$PIPELINE_DIR"

# 3. Install pipeline dependencies + vLLM
echo "Installing pipeline dependencies..."
uv sync --dev

echo "Installing vLLM (nightly for Qwen3.5 support)..."
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly

# 4. Verify installation
echo ""
echo "=== Verifying installation ==="

uv run python -c "
import torch
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')

import vllm
print(f'vLLM version: {vllm.__version__}')

import httpx, charset_normalizer
print(f'httpx: {httpx.__version__}')
print(f'charset-normalizer: {charset_normalizer.__version__}')
"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Run the pipeline:"
echo "  cd $PIPELINE_DIR"
echo "  uv run main.py --content-dir ../../sample_contents --output-dir ./results"
