"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { GrowthReport, ScanStatus } from "./_types";
import {
  submitGrowthScan,
  pollGrowthStatus,
  fetchGrowthReport,
  fetchQuota,
  fetchBillingStatus,
  activatePayPalSubscription,
} from "./_lib/api";
import { DashboardNav } from "./_components/DashboardNav";
import { GrowthScanInput } from "./_components/GrowthScanInput";
import { GrowthScanningState } from "./_components/GrowthScanningState";
import { GrowthIdleState } from "./_components/GrowthIdleState";
import { ErrorState } from "./_components/ErrorState";
import { ThreadCard } from "./_components/ThreadCard";
import { PostIdeaCard } from "./_components/PostIdeaCard";
import { UpgradeStrip } from "./_components/UpgradeStrip";
import { UpgradeModal } from "./_components/UpgradeModal";

const POLL_INTERVAL_MS = 3000;

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedUrl, setScannedUrl] = useState("");
  const [report, setReport] = useState<(GrowthReport & { scanId: string; url: string }) | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scanTime, setScanTime] = useState<Date | null>(null);
  const [quota, setQuota] = useState<Awaited<ReturnType<typeof fetchQuota>> | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScanStarted = useRef(false);

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
    if (isSignedIn) refreshAccount();
  }, [isSignedIn, refreshAccount]);

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
        } else if (s.status === "failed") {
          setErrorMessage(s.error ?? "Scan failed. Try a different URL.");
          setStatus("error");
        } else {
          poll(scanId);
        }
      } catch {
        setErrorMessage("Connection lost. Check your network and try again.");
        setStatus("error");
      }
    }, POLL_INTERVAL_MS);
  }, [getToken, refreshAccount]);

  const beginScan = (targetUrl: string) => {
    setUrl(targetUrl);
    setStatus("loading");
    setScannedUrl(targetUrl);
    setReport(null);
    setScanTime(null);
    setErrorMessage("");
    stopPolling();
    submitGrowthScan(targetUrl, getToken).then(poll).catch((e: unknown) => {
      if (e instanceof Error) {
        if (e.message === "quota_exceeded") {
          refreshAccount();
          setErrorMessage("Scan limit reached. Upgrade to Pro for 50 scans/month.");
        } else if (e.message === "ip_quota_exceeded") {
          refreshAccount();
          setErrorMessage("Free scan limit reached for this network.");
        } else if (e.message === "email_not_verified") {
          setErrorMessage("Please verify your email before scanning.");
        } else {
          setErrorMessage("Could not start scan. Please try again.");
        }
      } else {
        setErrorMessage("Could not start scan. Please try again.");
      }
      setStatus("error");
    });
  };

  const handleScan = () => {
    if (!url.trim()) return;
    beginScan(url.trim());
  };

  useEffect(() => {
    const param = searchParams.get("url");
    if (!param || !isSignedIn || autoScanStarted.current || status !== "idle") return;
    autoScanStarted.current = true;
    beginScan(param);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when landing with ?url=
  }, [isSignedIn, searchParams, status]);

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

  const hiddenThreads = !isPro && report ? Math.max(0, report.totalThreads - report.threads.length) : 0;
  const hiddenPosts = !isPro && report ? Math.max(0, report.totalPostIdeas - report.postIdeas.length) : 0;

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <DashboardNav isPro={isPro} quota={quota} onUpgrade={openUpgrade} />

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <div className="mb-6">
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-1">Growth engine</p>
          <h1 className="font-mono text-xl font-bold">Find conversations. Draft your replies.</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Paste your site — Thynkk finds discussions worth joining.</p>
        </div>

        <GrowthScanInput
          url={url}
          status={status}
          quota={quota}
          onChange={setUrl}
          onScan={handleScan}
          onUpgrade={openUpgrade}
        />

        {status === "loading" && <GrowthScanningState />}

        {status === "error" && (
          <ErrorState message={errorMessage} onRetry={() => { setStatus("idle"); setErrorMessage(""); }} />
        )}

        {status === "done" && report && (
          <div className="space-y-8">
            <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5">
              <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-2">Product context</p>
              <h2 className="font-mono text-lg font-bold text-[#F8FAFC]">{report.productName}</h2>
              <p className="text-sm text-[#6366F1] font-mono mt-1">{report.nicheLabel}</p>
              <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">{report.productSummary}</p>
              <p className="text-xs text-[#475569] mt-2 font-mono">
                {scannedUrl}
                {report.fromCache ? " · cached" : ""}
                {scanTime ? ` · ${scanTime.toLocaleTimeString()}` : ""}
              </p>
            </div>

            {report.subreddits.length > 0 && (
              <div>
                <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">Communities to watch</p>
                <div className="flex flex-wrap gap-2">
                  {report.subreddits.map((s) => (
                    <span key={s.name} className="text-xs font-mono px-3 py-1.5 rounded-full border border-[#1E293B] bg-[#0E1223] text-[#94A3B8]" title={s.reason}>
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">
                Threads to answer ({report.threads.length}{report.totalThreads > report.threads.length ? ` of ${report.totalThreads}` : ""})
              </p>
              <div className="space-y-4">
                {report.threads.map((thread, i) => (
                  <ThreadCard key={thread.url} thread={thread} index={i} isPro={isPro} onUpgrade={openUpgrade} />
                ))}
              </div>
              {!isPro && hiddenThreads > 0 && (
                <UpgradeStrip variant="growth" hiddenCount={hiddenThreads} onUpgrade={openUpgrade} />
              )}
            </div>

            <div>
              <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">
                Posts to create ({report.postIdeas.length}{report.totalPostIdeas > report.postIdeas.length ? ` of ${report.totalPostIdeas}` : ""})
              </p>
              <div className="space-y-4">
                {report.postIdeas.map((idea, i) => (
                  <PostIdeaCard key={idea.title} idea={idea} index={i} isPro={isPro} onUpgrade={openUpgrade} />
                ))}
              </div>
              {!isPro && hiddenPosts > 0 && (
                <UpgradeStrip variant="growth-posts" hiddenCount={hiddenPosts} onUpgrade={openUpgrade} />
              )}
            </div>
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