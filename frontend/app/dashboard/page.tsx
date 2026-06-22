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
  fetchScanHistory,
  activatePayPalSubscription,
  type ScanHistoryItemApi,
} from "./_lib/api";
import {
  loadScanHistory,
  saveScanToHistory,
  clearScanHistory,
  mergeScanHistories,
  type ScanHistoryEntry,
} from "./_lib/scan-history";
import { downloadThemesCsv } from "./_lib/export-csv";
import { DashboardNav } from "./_components/DashboardNav";
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
import { ScanHistory } from "./_components/ScanHistory";

const POLL_INTERVAL_MS = 3000;

type RadarStatus = "idle" | "loading" | "done" | "error" | "scanning";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("mode") === "radar" ? "radar" : "scanner"
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedQuery, setScannedQuery] = useState("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [totalThemes, setTotalThemes] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTheme, setActiveTheme] = useState<{ theme: Theme; index: number } | null>(null);
  const [sort, setSort] = useState<SortKey>("demand");
  const [filter, setFilter] = useState<FilterVerdict>("all");
  const [scanTime, setScanTime] = useState<Date | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  const [quota, setQuota] = useState<Awaited<ReturnType<typeof fetchQuota>> | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [trendMeta, setTrendMeta] = useState<TrendRadarMeta | null>(null);
  const [radarStatus, setRadarStatus] = useState<RadarStatus>("idle");
  const [radarError, setRadarError] = useState("");

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radarBootstrapped = useRef(false);

  const openUpgrade = useCallback(() => {
    setUpgradeError("");
    setUpgradeOpen(true);
  }, []);

  const serverEntryFromApi = useCallback((item: ScanHistoryItemApi): ScanHistoryEntry => ({
    id: item.scan_id,
    query: item.query,
    scannedAt: item.scanned_at,
    themeCount: item.theme_count,
    totalThemes: item.total_themes,
    topTheme: item.top_theme,
    fromCache: item.from_cache,
    themes: item.themes.map((t) => ({
      name: t.name,
      summary: t.summary,
      opportunity: t.opportunity,
      severity: t.severity_score,
      mentions: t.mention_count,
      demand: Math.round(t.demand_score),
      verdict: t.verdict ?? "Unknown",
      willingnessToPay: t.willingness_to_pay ?? "Unknown",
      willingnessReason: t.willingness_reason ?? "",
      competition: t.competition ?? "",
      nextStep: t.next_step ?? "",
      quotes: t.quotes.map((q) => ({ text: q.excerpt, url: q.permalink })),
      demandLabel: t.demand_label ?? null,
      severityLabel: t.severity_label ?? null,
      locked: t.locked ?? false,
    })),
  }), []);

  const loadHistory = useCallback(async () => {
    const local = loadScanHistory();
    if (!isSignedIn) {
      setScanHistory(local);
      return;
    }
    try {
      const remote = (await fetchScanHistory(getToken)).map(serverEntryFromApi);
      const merged = mergeScanHistories(local, remote);
      setScanHistory(merged);
      if (typeof window !== "undefined" && remote.length > 0) {
        localStorage.setItem("thynkk_scan_history", JSON.stringify(merged));
      }
    } catch {
      setScanHistory(local);
    }
  }, [getToken, isSignedIn, serverEntryFromApi]);

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
    await loadHistory();
  }, [getToken, loadHistory]);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") {
      openUpgrade();
    }
    if (searchParams.get("mode") === "radar") {
      setMode("radar");
    }
  }, [searchParams, openUpgrade]);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const loadTrends = useCallback(async (refresh = false) => {
    setRadarStatus("loading");
    setRadarError("");
    try {
      const data = await fetchTrends(refresh, getToken);
      setTrends(data.niches.map((n) => ({
        niche: n.niche,
        description: n.description,
        growth: n.growth,
        growthPct: n.growth_pct,
        tag: n.tag,
        posts: n.posts,
        subreddit: n.subreddit,
        locked: n.locked ?? false,
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
  }, [getToken]);

  useEffect(() => {
    if (mode === "radar" && radarStatus === "idle" && !radarBootstrapped.current) {
      radarBootstrapped.current = true;
      loadTrends();
    }
  }, [mode, radarStatus, loadTrends]);

  const persistScan = useCallback((
    scanId: string,
    q: string,
    reportThemes: Theme[],
    total: number,
    cached: boolean,
  ) => {
    const top = reportThemes[0]?.name ?? "—";
    const updated = saveScanToHistory({
      id: scanId,
      query: q,
      themeCount: reportThemes.length,
      totalThemes: total,
      topTheme: top,
      fromCache: cached,
      themes: reportThemes,
    });
    if (updated) setScanHistory(updated);
  }, []);

  const poll = useCallback((scanId: string) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const s = await pollStatus(scanId);
        if (s.status === "done") {
          const report = await fetchReport(scanId, getToken);
          setThemes(report.themes);
          setTotalThemes(report.totalThemes);
          setFromCache(report.fromCache);
          setScanTime(new Date());
          setStatus("done");
          persistScan(scanId, s.query, report.themes, report.totalThemes, report.fromCache);
          refreshAccount();
        } else if (s.status === "failed") {
          setErrorMessage(s.error ?? "Scan failed. Try a different niche or subreddit.");
          setStatus("error");
        } else {
          poll(scanId);
        }
      } catch {
        setErrorMessage("Connection lost. Check your network and try again.");
        setStatus("error");
      }
    }, POLL_INTERVAL_MS);
  }, [getToken, refreshAccount, persistScan]);

  const beginScan = (q: string) => {
    setQuery(q);
    setStatus("loading");
    setScannedQuery(q);
    setThemes([]);
    setTotalThemes(0);
    setFromCache(false);
    setScanTime(null);
    setErrorMessage("");
    setActiveTheme(null);
    setFilter("all");
    setSort("demand");
    stopPolling();
    submitScan(q, getToken).then(poll).catch((e: unknown) => {
      if (e instanceof Error) {
        if (e.message === "quota_exceeded") {
          refreshAccount();
          setErrorMessage("Scan limit reached. Upgrade to Pro for 50 scans/month.");
        } else if (e.message === "ip_quota_exceeded") {
          refreshAccount();
          setErrorMessage("Free scan limit reached for this network. Upgrade to Pro for more scans.");
        } else if (e.message === "email_not_verified") {
          setErrorMessage("Please verify your email address before scanning. Check your inbox.");
        } else {
          setErrorMessage("Could not start scan. Please try again in a moment.");
        }
      } else {
        setErrorMessage("Could not start scan. Please try again in a moment.");
      }
      setStatus("error");
    });
  };

  const handleScan = async () => {
    if (!query.trim()) return;
    beginScan(query);
  };

  const handleQuickScan = (q: string) => beginScan(q);

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
    if (next === "radar" && radarStatus === "idle" && !radarBootstrapped.current) {
      radarBootstrapped.current = true;
      loadTrends();
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  const handleRestore = (entry: ScanHistoryEntry) => {
    setQuery(entry.query);
    setScannedQuery(entry.query);
    setThemes(entry.themes);
    setTotalThemes(entry.totalThemes);
    setFromCache(entry.fromCache);
    setScanTime(new Date(entry.scannedAt));
    setStatus("done");
    setActiveTheme(null);
    setMode("scanner");
  };

  const handleClearHistory = () => {
    clearScanHistory();
    setScanHistory([]);
  };

  const handleExport = () => {
    if (themes.length === 0) return;
    downloadThemesCsv(scannedQuery, themes);
  };

  const hiddenThemeCount = !isPro ? Math.max(0, totalThemes - themes.length) : 0;

  const sortedFilteredThemes = [...themes]
    .filter((t) => filter === "all" || t.verdict === filter)
    .sort((a, b) => {
      if (sort === "demand") return b.demand - a.demand;
      if (sort === "severity") return b.severity - a.severity;
      return b.mentions - a.mentions;
    });

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <DashboardNav isPro={isPro} quota={quota} onUpgrade={openUpgrade} />

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16">
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

        {mode === "scanner" && status === "idle" && scanHistory.length > 0 && (
          <div className="mb-8">
            <ScanHistory
              history={scanHistory}
              onRestore={handleRestore}
              onClear={handleClearHistory}
            />
          </div>
        )}

        {mode === "scanner" && status === "loading" && <ScanningState />}

        {mode === "scanner" && status === "error" && (
          <ErrorState message={errorMessage} onRetry={handleRetry} />
        )}

        {mode === "scanner" && status === "done" && (
          <div>
            <ReportHeader
              query={scannedQuery}
              visibleCount={themes.length}
              totalThemes={totalThemes}
              isPro={isPro}
              fromCache={fromCache}
              scanTime={scanTime}
              sort={sort}
              filter={filter}
              onSortChange={setSort}
              onFilterChange={setFilter}
              onExport={isPro ? handleExport : undefined}
            />

            <div className="space-y-4">
              {sortedFilteredThemes.map((theme, i) => (
                <ThemeCard
                  key={theme.name}
                  theme={theme}
                  index={i}
                  isPro={isPro}
                  onClick={() => setActiveTheme({ theme, index: i })}
                />
              ))}
            </div>

            {!isPro && (
              <UpgradeStrip variant="scanner" hiddenCount={hiddenThemeCount} onUpgrade={openUpgrade} />
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
            freeLimit={FREE_LIMIT}
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

        {mode === "scanner" && status === "done" && scanHistory.length > 0 && (
          <div className="mt-10 pt-8 border-t border-[#1E293B]">
            <ScanHistory
              history={scanHistory.filter((h) => h.query !== scannedQuery)}
              onRestore={handleRestore}
              onClear={handleClearHistory}
            />
          </div>
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
    </div>
  );
}