from fastapi import FastAPI
from app.routers import forecasting

app = FastAPI(
    title="AI Daily Copilot AI Service",
    version="0.1.0",
)

app.include_router(forecasting.router)

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}