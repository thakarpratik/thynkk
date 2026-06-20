"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { Mode, ScanStatus, Theme, TrendItem, TrendRadarMeta } from "./_types";
import { FREE_LIMIT } from "./_data/mock";
import {
  submitScan,
  pollStatus,
  fetchReport,
  fetchTrends,
  fetchQuota,
  fetchBillingStatus,
  activatePayPalSubscription,
} from "./_lib/api";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { ModeToggle } from "./_components/ModeToggle";
import { ScanInput } from "./_components/ScanInput";
import { ScanningState } from "./_components/ScanningState";
import { IdleState } from "./_components/IdleState";
import { ErrorState } from "./_components/ErrorState";
import { ReportHeader, type SortKey, type FilterVerdict } from "./_components/ReportHeader";
import { ThemeCard } from "./_components/ThemeCard";
import { ThemePanel } from "./_components/ThemePanel";
import { UpgradeStrip } from "./_components/UpgradeStrip";
import { TrendRadar } from "./_components/TrendRadar";
import { UpgradeModal } from "./_components/UpgradeModal";

const POLL_INTERVAL_MS = 3000;

type RadarStatus = "idle" | "loading" | "done" | "error" | "scanning";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const [mode, setMode] = useState<Mode>("scanner");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedQuery, setScannedQuery] = useState("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTheme, setActiveTheme] = useState<{ theme: Theme; index: number } | null>(null);
  const [sort, setSort] = useState<SortKey>("demand");
  const [filter, setFilter] = useState<FilterVerdict>("all");
  const [scanTime, setScanTime] = useState<Date | null>(null);

  const [quota, setQuota] = useState<Awaited<ReturnType<typeof fetchQuota>> | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [trendMeta, setTrendMeta] = useState<TrendRadarMeta | null>(null);
  const [radarStatus, setRadarStatus] = useState<RadarStatus>("idle");
  const [radarError, setRadarError] = useState("");

  const openUpgrade = useCallback(() => {
    setUpgradeError("");
    setUpgradeOpen(true);
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const [billing, q] = await Promise.all([
        fetchBillingStatus(getToken),
        fetchQuota(getToken),
      ]);
      setIsPro(billing.is_paid);
      setQuota(q);
    } catch {
      fetchQuota(getToken).then(setQuota).catch(() => null);
    }
  }, [getToken]);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") {
      openUpgrade();
    }
  }, [searchParams, openUpgrade]);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const poll = useCallback((scanId: string) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const s = await pollStatus(scanId);
        if (s.status === "done") {
          const report = await fetchReport(scanId, getToken);
          setThemes(report.themes);
          setFromCache(report.fromCache);
          setScanTime(new Date());
          setStatus("done");
          refreshAccount();
        } else if (s.status === "failed") {
          setErrorMessage(s.error ?? "Scan failed.");
          setStatus("error");
        } else {
          poll(scanId);
        }
      } catch {
        setErrorMessage("Lost connection to the API. Is the server running?");
        setStatus("error");
      }
    }, POLL_INTERVAL_MS);
  }, [getToken, refreshAccount]);

  const loadTrends = useCallback(async (refresh = false) => {
    setRadarStatus("loading");
    setRadarError("");
    try {
      const data = await fetchTrends(refresh);
      setTrends(data.niches.map((n) => ({
        niche: n.niche,
        description: n.description,
        growth: n.growth,
        growthPct: n.growth_pct,
        tag: n.tag,
        posts: n.posts,
        subreddit: n.subreddit,
      })));
      setTrendMeta({ asOf: new Date(data.as_of), windowDays: data.window_days });
      setRadarStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "scanning") {
        setRadarStatus("scanning");
      } else {
        setRadarError(msg);
        setRadarStatus("error");
      }
    }
  }, []);

  const handleQuickScan = (q: string) => {
    setQuery(q);
    setStatus("loading");
    setScannedQuery(q);
    setThemes([]);
    setFromCache(false);
    setScanTime(null);
    setErrorMessage("");
    setActiveTheme(null);
    setFilter("all");
    setSort("demand");
    stopPolling();
    submitScan(q, getToken).then(poll).catch((e: unknown) => {
      if (e instanceof Error && e.message === "quota_exceeded") {
        refreshAccount();
        setErrorMessage("Scan limit reached. Upgrade to Pro for 50 scans/month.");
      } else {
        setErrorMessage("Could not reach the API. Is the server running?");
      }
      setStatus("error");
    });
  };

  const handleScan = async () => {
    if (!query.trim()) return;
    stopPolling();
    setStatus("loading");
    setScannedQuery(query);
    setThemes([]);
    setFromCache(false);
    setScanTime(null);
    setErrorMessage("");
    setActiveTheme(null);
    setFilter("all");
    setSort("demand");

    try {
      const scanId = await submitScan(query, getToken);
      poll(scanId);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "quota_exceeded") {
        refreshAccount();
        setErrorMessage("Scan limit reached. Upgrade to Pro for 50 scans/month.");
      } else {
        setErrorMessage("Could not reach the API. Is the server running?");
      }
      setStatus("error");
    }
  };

  const handlePayPalSuccess = async (subscriptionId: string) => {
    try {
      await activatePayPalSubscription(subscriptionId, getToken);
      await refreshAccount();
      setIsPro(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not activate subscription.";
      setUpgradeError(msg);
      throw e;
    }
  };

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setStatus("idle");
    stopPolling();
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  const lockedCount = isPro ? 0 : Math.max(0, themes.length - FREE_LIMIT);
  const trendLockedCount = isPro ? 0 : Math.max(0, trends.length - FREE_LIMIT);

  const sortedFilteredThemes = [...themes]
    .filter((t) => filter === "all" || t.verdict === filter)
    .sort((a, b) => {
      if (sort === "demand") return b.demand - a.demand;
      if (sort === "severity") return b.severity - a.severity;
      return b.mentions - a.mentions;
    });

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <ModeToggle mode={mode} onChange={handleModeChange} />

        {mode === "scanner" && (
          <ScanInput
            query={query}
            status={status}
            quota={quota}
            onChange={setQuery}
            onScan={handleScan}
            onUpgrade={openUpgrade}
          />
        )}

        {status === "loading" && <ScanningState />}

        {status === "error" && (
          <ErrorState message={errorMessage} onRetry={handleRetry} />
        )}

        {mode === "scanner" && status === "done" && (
          <div>
            <ReportHeader
              query={scannedQuery}
              totalCount={themes.length}
              isPro={isPro}
              freeLimit={FREE_LIMIT}
              fromCache={fromCache}
              scanTime={scanTime}
              sort={sort}
              filter={filter}
              onSortChange={setSort}
              onFilterChange={setFilter}
            />

            <div className="space-y-4">
              {sortedFilteredThemes.map((theme, i) => (
                <ThemeCard
                  key={theme.name}
                  theme={theme}
                  index={i}
                  isPro={isPro}
                  variant={isPro || i < FREE_LIMIT ? "full" : "shallow"}
                  onClick={() => setActiveTheme({ theme, index: i })}
                />
              ))}
            </div>

            {!isPro && lockedCount > 0 && (
              <UpgradeStrip lockedCount={lockedCount} onUpgrade={openUpgrade} />
            )}
          </div>
        )}

        {mode === "radar" && (
          <TrendRadar
            trends={trends}
            meta={trendMeta}
            radarStatus={radarStatus}
            radarError={radarError}
            isPro={isPro}
            lockedCount={trendLockedCount}
            onScan={() => loadTrends()}
            onRefresh={() => loadTrends(true)}
            onUpgrade={openUpgrade}
          />
        )}

        {mode === "scanner" && status === "idle" && (
          <IdleState
            onScan={handleQuickScan}
            onSwitchRadar={() => handleModeChange("radar")}
          />
        )}
      </main>

      <ThemePanel
        theme={activeTheme?.theme ?? null}
        rank={(activeTheme?.index ?? 0) + 1}
        isPro={isPro}
        onClose={() => setActiveTheme(null)}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onSuccess={handlePayPalSuccess}
        error={upgradeError}
      />

      <SiteFooter />
    </div>
  );
}