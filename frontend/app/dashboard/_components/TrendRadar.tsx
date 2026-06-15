"use client";

import { useState } from "react";
import type { TrendItem, TrendRadarMeta } from "../_types";
import { UpgradeStrip } from "./UpgradeStrip";
import { TrendPanel } from "./TrendPanel";

type RadarStatus = "idle" | "loading" | "done" | "error" | "scanning";

interface TrendRadarProps {
  trends: TrendItem[];
  meta: TrendRadarMeta | null;
  radarStatus: RadarStatus;
  radarError: string;
  isPro: boolean;
  lockedCount: number;
  onRefresh: () => void;
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

function TrendRow({ trend, index, shallow, isPro, onClick }: {
  trend: TrendItem;
  index: number;
  shallow: boolean;
  isPro: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="bg-[#0E1223] border border-[#1E293B] hover:border-[#22C55E]/50 rounded-lg p-5 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="font-mono text-xs text-[#94A3B8] pt-0.5 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <h3 className={`font-mono font-semibold text-sm ${shallow ? "text-[#94A3B8]" : "text-[#F8FAFC]"}`}>
              {trend.niche}
            </h3>
            {!shallow && (
              <>
                <p className="text-xs text-[#94A3B8] mt-0.5">{trend.subreddit} · {trend.posts.toLocaleString()} posts</p>
                {trend.description && (
                  <p className="text-xs text-[#475569] mt-1 leading-relaxed">{trend.description}</p>
                )}
              </>
            )}
            {shallow && (
              <p className="text-xs text-[#475569] mt-0.5 font-mono">Growth and signal locked</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-3"
            style={!isPro ? BLURRED : undefined}
          >
            <span className="font-mono text-lg font-bold text-[#22C55E]">{trend.growth}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${TAG_STYLES[trend.tag]}`}>
              {trend.tag}
            </span>
          </div>
          <svg className="w-3.5 h-3.5 text-[#334155] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-3 bg-[#1E293B] rounded" />
              <div>
                <div className="w-40 h-3.5 bg-[#1E293B] rounded mb-2" />
                <div className="w-24 h-2.5 bg-[#1E293B] rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-5 bg-[#1E293B] rounded" />
              <div className="w-12 h-4 bg-[#1E293B] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendRadar({ trends, meta, radarStatus, radarError, isPro, lockedCount, onRefresh }: TrendRadarProps) {
  const [sort, setSort] = useState<TrendSort>("growth");
  const [activeTrend, setActiveTrend] = useState<{ trend: TrendItem; index: number } | null>(null);

  const sorted = [...trends].sort((a, b) =>
    sort === "growth" ? b.growthPct - a.growthPct : b.posts - a.posts
  );

  const isLoading = radarStatus === "loading" || radarStatus === "scanning";
  const isStale = meta ? Date.now() - meta.asOf.getTime() > 86400000 * 2 : false;
  const asOfLabel = meta ? formatAsOf(meta.asOf) : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h2 className="font-mono font-bold text-lg">Trend Radar</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Niches gaining momentum on Reddit{meta ? ` · ${meta.windowDays}-day window` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {asOfLabel && (
            <span className={`flex items-center gap-1.5 text-xs font-mono ${isStale ? "text-[#F59E0B]" : "text-[#22C55E]"}`}>
              {isStale ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              )}
              {asOfLabel}
            </span>
          )}
          {isLoading ? (
            <span className="text-xs font-mono text-[#475569] animate-pulse">scanning…</span>
          ) : (
            <button
              onClick={onRefresh}
              className="text-xs font-mono text-[#475569] hover:text-[#94A3B8] border border-[#1E293B] hover:border-[#334155] px-2.5 py-1 rounded-md transition-all cursor-pointer"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {radarStatus === "error" && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-[#EF4444] font-mono">{radarError || "Failed to load trends."}</p>
          <button onClick={onRefresh} className="text-xs text-[#EF4444] underline mt-1 cursor-pointer">Retry</button>
        </div>
      )}

      {radarStatus === "scanning" && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-[#F59E0B] font-mono">Trend scan in progress — check back in ~60 seconds.</p>
        </div>
      )}

      {/* Sort controls — only when we have data */}
      {radarStatus === "done" && trends.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">Sort:</span>
          {(["growth", "posts"] as TrendSort[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                sort === opt
                  ? "border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                  : "border-[#1E293B] text-[#475569] hover:border-[#334155] hover:text-[#94A3B8]"
              }`}
            >
              {opt === "growth" ? "Growth %" : "Post volume"}
            </button>
          ))}
        </div>
      )}

      {isLoading && <LoadingState />}

      {radarStatus === "done" && (
        <>
          <div className="space-y-3">
            {sorted.map((trend, i) => (
              <TrendRow
                key={trend.niche}
                trend={trend}
                index={i}
                isPro={isPro}
                shallow={!isPro && i >= 3}
                onClick={() => setActiveTrend({ trend, index: i })}
              />
            ))}
          </div>
          {!isPro && lockedCount > 0 && (
            <UpgradeStrip lockedCount={lockedCount} noun="trending niches" />
          )}
        </>
      )}

      <TrendPanel
        trend={activeTrend?.trend ?? null}
        rank={(activeTrend?.index ?? 0) + 1}
        onClose={() => setActiveTrend(null)}
      />
    </div>
  );
}
