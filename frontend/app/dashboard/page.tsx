"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { GrowthReport, ScanStatus } from "./_types";
import {
  submitGrowthScan,
  pollGrowthStatus,
  cancelGrowthScan,
  fetchGrowthReport,
  fetchGrowthScanHistory,
  fetchQuota,
  fetchBillingStatus,
  capturePayPalOrder,
} from "./_lib/api";
import { normalizeWebsiteUrl } from "./_lib/website-url";
import { PACK_SCANS } from "../_lib/pricing";
import { DashboardNav } from "./_components/DashboardNav";
import { DashboardStepper } from "./_components/DashboardStepper";
import { GrowthScanInput } from "./_components/GrowthScanInput";
import { GrowthScanningState } from "./_components/GrowthScanningState";
import { GrowthIdleState } from "./_components/GrowthIdleState";
import { GrowthReportSummary } from "./_components/GrowthReportSummary";
import { ResultsQuickNav, type ResultsTab } from "./_components/ResultsQuickNav";
import { SectionHeader } from "./_components/SectionHeader";
import { ErrorState } from "./_components/ErrorState";
import { ThreadCard } from "./_components/ThreadCard";
import { PostIdeaCard } from "./_components/PostIdeaCard";
import { UpgradeStrip } from "./_components/UpgradeStrip";
import { UpgradeModal } from "./_components/UpgradeModal";
import {
  GrowthScanHistory,
  type GrowthScanHistoryEntry,
} from "./_components/GrowthScanHistory";
import { sortThreads, type ThreadSort } from "./_lib/thread-sort";

const POLL_INTERVAL_MS = 3000;

function formatScanError(e: unknown): string {
  if (!(e instanceof Error)) return "Could not start scan. Please try again.";
  const msg = e.message;
  if (msg === "quota_exceeded") return `No scans left. Buy a Launch Pack for ${PACK_SCANS} full scans.`;
  if (msg === "ip_quota_exceeded") return "Free scan limit reached for this network. Buy a Launch Pack for more scans.";
  if (msg === "email_not_verified") return "Please verify your email before scanning.";
  if (msg === "auth_invalid") return "Session expired. Sign out and sign back in, then try again.";
  if (msg === "Failed to fetch") return "Could not reach the API. Check your connection or try again in a moment.";
  return msg || "Could not start scan. Please try again.";
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [scanCredits, setScanCredits] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedUrl, setScannedUrl] = useState("");
  const [report, setReport] = useState<(GrowthReport & { scanId: string; url: string }) | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scanTime, setScanTime] = useState<Date | null>(null);
  const [quota, setQuota] = useState<Awaited<ReturnType<typeof fetchQuota>> | null>(null);
  const [scanHistory, setScanHistory] = useState<GrowthScanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [resultsTab, setResultsTab] = useState<ResultsTab>("replies");
  const [threadSort, setThreadSort] = useState<ThreadSort>("latest");

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeScanIdRef = useRef<string | null>(null);
  const stoppedRef = useRef(false);
  const autoScanStarted = useRef(false);

  const reportIsFull = report?.reportTier === "full";

  const sortedThreads = useMemo(
    () => (report ? sortThreads(report.threads, threadSort) : []),
    [report, threadSort],
  );

  const openUpgrade = useCallback(() => {
    setUpgradeError("");
    setUpgradeOpen(true);
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!isSignedIn) {
      setScanHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const rows = await fetchGrowthScanHistory(getToken);
      setScanHistory(
        rows.map((row) => ({
          scanId: row.scan_id,
          url: row.url,
          productName: row.product_name,
          tier: row.tier,
          totalThreads: row.total_threads,
          fromCache: row.from_cache,
          scannedAt: row.scanned_at,
        })),
      );
    } catch {
      setScanHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken, isSignedIn]);

  const refreshAccount = useCallback(async () => {
    try {
      const [billing, q] = await Promise.all([
        fetchBillingStatus(getToken),
        fetchQuota(getToken),
      ]);
      setScanCredits(billing.scan_credits);
      setQuota(q);
    } catch {
      fetchQuota(getToken).then(setQuota).catch(() => null);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      refreshAccount();
      refreshHistory();
    }
  }, [isLoaded, isSignedIn, refreshAccount, refreshHistory]);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") openUpgrade();
    const param = searchParams.get("url");
    if (param) setUrl(param);
  }, [searchParams, openUpgrade]);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const clearActiveScan = () => {
    activeScanIdRef.current = null;
    setActiveScanId(null);
    setStopping(false);
  };

  const poll = useCallback((scanId: string) => {
    pollTimer.current = setTimeout(async () => {
      if (stoppedRef.current || activeScanIdRef.current !== scanId) return;
      try {
        const s = await pollGrowthStatus(scanId);
        if (stoppedRef.current || activeScanIdRef.current !== scanId) return;

        if (s.status === "done") {
          const data = await fetchGrowthReport(scanId, getToken);
          if (stoppedRef.current || activeScanIdRef.current !== scanId) return;
          setReport(data);
          setResultsTab("replies");
          setScanTime(new Date());
          setStatus("done");
          clearActiveScan();
          refreshAccount();
          refreshHistory();
        } else if (s.status === "failed") {
          setErrorMessage(s.error ?? "Scan failed. Try a different URL.");
          setStatus("error");
          clearActiveScan();
          refreshAccount();
        } else if (s.status === "cancelled") {
          setErrorMessage("Scan stopped.");
          setStatus("error");
          clearActiveScan();
          refreshAccount();
        } else {
          poll(scanId);
        }
      } catch (e: unknown) {
        if (stoppedRef.current) return;
        setErrorMessage(formatScanError(e));
        setStatus("error");
        clearActiveScan();
      }
    }, POLL_INTERVAL_MS);
  }, [getToken, refreshAccount, refreshHistory]);

  const handleStopScan = async () => {
    const scanId = activeScanIdRef.current;
    stoppedRef.current = true;
    stopPolling();
    setStopping(true);

    if (scanId) {
      try {
        await cancelGrowthScan(scanId, getToken);
      } catch {
        /* client already stopped waiting */
      }
    }

    clearActiveScan();
    setStatus("idle");
    setErrorMessage("");
    refreshAccount();
  };

  const beginScan = async (targetUrl: string) => {
    if (!isLoaded) return;

    let normalized: string;
    try {
      normalized = normalizeWebsiteUrl(targetUrl);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "Enter a valid website URL.");
      setStatus("error");
      return;
    }

    setUrl(normalized);
    setScannedUrl(normalized);
    setReport(null);
    setScanTime(null);
    setErrorMessage("");
    stoppedRef.current = false;
    setStopping(false);
    stopPolling();
    clearActiveScan();

    if (!isSignedIn) {
      setErrorMessage("Please sign in to scan your site.");
      setStatus("error");
      return;
    }

    const token = await getToken();
    if (!token) {
      setErrorMessage("Session expired. Sign out and sign back in, then try again.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    submitGrowthScan(normalized, getToken)
      .then((scanId) => {
        if (stoppedRef.current) {
          void cancelGrowthScan(scanId, getToken).catch(() => null);
          return;
        }
        activeScanIdRef.current = scanId;
        setActiveScanId(scanId);
        poll(scanId);
      })
      .catch((e: unknown) => {
        if (stoppedRef.current) return;
        setErrorMessage(formatScanError(e));
        setStatus("error");
        clearActiveScan();
      });
  };

  const handleScan = () => {
    if (!url.trim()) return;
    beginScan(url.trim());
  };

  const handleRestoreScan = async (entry: GrowthScanHistoryEntry) => {
    stoppedRef.current = true;
    stopPolling();
    clearActiveScan();
    setErrorMessage("");
    setScannedUrl(entry.url);
    setUrl(entry.url);
    setStatus("loading");

    try {
      const data = await fetchGrowthReport(entry.scanId, getToken);
      setReport(data);
      setResultsTab("replies");
      setScanTime(new Date(entry.scannedAt));
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      setErrorMessage(formatScanError(e));
      setStatus("error");
    }
  };

  const handleNewScan = () => {
    stoppedRef.current = true;
    stopPolling();
    clearActiveScan();
    setStatus("idle");
    setReport(null);
    setErrorMessage("");
    setScanTime(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const param = searchParams.get("url");
    if (!param || !isLoaded || !isSignedIn || autoScanStarted.current || status !== "idle") return;
    autoScanStarted.current = true;
    void beginScan(param);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when landing with ?url=
  }, [isLoaded, isSignedIn, searchParams, status]);

  const handlePayPalSuccess = async (orderId: string) => {
    try {
      const result = await capturePayPalOrder(orderId, getToken);
      setScanCredits(result.scan_credits);
      await refreshAccount();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not complete payment.";
      setUpgradeError(msg);
      throw e;
    }
  };

  const hiddenThreads = !reportIsFull && report ? Math.max(0, report.totalThreads - report.threads.length) : 0;
  const hiddenPosts = !reportIsFull && report ? Math.max(0, report.totalPostIdeas - report.postIdeas.length) : 0;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DashboardNav scanCredits={scanCredits} quota={quota} onUpgrade={openUpgrade} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-20">
        <header className="mb-8">
          <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight">
            Growth dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Paste your site, find conversations worth joining, and copy reply drafts — in three steps.
          </p>
        </header>

        <DashboardStepper status={status} />

        <GrowthScanInput
          url={url}
          status={status}
          quota={quota}
          onChange={setUrl}
          onScan={handleScan}
          onUpgrade={openUpgrade}
        />

        {isSignedIn && (
          <div className="mt-6 mb-8">
            <GrowthScanHistory
              history={scanHistory}
              loading={historyLoading}
              onRestore={handleRestoreScan}
            />
          </div>
        )}

        {status === "loading" && (
          <GrowthScanningState onStop={handleStopScan} stopping={stopping} />
        )}

        {status === "error" && (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              setStatus("idle");
              setErrorMessage("");
            }}
          />
        )}

        {status === "done" && report && (
          <div>
            <GrowthReportSummary
              report={report}
              scannedUrl={scannedUrl}
              scanTime={scanTime}
              isPro={reportIsFull}
              onNewScan={handleNewScan}
            />

            <ResultsQuickNav
              active={resultsTab}
              onChange={setResultsTab}
              threadCount={report.threads.length}
              postCount={report.postIdeas.length}
              communityCount={report.subreddits.length}
            />

            {resultsTab === "replies" && (
              <section className="mb-12" role="tabpanel" aria-label="Reply to threads">
                <SectionHeader
                  step={1}
                  title="Reply to these threads"
                  description="Existing Reddit discussions. Open the thread → copy the reply draft → paste as a comment. Not a new post."
                  count={`${report.threads.length}${report.totalThreads > report.threads.length ? ` of ${report.totalThreads}` : ""} shown`}
                />

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mr-1">
                    Sort
                  </span>
                  {(
                    [
                      { id: "latest" as const, label: "Latest first" },
                      { id: "match" as const, label: "Best match" },
                    ] as const
                  ).map((opt) => {
                    const active = threadSort === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setThreadSort(opt.id)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? "border-sky-500 bg-sky-500/15 text-sky-300"
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  {sortedThreads.map((thread, i) => (
                    <ThreadCard key={thread.url} thread={thread} index={i} isPro={reportIsFull} onUpgrade={openUpgrade} />
                  ))}
                </div>
                {!reportIsFull && hiddenThreads > 0 && (
                  <UpgradeStrip variant="growth" hiddenCount={hiddenThreads} onUpgrade={openUpgrade} />
                )}
              </section>
            )}

            {resultsTab === "posts" && (
              <section className="mb-12" role="tabpanel" aria-label="Create new posts">
                <SectionHeader
                  step={2}
                  title="Create new posts on Reddit"
                  description="Your own threads — not replies. Copy title + body, go to the subreddit, and create a new post."
                  count={`${report.postIdeas.length}${report.totalPostIdeas > report.postIdeas.length ? ` of ${report.totalPostIdeas}` : ""} shown`}
                />
                <div className="space-y-4">
                  {report.postIdeas.map((idea, i) => (
                    <PostIdeaCard key={idea.title} idea={idea} index={i} isPro={reportIsFull} onUpgrade={openUpgrade} />
                  ))}
                </div>
                {!reportIsFull && hiddenPosts > 0 && (
                  <UpgradeStrip variant="growth-posts" hiddenCount={hiddenPosts} onUpgrade={openUpgrade} />
                )}
              </section>
            )}

            {resultsTab === "communities" && report.subreddits.length > 0 && (
              <section className="mb-8" role="tabpanel" aria-label="Communities">
                <SectionHeader
                  step={3}
                  title="Communities to watch"
                  description="Subreddits where your audience hangs out. Use these for both replying and creating new posts."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {report.subreddits.map((s) => (
                    <div
                      key={s.name}
                      className="rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/30 transition-colors"
                    >
                      <p className="font-mono text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.reason}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {status === "idle" && <GrowthIdleState onScan={beginScan} />}
      </main>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onSuccess={handlePayPalSuccess}
        error={upgradeError}
      />
    </div>
  );
}