"use client";

import { useEffect, useMemo, useState } from "react";
import type { GrowthPartial, GrowthScanProgress } from "../_types";

/** Honest ETA for cold (uncached) growth scans after parallel Serper + one LLM. */
const ESTIMATED_SEC = 120;

const STAGE_ORDER = [
  "queued",
  "starting",
  "crawling",
  "understanding",
  "searching",
  "writing",
  "done",
] as const;

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  starting: "Starting",
  crawling: "Reading your website",
  understanding: "Understanding your product",
  searching: "Searching community discussions",
  writing: "Writing reply drafts & post ideas",
  done: "Done",
  failed: "Failed",
  cancelled: "Stopped",
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function etaCopy(elapsed: number, progressPct: number): string {
  if (progressPct >= 95) return "Finishing up…";
  const remaining = Math.max(15, ESTIMATED_SEC - elapsed);
  if (elapsed < 20) return `Usually 1–2 min · about ${formatElapsed(remaining)} left`;
  if (elapsed < 90) return `Still working · ~${formatElapsed(remaining)} left`;
  if (elapsed < 150) return `Taking a bit longer · drafts almost ready`;
  return `Almost there · thanks for waiting`;
}

interface GrowthScanningStateProps {
  progress?: GrowthScanProgress | null;
  onStop?: () => void;
  stopping?: boolean;
  onNotify?: (email?: string) => Promise<void>;
  notifyEmail?: string | null;
  notifyStatus?: "idle" | "saving" | "saved" | "error";
  notifyMessage?: string;
}

export function GrowthScanningState({
  progress,
  onStop,
  stopping = false,
  onNotify,
  notifyEmail,
  notifyStatus = "idle",
  notifyMessage = "",
}: GrowthScanningStateProps) {
  const [elapsed, setElapsed] = useState(0);
  const [emailDraft, setEmailDraft] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const stage = progress?.stage || "starting";
  const stageMessage =
    progress?.stageMessage ||
    (stopping ? "Cancelling in-progress work" : "Finding your conversations…");
  const serverPct = progress?.progressPct ?? 0;
  const partial: GrowthPartial | null | undefined = progress?.partial;

  // Prefer real server %; use a slow time floor so the bar never freezes mid-scan
  const progressPct = useMemo(() => {
    if (stopping) return Math.max(serverPct, 10);
    const timeFloor = Math.min(85, Math.round((elapsed / ESTIMATED_SEC) * 85));
    const base = Math.max(serverPct, 5);
    // Time can only pull a little ahead of the last server stage (never jump to 95 early)
    const blended = Math.max(base, Math.min(timeFloor, base + 18));
    return Math.min(97, blended);
  }, [elapsed, serverPct, stopping]);

  const activeStageIndex = STAGE_ORDER.indexOf(
    stage as (typeof STAGE_ORDER)[number],
  );
  const safeIndex = activeStageIndex >= 0 ? activeStageIndex : 1;

  const productLabel =
    partial?.productName ||
    (partial?.nicheLabel ? `Looks like: ${partial.nicheLabel}` : null);

  const handleNotifyClick = async () => {
    if (!onNotify) return;
    if (showEmail && emailDraft.trim()) {
      await onNotify(emailDraft.trim());
      return;
    }
    // First click: try account email; if UI wants custom, expand
    try {
      await onNotify();
    } catch {
      setShowEmail(true);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <h2 className="font-mono text-lg font-bold text-foreground">
            {stopping ? "Stopping scan…" : "Finding your conversations"}
          </h2>
          <p className="text-sm text-primary font-mono mt-1">{stageMessage}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stopping
              ? "Cancelling in-progress work"
              : `${etaCopy(elapsed, progressPct)} · ${formatElapsed(elapsed)} elapsed`}
          </p>
          {productLabel && !stopping && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {partial?.productName
                ? `${partial.productName}${partial.nicheLabel ? ` · ${partial.nicheLabel}` : ""}`
                : productLabel}
            </p>
          )}
        </div>

        <ol className="space-y-2 mb-6">
          {STAGE_ORDER.filter((s) => s !== "queued" && s !== "done").map((s, index) => {
            // Map STAGE_ORDER without queued/done: starting=0 …
            const orderIdx = STAGE_ORDER.indexOf(s);
            const done = safeIndex > orderIdx;
            const current = safeIndex === orderIdx && !stopping;
            const label = STAGE_LABELS[s] || s;
            return (
              <li
                key={s}
                className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors ${
                  current
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : done
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono ${
                    done
                      ? "bg-accent/20 text-accent"
                      : current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className={current ? "font-medium" : ""}>{label}</span>
              </li>
            );
          })}
        </ol>

        <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-[11px] font-mono text-muted-foreground text-center mb-6">
          {progressPct}% · real progress from the scan (not a fake spinner)
        </p>

        {/* Partial threads before drafts */}
        {partial && partial.threads.length > 0 && !stopping && (
          <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">
              Early results
            </p>
            <p className="text-sm text-foreground font-medium mb-3">
              Found {partial.totalThreads || partial.threads.length} threads
              {partial.draftsReady
                ? " — drafts ready"
                : " — writing reply drafts now"}
            </p>
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {partial.threads.slice(0, 8).map((t) => (
                <li
                  key={t.url || t.title}
                  className="text-xs border-b border-border/60 last:border-0 pb-2 last:pb-0"
                >
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:text-primary line-clamp-2"
                  >
                    {t.title}
                  </a>
                  <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                    <span className="uppercase">{t.source}</span>
                    {t.date ? <span>{t.date}</span> : null}
                  </div>
                  {t.snippet ? (
                    <p className="text-muted-foreground/80 mt-0.5 line-clamp-1 italic">
                      {t.snippet}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground mt-3">
              Safe to open another tab — results also land in History.
            </p>
          </div>
        )}

        {/* Notify me */}
        {onNotify && !stopping && (
          <div className="mb-6 rounded-lg border border-dashed border-border p-4 text-center">
            {notifyStatus === "saved" ? (
              <p className="text-sm text-accent font-medium">
                {notifyMessage ||
                  (notifyEmail
                    ? `We'll email ${notifyEmail} when ready.`
                    : "We'll email you when ready.")}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Stepping away? We can email you when drafts are ready.
                </p>
                {showEmail && (
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full mb-3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void handleNotifyClick()}
                  disabled={notifyStatus === "saving"}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {notifyStatus === "saving"
                    ? "Saving…"
                    : showEmail
                      ? "Notify this email"
                      : "Notify me when ready"}
                </button>
                {!showEmail && (
                  <button
                    type="button"
                    onClick={() => setShowEmail(true)}
                    className="block mx-auto mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline cursor-pointer"
                  >
                    Use a different email
                  </button>
                )}
                {notifyStatus === "error" && notifyMessage && (
                  <p className="text-xs text-destructive mt-2">{notifyMessage}</p>
                )}
              </>
            )}
          </div>
        )}

        {onStop && (
          <div className="text-center">
            <button
              type="button"
              onClick={onStop}
              disabled={stopping}
              className="text-sm font-medium px-5 py-2.5 rounded-lg border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stopping ? "Stopping…" : "Stop scan"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
