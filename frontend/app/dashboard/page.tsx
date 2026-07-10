"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { GrowthReport, ScanStatus } from "./_types";
import {
  submitGrowthScan,
  pollGrowthStatus,
  fetchGrowthReport,
  fetchGrowthScanHistory,
  fetchQuota,
  fetchBillingStatus,
  capturePayPalOrder,
} from "./_lib/api";
import { PACK_SCANS } from "../_lib/pricing";
import { DashboardNav } from "./_components/DashboardNav";
import { DashboardStepper } from "./_components/DashboardStepper";
import { GrowthScanInput } from "./_components/GrowthScanInput";
import { GrowthScanningState } from "./_components/GrowthScanningState";
import { GrowthIdleState } from "./_components/GrowthIdleState";
import { GrowthReportSummary } from "./_components/GrowthReportSummary";
import { ResultsQuickNav } from "./_components/ResultsQuickNav";
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

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScanStarted = useRef(false);

  const reportIsFull = report?.reportTier === "full";

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

  const poll = useCallback((scanId: string) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const s = await pollGrowthStatus(scanId);
        if (s.status === "done") {
          const data = await fetchGrowthReport(scanId, getToken);
          setReport(data);
          setScanTime(new Date());
          setStatus("done");
          refreshAccount();
          refreshHistory();
        } else if (s.status === "failed") {
          setErrorMessage(s.error ?? "Scan failed. Try a different URL.");
          setStatus("error");
          refreshAccount();
        } else {
          poll(scanId);
        }
      } catch (e: unknown) {
        setErrorMessage(formatScanError(e));
        setStatus("error");
      }
    }, POLL_INTERVAL_MS);
  }, [getToken, refreshAccount, refreshHistory]);

  const beginScan = async (targetUrl: string) => {
    if (!isLoaded) return;

    setUrl(targetUrl);
    setScannedUrl(targetUrl);
    setReport(null);
    setScanTime(null);
    setErrorMessage("");
    stopPolling();

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
    submitGrowthScan(targetUrl, getToken).then(poll).catch((e: unknown) => {
      setErrorMessage(formatScanError(e));
      setStatus("error");
    });
  };

  const handleScan = () => {
    if (!url.trim()) return;
    beginScan(url.trim());
  };

  const handleRestoreScan = async (entry: GrowthScanHistoryEntry) => {
    stopPolling();
    setErrorMessage("");
    setScannedUrl(entry.url);
    setUrl(entry.url);
    setStatus("loading");

    try {
      const data = await fetchGrowthReport(entry.scanId, getToken);
      setReport(data);
      setScanTime(new Date(entry.scannedAt));
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      setErrorMessage(formatScanError(e));
      setStatus("error");
    }
  };

  const handleNewScan = () => {
    setStatus("idle");
    setReport(null);
    setErrorMessage("");
    setScanTime(null);
    stopPolling();
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

        {status === "loading" && <GrowthScanningState />}

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
              threadCount={report.threads.length}
              postCount={report.postIdeas.length}
              communityCount={report.subreddits.length}
            />

            <section className="mb-12">
              <SectionHeader
                step={1}
                title="Join these conversations"
                description="Open a thread, read the discussion, then paste your reply draft. Start with low promo-risk threads."
                count={`${report.threads.length}${report.totalThreads > report.threads.length ? ` of ${report.totalThreads}` : ""} shown`}
              />
              <div className="space-y-4">
                {report.threads.map((thread, i) => (
                  <ThreadCard key={thread.url} thread={thread} index={i} isPro={reportIsFull} onUpgrade={openUpgrade} />
                ))}
              </div>
              {!reportIsFull && hiddenThreads > 0 && (
                <UpgradeStrip variant="growth" hiddenCount={hiddenThreads} onUpgrade={openUpgrade} />
              )}
            </section>

            <section className="mb-12">
              <SectionHeader
                step={2}
                title="Create these posts"
                description="When replying isn't enough, use these post ideas to start new discussions in the right communities."
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

            {report.subreddits.length > 0 && (
              <section className="mb-8">
                <SectionHeader
                  step={3}
                  title="Communities to watch"
                  description="Subreddits and forums where your audience hangs out. Bookmark these for ongoing engagement."
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