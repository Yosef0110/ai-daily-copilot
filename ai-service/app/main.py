import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
# To Import Forecasting
from app.routers import copilot, forecasting
# For CORS Block (locally testing purposes)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Daily Copilot AI Service",
    version="0.1.0",
)

# CORS BLOCK (for testing purposes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        ],  # Allows your Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Application routers
app.include_router(forecasting.router)
app.include_router(copilot.router)

@app.get("/health")
def health_check() -> dict:
    # Surfaces whether GEMINI_API_KEY(S) actually got loaded from .env
    # (never the value itself) - so a person can check
    # http://127.0.0.1:8000/health in a browser instead of guessing
    # why the receipt-import endpoint says "Belum ada Gemini API key".
    from app.services.gemini_client import _load_api_keys, mask_key

    keys = _load_api_keys()
    return {
        "status": "ok",
        "gemini_key_configured": bool(keys),
        "gemini_key_count": len(keys),
        "gemini_key_preview": [mask_key(k) for k in keys],
    }
