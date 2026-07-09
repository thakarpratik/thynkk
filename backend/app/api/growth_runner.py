"""Growth scan runner — crawl site → Serper → Claude."""

from __future__ import annotations

import threading

from sqlalchemy.engine import Engine

from app.api.admin import log_scan
from app.api.growth_store import GrowthScanStore
from app.api.models import ScanStatus
from app.api.quota import finalize_scan_billing
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
    ip: str = "unknown",
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
            log_scan(ip, url, from_cache=True, status="done", themes_count=len(cached.get("threads", [])), engine=engine)
            success = True
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
            log_scan(ip, url, from_cache=False, status="failed", themes_count=0, engine=engine)
            return

        report = analyze_growth(site, product, hits)
        payload = _report_to_dict(report)
        set_cached(engine, url, payload)
        store.update(scan_id, status=ScanStatus.done, result=payload, from_cache=False)
        log_scan(ip, url, from_cache=False, status="done", themes_count=len(payload.get("threads", [])), engine=engine)
        success = True

    except Exception as exc:
        msg = str(exc).strip() or exc.__class__.__name__
        if "SERPER_API_KEY" in msg:
            msg = "SERPER_API_KEY is not configured on the server."
        elif "ANTHROPIC_API_KEY" in msg:
            msg = "ANTHROPIC_API_KEY is not configured on the server."
        store.update(scan_id, status=ScanStatus.failed, error=msg)
        log_scan(ip, url, from_cache=False, status="failed", themes_count=0, engine=engine)
    finally:
        finalize_scan_billing(
            engine,
            scan_id,
            success=success,
            from_cache=from_cache,
            ip=ip,
        )


def start_growth_scan(
    scan_id: str,
    url: str,
    store: GrowthScanStore,
    engine: Engine,
    ip: str = "unknown",
) -> None:
    thread = threading.Thread(
        target=_run,
        args=(scan_id, url, store, engine, ip),
        daemon=True,
    )
    thread.start()