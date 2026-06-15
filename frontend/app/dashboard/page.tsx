"use client";

import { useCallback, useRef, useState } from "react";
import type { Mode, ScanStatus, Theme } from "./_types";
import { FREE_LIMIT, MOCK_TRENDS } from "./_data/mock";
import { submitScan, pollStatus, fetchReport, type Report } from "./_lib/api";
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

const isPro = false;
const POLL_INTERVAL_MS = 3000;

export default function Dashboard() {
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
          const report = await fetchReport(scanId);
          setThemes(report.themes);
          setFromCache(report.fromCache);
          setScanTime(new Date());
          setStatus("done");
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
  }, []);

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
      const scanId = await submitScan(query);
      poll(scanId);
    } catch {
      setErrorMessage("Could not reach the API. Is the server running?");
      setStatus("error");
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

  const trendLockedCount = isPro ? 0 : Math.max(0, MOCK_TRENDS.length - FREE_LIMIT);
  const lockedCount = isPro ? 0 : Math.max(0, themes.length - FREE_LIMIT);

  const sortedFilteredThemes = [...themes]
    .filter((t) => filter === "all" || t.verdict === filter)
    .sort((a, b) => {
      if (sort === "demand") return b.demand - a.demand;
      if (sort === "severity") return b.severity - a.severity;
      return b.mentions - a.mentions;
    });

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <DashboardNav isPro={isPro} />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <ModeToggle mode={mode} onChange={handleModeChange} />

        {mode === "scanner" && (
          <ScanInput
            query={query}
            status={status}
            onChange={setQuery}
            onScan={handleScan}
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
              <UpgradeStrip lockedCount={lockedCount} />
            )}
          </div>
        )}

        {mode === "radar" && (
          <TrendRadar
            trends={MOCK_TRENDS}
            isPro={isPro}
            lockedCount={trendLockedCount}
          />
        )}

        {mode === "scanner" && status === "idle" && <IdleState />}
      </main>

      <ThemePanel
        theme={activeTheme?.theme ?? null}
        rank={(activeTheme?.index ?? 0) + 1}
        isPro={isPro}
        onClose={() => setActiveTheme(null)}
      />
    </div>
  );
}
