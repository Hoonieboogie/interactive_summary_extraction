#!/usr/bin/env bash
# setup_runpod.sh — One-time setup for RunPod H100 pod
# Usage: bash setup_runpod.sh

set -euo pipefail

echo "=== Pipeline v5.0 RunPod Setup ==="

# 1. Install uv
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    echo "Installed uv: $(uv --version)"
else
    echo "uv already installed: $(uv --version)"
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
