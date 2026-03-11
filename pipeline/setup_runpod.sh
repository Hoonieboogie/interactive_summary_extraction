#!/usr/bin/env bash
# setup_runpod.sh — One-time setup for RunPod H100 pod
# Usage: bash setup_runpod.sh

set -euo pipefail

echo "=== Pipeline v5.0 RunPod Setup ==="

# 0. Fix for RunPod network filesystem (MFS) — hardlinks not supported
export UV_LINK_MODE=copy

# 0.1. Route HuggingFace cache to /workspace (network volume) for persistence
if [ -d /workspace ]; then
    export HF_HOME=/workspace/.cache/huggingface
    mkdir -p "$HF_HOME"
    echo "HuggingFace cache: $HF_HOME (network volume, persists across pods)"
fi

# 0.2. Put venv on local disk to avoid MFS stale file handle errors
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
if mountpoint -q /workspace 2>/dev/null && [[ "$SCRIPT_DIR" == /workspace/* ]]; then
    echo "Detected network volume — placing venv on local disk..."
    rm -rf "$VENV_DIR"
    mkdir -p /tmp/pipeline-venv
    ln -sf /tmp/pipeline-venv "$VENV_DIR"
    echo "venv symlinked: $VENV_DIR → /tmp/pipeline-venv"
fi

# 1. Install uv
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    # Persist PATH for future shell sessions
    if ! grep -q '.local/bin' ~/.bashrc 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    fi
    echo "Installed uv: $(uv --version)"
else
    echo "uv already installed: $(uv --version)"
fi

# Persist HF_HOME and UV_LINK_MODE for future shell sessions
if ! grep -q 'HF_HOME' ~/.bashrc 2>/dev/null && [ -d /workspace ]; then
    echo 'export HF_HOME=/workspace/.cache/huggingface' >> ~/.bashrc
    echo 'export UV_LINK_MODE=copy' >> ~/.bashrc
fi

# 2. cd to pipeline directory
cd "$(dirname "$0")"

# 3. Install pipeline dependencies + vLLM in one step
echo "Installing pipeline dependencies..."
uv sync

echo "Installing vLLM (nightly for Qwen3.5 support)..."
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly

# 4. Verify everything (using uv run to ensure correct virtualenv)
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

import httpx, rich, jinja2
print('Pipeline deps: httpx, rich, jinja2 OK')
"

echo ""
echo "=== Setup complete ==="
echo "Run the pipeline:"
echo "  cd $(pwd)"
echo "  uv run main.py --content-dir ../sample_contents --output-dir ./results"
