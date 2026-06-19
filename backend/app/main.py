import io
import os
import sys

# Force UTF-8 I/O on Windows (Python 3.10 defaults to cp1252 otherwise).
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
os.environ.setdefault("PYTHONUTF8", "1")

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.engine import Engine

from app.scanner.harvest import get_engine
from app.middleware.rate_limit import RateLimitMiddleware

load_dotenv()

app = FastAPI(title="Thynkk API", version="0.1.0")

# Rate limiting before CORS so abusive requests are dropped immediately
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# DB engine created once at startup and shared across requests
db_engine: Engine = get_engine()

from app.api.scans import router as scans_router  # noqa: E402 — must be after db_engine
from app.api.radar import router as radar_router
from app.api.quota import router as quota_router
from app.api.webhooks import router as webhooks_router
from app.api.admin import router as admin_router

app.include_router(scans_router)
app.include_router(radar_router)
app.include_router(quota_router)
app.include_router(webhooks_router)
app.include_router(admin_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
