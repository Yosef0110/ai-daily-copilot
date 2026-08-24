import os
from pathlib import Path

from dotenv import dotenv_values, find_dotenv, load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

# Must run before anything below reads os.environ (CORS_ALLOW_ORIGINS,
# and GEMINI_API_KEY/GEMINI_API_KEYS read lazily by
# services/gemini_client.py on the first Gemini call). Without this,
# ai-service/.env is just an inert text file - python-dotenv is listed
# in requirements.txt but was never actually invoked, so nothing in
# that file ever reached the process. find_dotenv walks up from the
# current working directory, so `.env` is found whether uvicorn is
# started from ai-service/ (the documented way) or elsewhere - but that
# also means it's easy to accidentally pick up a DIFFERENT .env than
# the one you're editing if uvicorn wasn't started from ai-service/.
_dotenv_path = find_dotenv()
load_dotenv(_dotenv_path)

# Diagnostics only - never the values themselves. Two real failure modes
# have bitten this project before and both are SILENT (no exception,
# just the "gemini" default winning): (1) uvicorn --reload does NOT
# watch .env for changes, only .py files - editing .env while the
# server is running does nothing until it's actually stopped (Ctrl+C)
# and restarted; (2) re-saving .env from some Windows editors/PowerShell
# re-adds a UTF-8 BOM to the first line, which silently renames that
# line's key (e.g. "RECEIPT_BACKEND" becomes "﻿RECEIPT_BACKEND"),
# so os.environ.get("RECEIPT_BACKEND", ...) just falls through to the
# default. Print + expose in /health so this is checkable directly
# instead of guessed at from a run's result.
_dotenv_raw_keys = set(dotenv_values(_dotenv_path).keys()) if _dotenv_path else set()
print(f"[ai-service] .env loaded from: {_dotenv_path or '(not found - no .env picked up at all)'}")
print(f"[ai-service] keys found in that .env: {sorted(_dotenv_raw_keys) or '(none)'}")

from app.routers import imports as imports_router  # noqa: E402 (must follow load_dotenv())

app = FastAPI(
    title="AI Daily Copilot AI Service",
    version="0.1.0",
    # Default /docs loads Swagger UI's JS/CSS from cdn.jsdelivr.net. On a
    # network that blocks that CDN (common on some ISPs/campus networks),
    # /docs still loads the page shell but the interactive UI never
    # renders - blank page, no visible form. docs_url=None here, replaced
    # below by a self-hosted version using the files under app/static/
    # (see /docs route), so this works fully offline.
    docs_url=None,
)

# web/app/imports/page.tsx calls this service directly from the browser
# (fetch to NEXT_PUBLIC_AI_SERVICE_URL), a different origin than Next's
# own dev server (localhost:3000 vs this service's localhost:8000) -
# without CORS enabled the browser blocks that fetch entirely, silently,
# before this app ever sees the request. CORS_ALLOW_ORIGINS in .env lets
# this list grow (e.g. to a deployed web URL) without a code change;
# defaults to the two local dev ports both `next dev` and `next start`
# use.
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ALLOW_ORIGINS", _default_origins).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imports_router.router)

app.mount("/static", StaticFiles(directory=str(Path(__file__).parent / "static")), name="static")


@app.get("/docs", include_in_schema=False)
def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Docs",
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
        swagger_favicon_url="/static/favicon-32x32.png",
    )


@app.get("/health")
def health_check() -> dict:
    # Surfaces whether GEMINI_API_KEY(S) actually got loaded from .env
    # (never the value itself), plus which backend struk import is
    # using and whether that backend's own dependencies (MinerU
    # installed, Ollama reachable) actually check out - so a person can
    # check http://127.0.0.1:8000/health in a browser instead of
    # guessing why /imports/receipt is failing.
    from app.services.gemini_client import _load_api_keys, mask_key
    from app.services.receipt_extraction import RECEIPT_BACKEND

    keys = _load_api_keys()
    result = {
        "status": "ok",
        "gemini_key_configured": bool(keys),
        "gemini_key_count": len(keys),
        "gemini_key_preview": [mask_key(k) for k in keys],
        "receipt_backend": RECEIPT_BACKEND,
        # If RECEIPT_BACKEND is "gemini" but you set it to "mineru" in the
        # file, check these two: (1) env_file_used - is this really the
        # .env you edited? (2) "RECEIPT_BACKEND" in env_file_keys - if
        # it's False even though the line is in the file, it's the BOM
        # issue (the line's real key has a hidden prefix). Either way,
        # this only reflects what was loaded at STARTUP - `--reload`
        # does not re-read .env, so a fresh save here still needs a
        # manual stop+restart of uvicorn to take effect.
        "env_file_used": _dotenv_path or None,
        "env_file_keys": sorted(_dotenv_raw_keys),
        "env_file_has_receipt_backend_key": "RECEIPT_BACKEND" in _dotenv_raw_keys,
    }

    if RECEIPT_BACKEND == "mineru":
        from app.services import mineru_ocr, ollama_client

        result["mineru_installed"] = mineru_ocr.is_installed()
        result["ollama_reachable"] = ollama_client.is_available()
        result["ollama_host"] = ollama_client.HOST
        result["ollama_model"] = ollama_client.MODEL

    return result
