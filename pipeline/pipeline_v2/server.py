"""vLLM server management. Start/stop/health-check."""
import asyncio
import logging
import subprocess
import sys
import time

import httpx

from config import ModelConfig

logger = logging.getLogger(__name__)

VLLM_HOST = "0.0.0.0"
VLLM_PORT = 8000
HEALTH_URL = f"http://localhost:{VLLM_PORT}/v1/models"


def build_vllm_command(cfg: ModelConfig, num_gpus: int) -> list[str]:
    cmd = [
        sys.executable, "-m", "vllm.entrypoints.openai.api_server",
        "--model", cfg.hf_id,
        "--max-model-len", str(cfg.max_model_len),
        "--host", VLLM_HOST,
        "--port", str(VLLM_PORT),
        "--tensor-parallel-size", str(num_gpus),
    ]
    cmd.extend(cfg.vllm_args)
    return cmd


async def wait_for_server(timeout: int = 600) -> None:
    """Poll health endpoint until server is ready."""
    start = time.time()
    async with httpx.AsyncClient() as client:
        while time.time() - start < timeout:
            try:
                resp = await client.get(HEALTH_URL)
                if resp.status_code == 200:
                    logger.info("vLLM server is ready")
                    return
            except httpx.ConnectError:
                pass
            await asyncio.sleep(2)
    raise TimeoutError(f"vLLM server not ready after {timeout}s")


def start_server(cfg: ModelConfig, num_gpus: int) -> subprocess.Popen:
    """Start vLLM server as subprocess."""
    cmd = build_vllm_command(cfg, num_gpus)
    logger.info(f"Starting vLLM: {' '.join(cmd)}")
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return process


def stop_server(process: subprocess.Popen) -> None:
    """Stop vLLM server."""
    logger.info("Stopping vLLM server")
    process.terminate()
    try:
        process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
