from fastapi import FastAPI
# To Import Forecasting
from app.routers import forecasting
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

# forecasting router
app.include_router(forecasting.router)

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}