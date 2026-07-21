"""Growth scan runner — crawl site → parallel Serper → one Claude write."""

from __future__ import annotations

import logging
import threading

from sqlalchemy.engine import Engine

from app.api.admin import log_scan
from app.api.growth_scan_history import save_growth_scan
from app.api.growth_store import GrowthScanStore
from app.api.models import ScanStatus
from app.api.quota import finalize_scan_billing, get_scan_tier
from app.growth.analyze import analyze_growth, ensure_promotional_post_ideas, infer_product_context
from app.growth.cache import get_cached, set_cached
from app.growth.crawl import crawl_site
from app.growth.serper import build_queries, search_threads, sort_hits_by_recency

logger = logging.getLogger(__name__)


def _log_growth_scan(
    engine: Engine,
    *,
    ip: str,
    url: str,
    account_key: str,
    clerk_id: str | None,
    scan_id: str,
    from_cache: bool,
    status: str,
    threads_count: int,
    attribution: dict | None = None,
) -> None:
    tier = get_scan_tier(engine, scan_id, account_key)
    log_scan(
        ip,
        url,
        from_cache=from_cache,
        status=status,
        themes_count=threads_count,
        engine=engine,
        scan_type="growth",
        clerk_id=clerk_id,
        tier=tier,
        attribution=attribution,
    )


def _report_to_dict(report) -> dict:
    return report.model_dump()


def _is_cancelled(store: GrowthScanStore, scan_id: str) -> bool:
    job = store.get(scan_id)
    return bool(job and job.status == ScanStatus.cancelled)


def _abort_if_cancelled(store: GrowthScanStore, scan_id: str) -> bool:
    """Return True if the job was cancelled (caller should exit quietly)."""
    return _is_cancelled(store, scan_id)


def _set_progress(
    store: GrowthScanStore,
    scan_id: str,
    *,
    stage: str,
    message: str,
    progress_pct: int,
    **extra,
) -> None:
    if _is_cancelled(store, scan_id):
        return
    store.update(
        scan_id,
        status=ScanStatus.running,
        stage=stage,
        stage_message=message,
        progress_pct=max(0, min(99, progress_pct)),
        **extra,
    )


def _hits_to_partial(
    product: dict,
    hits: list,
    *,
    limit: int = 12,
) -> dict:
    """Serialize Serper hits for early UI (before reply drafts)."""
    ordered = sort_hits_by_recency(hits)[:limit]
    threads = []
    for h in ordered:
        threads.append({
            "title": (h.title or "Untitled")[:300],
            "url": h.url or "",
            "source": h.source or "reddit",
            "snippet": (h.snippet or "")[:240],
            "date": (h.date or "")[:80],
            "query": (h.query or "")[:120],
        })
    return {
        "product_name": product.get("product_name") or "",
        "niche_label": product.get("niche_label") or "",
        "product_summary": product.get("product_summary") or "",
        "audience": product.get("audience") or "",
        "threads": threads,
        "total_threads": len(threads),
        "drafts_ready": False,
    }


def _maybe_notify(store: GrowthScanStore, scan_id: str, *, url: str, success: bool, product_name: str = "") -> None:
    job = store.get(scan_id)
    if not job or not job.notify_email or job.notify_sent:
        return
    try:
        from app.email.brevo import send_scan_ready_async

        send_scan_ready_async(
            job.notify_email,
            url=url,
            success=success,
            product_name=product_name or "",
            scan_id=scan_id,
        )
        store.update(scan_id, notify_sent=True)
    except Exception as exc:  # noqa: BLE001 — never fail the scan on email
        logger.warning("Notify email failed for %s: %s", scan_id, exc)


def _run(
    scan_id: str,
    url: str,
    store: GrowthScanStore,
    engine: Engine,
    *,
    account_key: str,
    clerk_id: str | None,
    ip: str = "unknown",
    attribution: dict | None = None,
) -> None:
    # Don't overwrite a cancel that raced before the thread started
    if not _is_cancelled(store, scan_id):
        _set_progress(
            store, scan_id,
            stage="starting",
            message="Starting scan…",
            progress_pct=5,
        )

    from_cache = False
    success = False
    cancelled = False
    product_name = ""
    try:
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        cached = get_cached(engine, url)
        if cached:
            if _abort_if_cancelled(store, scan_id):
                cancelled = True
                return
            from_cache = True
            # Upgrade older cached drafts (outline-only / missing product promo)
            cached = ensure_promotional_post_ideas(cached, url)
            product_name = str(cached.get("product_name") or "")
            store.update(
                scan_id,
                status=ScanStatus.done,
                result=cached,
                from_cache=True,
                stage="done",
                stage_message="Loaded from cache",
                progress_pct=100,
                partial=None,
            )
            _log_growth_scan(
                engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
                scan_id=scan_id, from_cache=True, status="done",
                threads_count=len(cached.get("threads", [])),
                attribution=attribution,
            )
            success = True
            _persist_growth_scan(
                engine, scan_id, account_key, clerk_id, url, cached, from_cache=True,
            )
            _maybe_notify(store, scan_id, url=url, success=True, product_name=product_name)
            return

        _set_progress(
            store, scan_id,
            stage="crawling",
            message="Reading your website…",
            progress_pct=12,
        )
        site = crawl_site(url)
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        _set_progress(
            store, scan_id,
            stage="understanding",
            message="Understanding your product…",
            progress_pct=22,
        )
        # Heuristic only — one Claude call later for drafts
        product = infer_product_context(site)
        product_name = product.get("product_name") or ""
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        queries = build_queries(
            product["product_name"],
            product["niche_label"],
            product.get("keywords", []),
            product_summary=product.get("product_summary", ""),
        )
        _set_progress(
            store, scan_id,
            stage="searching",
            message="Searching community discussions…",
            progress_pct=30,
            partial={
                "product_name": product_name,
                "niche_label": product.get("niche_label") or "",
                "product_summary": product.get("product_summary") or "",
                "audience": product.get("audience") or "",
                "threads": [],
                "total_threads": 0,
                "drafts_ready": False,
            },
        )
        hits = search_threads(
            queries,
            niche=product["niche_label"],
            keywords=product.get("keywords", []),
        )
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        if not hits:
            store.update(
                scan_id,
                status=ScanStatus.failed,
                error="No community discussions found. Try a site with a clearer product description.",
                stage="failed",
                stage_message="No discussions found",
                progress_pct=100,
            )
            _log_growth_scan(
                engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
                scan_id=scan_id, from_cache=False, status="failed", threads_count=0,
                attribution=attribution,
            )
            _maybe_notify(store, scan_id, url=url, success=False, product_name=product_name)
            return

        # Partial results: show real threads while Claude writes drafts
        partial = _hits_to_partial(product, hits)
        _set_progress(
            store, scan_id,
            stage="writing",
            message=f"Found {len(partial['threads'])} threads — writing reply drafts…",
            progress_pct=58,
            partial=partial,
        )

        report = analyze_growth(site, product, hits)
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        payload = _report_to_dict(report)
        product_name = payload.get("product_name") or product_name
        set_cached(engine, url, payload)
        store.update(
            scan_id,
            status=ScanStatus.done,
            result=payload,
            from_cache=False,
            stage="done",
            stage_message="Scan complete",
            progress_pct=100,
            partial={**partial, "drafts_ready": True},
        )
        _log_growth_scan(
            engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
            scan_id=scan_id, from_cache=False, status="done",
            threads_count=len(payload.get("threads", [])),
            attribution=attribution,
        )
        success = True
        _persist_growth_scan(
            engine, scan_id, account_key, clerk_id, url, payload, from_cache=False,
        )
        _maybe_notify(store, scan_id, url=url, success=True, product_name=product_name)

    except Exception as exc:
        if _is_cancelled(store, scan_id):
            cancelled = True
            return
        msg = str(exc).strip() or exc.__class__.__name__
        if "SERPER_API_KEY" in msg:
            msg = "SERPER_API_KEY is not configured on the server."
        elif "ANTHROPIC_API_KEY" in msg:
            msg = "ANTHROPIC_API_KEY is not configured on the server."
        store.update(
            scan_id,
            status=ScanStatus.failed,
            error=msg,
            stage="failed",
            stage_message="Scan failed",
            progress_pct=100,
        )
        _log_growth_scan(
            engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
            scan_id=scan_id, from_cache=False, status="failed", threads_count=0,
            attribution=attribution,
        )
        _maybe_notify(store, scan_id, url=url, success=False, product_name=product_name)
    finally:
        if cancelled or _is_cancelled(store, scan_id):
            # Ensure status stays cancelled; do not charge
            store.update(
                scan_id,
                status=ScanStatus.cancelled,
                error="Scan stopped by user.",
                stage="cancelled",
                stage_message="Stopped",
                progress_pct=100,
            )
            _log_growth_scan(
                engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
                scan_id=scan_id, from_cache=from_cache, status="cancelled",
                threads_count=0, attribution=attribution,
            )
            finalize_scan_billing(
                engine,
                scan_id,
                success=False,
                from_cache=from_cache,
                ip=ip,
            )
        else:
            finalize_scan_billing(
                engine,
                scan_id,
                success=success,
                from_cache=from_cache,
                ip=ip,
            )


def _persist_growth_scan(
    engine: Engine,
    scan_id: str,
    account_key: str,
    clerk_id: str | None,
    url: str,
    payload: dict,
    *,
    from_cache: bool,
) -> None:
    tier = get_scan_tier(engine, scan_id, account_key) or "free"
    save_growth_scan(
        engine,
        scan_id=scan_id,
        account_key=account_key,
        clerk_id=clerk_id,
        url=url,
        product_name=payload.get("product_name") or "",
        report=payload,
        tier=tier,
        from_cache=from_cache,
    )


def start_growth_scan(
    scan_id: str,
    url: str,
    store: GrowthScanStore,
    engine: Engine,
    *,
    account_key: str,
    clerk_id: str | None,
    ip: str = "unknown",
    attribution: dict | None = None,
) -> None:
    thread = threading.Thread(
        target=_run,
        kwargs={
            "scan_id": scan_id,
            "url": url,
            "store": store,
            "engine": engine,
            "account_key": account_key,
            "clerk_id": clerk_id,
            "ip": ip,
            "attribution": attribution,
        },
        daemon=True,
    )
    thread.start()
