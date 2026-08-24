"""
services/progress.py
-----------------------
In-process "what's happening right now" tracker for a receipt import
batch, so web/app/imports/page.tsx can show a live stage indicator
("MinerU membaca struk...", "reshape via Ollama...") instead of a bare
spinner during what can be a slow request (MinerU parsing + an LLM
call, especially on a rented GPU over an SSH tunnel).

Deliberately NOT a job queue or websocket - this project has one
person testing one upload at a time, so a single in-memory dict keyed
by source_file, polled over GET /imports/progress, is enough and adds
no new infrastructure (no Redis, no background workers). If this ever
needs to support multiple concurrent users, this module is the one
place that would need to grow into something request-scoped instead of
process-global.

Thread-safety: FastAPI/Starlette can run sync route code (this project
uses `async def` endpoints, but extract_receipt() itself is sync and
called directly, not via run_in_threadpool) - a plain dict write from
one request at a time is fine here, the lock below is just cheap
insurance if that ever changes.
"""

from __future__ import annotations

import threading

_lock = threading.Lock()
_stages: dict[str, str] = {}


def set_stage(source_file: str, stage: str) -> None:
    with _lock:
        _stages[source_file] = stage


def clear_stage(source_file: str) -> None:
    with _lock:
        _stages.pop(source_file, None)


def snapshot() -> dict[str, str]:
    with _lock:
        return dict(_stages)
