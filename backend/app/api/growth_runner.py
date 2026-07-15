"""Growth scan runner — crawl site → Serper → Claude."""

from __future__ import annotations

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
from app.growth.serper import build_queries, search_threads


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
        store.update(scan_id, status=ScanStatus.running)

    from_cache = False
    success = False
    cancelled = False
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
            store.update(
                scan_id,
                status=ScanStatus.done,
                result=cached,
                from_cache=True,
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
            return

        site = crawl_site(url)
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        product = infer_product_context(site)
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        queries = build_queries(
            product["product_name"],
            product["niche_label"],
            product.get("keywords", []),
            product_summary=product.get("product_summary", ""),
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
            )
            _log_growth_scan(
                engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
                scan_id=scan_id, from_cache=False, status="failed", threads_count=0,
                attribution=attribution,
            )
            return

        report = analyze_growth(site, product, hits)
        if _abort_if_cancelled(store, scan_id):
            cancelled = True
            return

        payload = _report_to_dict(report)
        set_cached(engine, url, payload)
        store.update(scan_id, status=ScanStatus.done, result=payload, from_cache=False)
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

    except Exception as exc:
        if _is_cancelled(store, scan_id):
            cancelled = True
            return
        msg = str(exc).strip() or exc.__class__.__name__
        if "SERPER_API_KEY" in msg:
            msg = "SERPER_API_KEY is not configured on the server."
        elif "ANTHROPIC_API_KEY" in msg:
            msg = "ANTHROPIC_API_KEY is not configured on the server."
        store.update(scan_id, status=ScanStatus.failed, error=msg)
        _log_growth_scan(
            engine, ip=ip, url=url, account_key=account_key, clerk_id=clerk_id,
            scan_id=scan_id, from_cache=False, status="failed", threads_count=0,
            attribution=attribution,
        )
    finally:
        if cancelled or _is_cancelled(store, scan_id):
            # Ensure status stays cancelled; do not charge
            store.update(
                scan_id,
                status=ScanStatus.cancelled,
                error="Scan stopped by user.",
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
