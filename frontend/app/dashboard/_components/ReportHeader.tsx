"use client";

import Link from "next/link";

export type SortKey = "demand" | "severity" | "mentions";
export type FilterVerdict = "all" | "Strong signal" | "Weak signal" | "Already crowded";

interface ReportHeaderProps {
  query: string;
  totalCount: number;
  isPro: boolean;
  freeLimit: number;
  fromCache?: boolean;
  scanTime?: Date | null;
  sort: SortKey;
  filter: FilterVerdict;
  onSortChange: (s: SortKey) => void;
  onFilterChange: (f: FilterVerdict) => void;
}

function formatScanTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return date.toLocaleDateString();
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "demand", label: "Demand" },
  { value: "severity", label: "Severity" },
  { value: "mentions", label: "Mentions" },
];

const FILTER_OPTIONS: { value: FilterVerdict; label: string }[] = [
  { value: "all", label: "All signals" },
  { value: "Strong signal", label: "Strong signal" },
  { value: "Weak signal", label: "Weak signal" },
  { value: "Already crowded", label: "Crowded" },
];

const VERDICT_DOT: Record<string, string> = {
  "Strong signal": "bg-[#22C55E]",
  "Weak signal": "bg-[#F59E0B]",
  "Already crowded": "bg-[#EF4444]",
};

export function ReportHeader({
  query, totalCount, isPro, freeLimit, fromCache, scanTime,
  sort, filter, onSortChange, onFilterChange,
}: ReportHeaderProps) {
  return (
    <div className="mb-5 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono font-bold text-lg">
            Pain Point Report
            <span className="text-[#94A3B8] font-normal text-sm ml-2">· {query}</span>
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{totalCount} themes found · {isPro ? "Full report" : `Showing top ${freeLimit} free`}</span>
            {fromCache && (
              <span className="inline-flex items-center gap-1 text-[#22C55E] font-mono">
                <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
                cached
              </span>
            )}
            {scanTime && (
              <span className="inline-flex items-center gap-1 text-[#475569] font-mono">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatScanTime(scanTime)}
              </span>
            )}
          </p>
        </div>
        {isPro && (
          <button className="shrink-0 text-xs border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-white px-3 py-1.5 rounded-md font-mono transition-all cursor-pointer">
            Export CSV
          </button>
        )}
      </div>

      {/* Sort + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/methodology"
          target="_blank"
          className="text-[10px] font-mono text-[#475569] hover:text-[#6366F1] transition-colors"
        >
          How demand is ranked ↗
        </Link>
        <span className="text-[#1E293B] mx-1">|</span>
        <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              sort === opt.value
                ? "border-[#6366F1] text-[#818CF8] bg-[#6366F1]/10"
                : "border-[#1E293B] text-[#475569] hover:border-[#334155] hover:text-[#94A3B8]"
            }`}
          >
            {opt.label}
          </button>
        ))}

        <span className="text-[#1E293B] mx-1">|</span>

        <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">Filter:</span>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              filter === opt.value
                ? "border-[#6366F1] text-[#818CF8] bg-[#6366F1]/10"
                : "border-[#1E293B] text-[#475569] hover:border-[#334155] hover:text-[#94A3B8]"
            }`}
          >
            {opt.value !== "all" && (
              <span className={`w-1.5 h-1.5 rounded-full ${VERDICT_DOT[opt.value]}`} />
            )}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
