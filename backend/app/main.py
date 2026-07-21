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
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError

from app.scanner.harvest import get_engine
from app.middleware.rate_limit import RateLimitMiddleware

load_dotenv()

_DEFAULT_CORS = ",".join([
    "https://thynkk.co",
    "https://www.thynkk.co",
    "http://localhost:3000",
])


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", _DEFAULT_CORS)
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    # Always allow production domains (www vs apex are different CORS origins)
    for required in ("https://thynkk.co", "https://www.thynkk.co"):
        if required not in origins:
            origins.append(required)
    return origins


app = FastAPI(title="Thynkk API", version="0.1.0")

_DB_UNAVAILABLE = (
    "Database unavailable. Update DATABASE_URL on Railway with a valid Supabase connection string."
)


@app.exception_handler(OperationalError)
async def database_unavailable(_request: Request, _exc: OperationalError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": _DB_UNAVAILABLE})


# Rate limiting before CORS so abusive requests are dropped immediately
app.add_middleware(RateLimitMiddleware)

# CORS must be outermost — added last so preflight and error responses get headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["Retry-After"],
)

# DB engine created once at startup and shared across requests
db_engine: Engine = get_engine()

from app.api.scans import router as scans_router  # noqa: E402 — must be after db_engine
from app.api.radar import router as radar_router
from app.api.quota import router as quota_router
from app.api.webhooks import router as webhooks_router
from app.api.admin import router as admin_router
from app.api.billing import router as billing_router
from app.api.reddit_health import router as reddit_health_router
from app.api.growth_scans import router as growth_scans_router
from app.api.waitlist import router as waitlist_router
from app.api.saturation import router as saturation_router

app.include_router(scans_router)
app.include_router(growth_scans_router)
app.include_router(radar_router)
app.include_router(quota_router)
app.include_router(webhooks_router)
app.include_router(admin_router)
app.include_router(reddit_health_router)
app.include_router(billing_router)
app.include_router(waitlist_router)
app.include_router(saturation_router)


@app.get("/health")
def health() -> dict:
    try:
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except OperationalError:
        return {"status": "degraded", "database": "unavailable"}
