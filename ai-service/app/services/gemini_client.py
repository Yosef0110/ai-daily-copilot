"""
services/gemini_client.py
--------------------------
Thin Gemini client wrapper for ai-service, adapted from
`API/Phase1/tools/gemini_extract.py`'s key-rotation approach (multiple
GEMINI_API_KEYS so one rate-limited/invalid key doesn't take the
receipt-import feature down). Deliberately smaller than the original:
no on-disk rate-limit cache, no RAG, no MinerU markdown step - struk
photos go straight into Gemini's multimodal input, they don't need the
raw-document-to-markdown conversion API/Phase1 built for multi-page
supplier POs.
"""

from __future__ import annotations

import os
import threading

from google import genai

_lock = threading.Lock()
_clients: dict[str, "genai.Client"] = {}
_bad_keys: set[str] = set()
_next_index = 0


def _load_api_keys() -> list[str]:
    multi_raw = os.environ.get("GEMINI_API_KEYS") or ""
    keys = [k.strip() for k in multi_raw.replace("\n", ",").split(",") if k.strip()]
    single = os.environ.get("GEMINI_API_KEY")
    if single and single.strip() and single.strip() not in keys:
        keys.append(single.strip())
    return keys


def mask_key(key: str) -> str:
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}...{key[-4:]}"


def pick_client() -> tuple[str, "genai.Client"]:
    """Round-robins across configured keys, skipping ones already
    marked bad this run. Raises RuntimeError if none are usable -
    callers should surface that as a clear 'set GEMINI_API_KEY(S)'
    error, not a stack trace."""
    global _next_index
    keys = [k for k in _load_api_keys() if k not in _bad_keys]
    if not keys:
        raise RuntimeError(
            "Belum ada Gemini API key yang bisa dipakai. Set GEMINI_API_KEY "
            "atau GEMINI_API_KEYS (pisahkan koma) di ai-service/.env."
        )
    with _lock:
        key = keys[_next_index % len(keys)]
        _next_index += 1
    if key not in _clients:
        _clients[key] = genai.Client(api_key=key)
    return key, _clients[key]


def mark_bad(key: str) -> None:
    _bad_keys.add(key)
