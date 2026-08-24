"""
services/ollama_client.py
---------------------------
Thin Ollama client for ai-service, same request shape as
`API/Phase2/tools/qwen_matcher.py`'s `_post_json_ollama` (POST
/api/chat, format="json", stream=False) - kept as its own copy rather
than an import across packages, same isolation convention as
gemini_client.py and mineru_ocr.py in this same folder.

Used by services/receipt_extraction.py ONLY when RECEIPT_BACKEND=mineru
- reshapes MinerU's markdown reading of a struk into this project's
JSON schema, the same job Gemini does directly from the photo on the
default RECEIPT_BACKEND=gemini path.
"""

from __future__ import annotations

import json
import os

import requests

HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
MODEL = os.environ.get("OLLAMA_RESHAPE_MODEL", "qwen3.6:27b")


def is_available(timeout: int = 5) -> bool:
    try:
        r = requests.get(f"{HOST.rstrip('/')}/api/tags", timeout=timeout)
        return r.ok
    except Exception:
        return False


def post_json(system_prompt: str, user_prompt: str, timeout: int = 180) -> dict:
    """Raises RuntimeError with a clear message on any failure (Ollama
    unreachable, non-2xx, or a non-JSON reply) - callers should surface
    that directly, not a raw requests/JSONDecodeError traceback."""
    try:
        resp = requests.post(
            f"{HOST.rstrip('/')}/api/chat",
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": -1},
            },
            timeout=timeout,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(
            f"Tidak bisa menghubungi Ollama di {HOST} ({type(exc).__name__}: {exc}). "
            "Cek OLLAMA_HOST di ai-service/.env dan pastikan instance GPU/tunnel-nya masih hidup."
        ) from exc

    try:
        return json.loads(resp.json()["message"]["content"])
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Ollama membalas tapi bukan JSON yang valid ({type(exc).__name__}: {exc}).") from exc
