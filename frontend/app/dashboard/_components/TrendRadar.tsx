"use client";

import { useState } from "react";
import type { TrendItem, TrendRadarMeta } from "../_types";
import { UpgradeStrip } from "./UpgradeStrip";

interface TrendRadarProps {
  trends: TrendItem[];
  meta: TrendRadarMeta;
  isPro: boolean;
  lockedCount: number;
}

type TrendSort = "growth" | "posts";

const TAG_STYLES: Record<TrendItem["tag"], string> = {
  HOT:    "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
  RISING: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  NEW:    "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
};

const BLURRED: React.CSSProperties = {
  filter: "blur(5px)",
  userSelect: "none",
  pointerEvents: "none",
};

function formatAsOf(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "yesterday";
  if (diffD < 7) return `${diffD} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TrendRow({ trend, index, shallow, isPro }: {
  trend: TrendItem;
  index: number;
  shallow: boolean;
  isPro: boolean;
}) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] hover:border-[#22C55E]/50 rounded-lg p-5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#94A3B8]">#{index + 1}</span>
          <div>
            <h3 className={`font-mono font-semibold text-sm ${shallow ? "text-[#94A3B8]" : "text-[#F8FAFC]"}`}>
              {trend.niche}
            </h3>
            {!shallow && (
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {trend.subreddit} · {trend.posts.toLocaleString()} posts
              </p>
            )}
            {shallow && (
              <p className="text-xs text-[#475569] mt-0.5 font-mono">Growth and signal locked</p>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-3"
          style={!isPro ? BLURRED : undefined}
        >
          <span className="font-mono text-lg font-bold text-[#22C55E]">{trend.growth}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${TAG_STYLES[trend.tag]}`}>
            {trend.tag}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TrendRadar({ trends, meta, isPro, lockedCount }: TrendRadarProps) {
  const [sort, setSort] = useState<TrendSort>("growth");

  const sorted = [...trends].sort((a, b) =>
    sort === "growth" ? b.growthPct - a.growthPct : b.posts - a.posts
  );

  const asOfLabel = formatAsOf(meta.asOf);
  const isStale = Date.now() - meta.asOf.getTime() > 86400000 * 2;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h2 className="font-mono font-bold text-lg">Trend Radar</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Niches gaining momentum on Reddit · {meta.windowDays}-day window
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-mono shrink-0 ${isStale ? "text-[#F59E0B]" : "text-[#22C55E]"}`}>
          {isStale ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          )}
          <span>Data as of {asOfLabel}</span>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">Sort:</span>
        {(["growth", "posts"] as TrendSort[]).map((opt) => (
          <button
            key={opt}
            onClick={() => setSort(opt)}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer capitalize ${
              sort === opt
                ? "border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                : "border-[#1E293B] text-[#475569] hover:border-[#334155] hover:text-[#94A3B8]"
            }`}
          >
            {opt === "growth" ? "Growth %" : "Post volume"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((trend, i) => (
          <TrendRow
            key={trend.niche}
            trend={trend}
            index={i}
            isPro={isPro}
            shallow={!isPro && i >= 3}
          />
        ))}
      </div>

      {!isPro && lockedCount > 0 && (
        <UpgradeStrip lockedCount={lockedCount} noun="trending niches" />
      )}
    </div>
  );
}
