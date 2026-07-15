import type { GrowthReport } from "../_types";

interface GrowthReportSummaryProps {
  report: GrowthReport;
  scannedUrl: string;
  scanTime: Date | null;
  isPro: boolean;
  onNewScan: () => void;
}

export function GrowthReportSummary({
  report,
  scannedUrl,
  scanTime,
  isPro,
  onNewScan,
}: GrowthReportSummaryProps) {
  const hiddenThreads = Math.max(0, report.totalThreads - report.threads.length);
  const hiddenPosts = Math.max(0, report.totalPostIdeas - report.postIdeas.length);

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Scan complete</p>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-foreground truncate">
            {report.productName}
          </h2>
          <p className="text-sm text-primary/90 font-mono mt-1">{report.nicheLabel}</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            {report.productSummary}
          </p>
          <p className="text-xs text-muted-foreground/80 font-mono mt-3 truncate">
            {scannedUrl}
            {report.fromCache ? " · cached" : ""}
            {scanTime ? ` · ${scanTime.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewScan}
          className="shrink-0 self-start text-xs font-mono px-4 py-2 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Scan another site
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="rounded-lg bg-sky-500/5 border border-sky-500/20 px-4 py-3 text-center">
          <p className="font-mono text-2xl font-bold text-foreground">{report.totalThreads}</p>
          <p className="text-xs text-sky-400/90 mt-0.5 font-medium">reply to threads</p>
          {!isPro && hiddenThreads > 0 && (
            <p className="text-[10px] text-primary mt-1">+{hiddenThreads} on Pro</p>
          )}
        </div>
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 text-center">
          <p className="font-mono text-2xl font-bold text-foreground">{report.totalPostIdeas}</p>
          <p className="text-xs text-emerald-400/90 mt-0.5 font-medium">create new posts</p>
          {!isPro && hiddenPosts > 0 && (
            <p className="text-[10px] text-primary mt-1">+{hiddenPosts} on Pro</p>
          )}
        </div>
        <div className="rounded-lg bg-background/60 border border-border px-4 py-3 text-center">
          <p className="font-mono text-2xl font-bold text-foreground">{report.subreddits.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">communities</p>
        </div>
      </div>
    </div>
  );
}