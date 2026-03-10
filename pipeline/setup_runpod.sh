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
fi
echo "uv version: $(uv --version)"

# 2. Install pipeline dependencies
echo "Installing pipeline dependencies..."
cd "$(dirname "$0")"
uv sync

# 3. Install vLLM (nightly for Qwen3.5 support)
echo "Installing vLLM (nightly)..."
uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly

# 4. Verify GPU
echo "Checking GPU..."
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0)}'); print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')"

# 5. Verify vLLM
echo "Checking vLLM..."
python -c "import vllm; print(f'vLLM version: {vllm.__version__}')"

echo ""
echo "=== Setup complete ==="
echo "Run the pipeline:"
echo "  uv run main.py --content-dir ../sample_contents --output-dir ./results"
