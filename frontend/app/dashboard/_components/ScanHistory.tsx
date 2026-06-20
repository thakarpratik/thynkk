"use client";

import type { ScanHistoryEntry } from "../_lib/scan-history";

interface ScanHistoryProps {
  history: ScanHistoryEntry[];
  onRestore: (entry: ScanHistoryEntry) => void;
  onClear: () => void;
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

export function ScanHistory({ history, onRestore, onClear }: ScanHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest">Recent scans</p>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] font-mono text-[#475569] hover:text-[#94A3B8] transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onRestore(entry)}
            className="w-full text-left bg-[#0E1223] border border-[#1E293B] hover:border-[#6366F1]/50 rounded-lg px-4 py-3 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm text-[#F8FAFC] group-hover:text-[#818CF8] transition-colors truncate">
                  {entry.query}
                </p>
                <p className="text-xs text-[#475569] mt-0.5 truncate">
                  {entry.topTheme} · {entry.totalThemes} themes
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#475569] shrink-0">
                {formatWhen(entry.scannedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}