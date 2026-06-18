"""Sliding-window rate limiter — no Redis required.

Limits:
  POST /scans       → 5 req / 60s per IP  (scan submission)
  GET  /radar/*     → 10 req / 60s per IP
  Global            → 120 req / 60s per IP (all routes)
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# (route_prefix, method) → (max_requests, window_seconds)
ROUTE_LIMITS: list[tuple[str, str, int, int]] = [
    ("/scans",        "POST", 5,   60),
    ("/radar",        "GET",  10,  60),
    ("/quota",        "GET",  30,  60),
]
GLOBAL_LIMIT = (120, 60)  # requests, window_seconds

# ip -> deque of timestamps
_global_windows: dict[str, deque] = defaultdict(deque)
_route_windows:  dict[tuple[str, str, str], deque] = defaultdict(deque)
_lock = Lock()


def _get_ip(request: Request) -> str:
    # Prefer Cloudflare real IP, then first X-Forwarded-For, then direct
    for header in ("CF-Connecting-IP", "X-Real-IP"):
        val = request.headers.get(header)
        if val:
            return val.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _sliding_window_ok(window: deque, max_req: int, window_sec: int) -> tuple[bool, int]:
    """Return (allowed, retry_after_seconds)."""
    now = time.monotonic()
    cutoff = now - window_sec
    while window and window[0] < cutoff:
        window.popleft()
    if len(window) >= max_req:
        oldest = window[0]
        retry_after = int(window_sec - (now - oldest)) + 1
        return False, retry_after
    window.append(now)
    return True, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        ip = _get_ip(request)
        path = request.url.path
        method = request.method

        with _lock:
            # Global bucket
            ok, retry = _sliding_window_ok(_global_windows[ip], *GLOBAL_LIMIT)
            if not ok:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Slow down."},
                    headers={"Retry-After": str(retry)},
                )

            # Route-specific buckets
            for prefix, route_method, max_req, window_sec in ROUTE_LIMITS:
                if path.startswith(prefix) and method == route_method:
                    key = (ip, prefix, route_method)
                    ok, retry = _sliding_window_ok(_route_windows[key], max_req, window_sec)
                    if not ok:
                        return JSONResponse(
                            status_code=429,
                            content={"detail": f"Rate limit exceeded. Retry in {retry}s."},
                            headers={"Retry-After": str(retry)},
                        )
                    break

        return await call_next(request)
