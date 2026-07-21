"use client";

export interface GrowthScanHistoryEntry {
  scanId: string;
  url: string;
  productName: string;
  tier: "free" | "full";
  totalThreads: number;
  fromCache: boolean;
  scannedAt: string;
}

interface GrowthScanHistoryProps {
  history: GrowthScanHistoryEntry[];
  onRestore: (entry: GrowthScanHistoryEntry) => void;
  loading?: boolean;
}

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function displayUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function GrowthScanHistory({ history, onRestore, loading }: GrowthScanHistoryProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 px-5 py-4">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Previous scans
        </p>
        <p className="text-sm text-muted-foreground mt-2">Loading your scan history…</p>
      </div>
    );
  }

  if (history.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Previous scans
      </p>
      <div className="space-y-2">
        {history.map((entry) => (
          <button
            key={entry.scanId}
            type="button"
            onClick={() => onRestore(entry)}
            className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-4 py-3.5 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {entry.productName || displayUrl(entry.url)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {displayUrl(entry.url)}
                  {" · "}
                  {entry.totalThreads} thread{entry.totalThreads === 1 ? "" : "s"}
                  {entry.tier === "free" ? " · Free full scan" : ""}
                </p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {formatWhen(entry.scannedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}