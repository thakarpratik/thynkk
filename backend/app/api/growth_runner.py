"""Growth scan runner — crawl site → Serper → Claude."""

from __future__ import annotations

import threading

from sqlalchemy.engine import Engine

from app.api.admin import log_scan
from app.api.growth_scan_history import save_growth_scan
from app.api.growth_store import GrowthScanStore
from app.api.models import ScanStatus
from app.api.quota import finalize_scan_billing, get_scan_tier


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
from app.growth.analyze import analyze_growth, infer_product_context
from app.growth.cache import get_cached, set_cached
from app.growth.crawl import crawl_site
from app.growth.serper import build_queries, search_threads


def _report_to_dict(report) -> dict:
    return report.model_dump()


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
    store.update(scan_id, status=ScanStatus.running)
    from_cache = False
    success = False
    try:
        cached = get_cached(engine, url)
        if cached:
            from_cache = True
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
        product = infer_product_context(site)
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