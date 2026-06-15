"use client";

import { useEffect } from "react";
import type { TrendItem } from "../_types";

interface TrendPanelProps {
  trend: TrendItem | null;
  rank: number;
  onClose: () => void;
}

const TAG_STYLES: Record<TrendItem["tag"], { pill: string; glow: string; label: string }> = {
  HOT:    { pill: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30", glow: "border-[#EF4444]/40", label: "Exploding right now" },
  RISING: { pill: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30", glow: "border-[#F59E0B]/40", label: "Gaining momentum" },
  NEW:    { pill: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30", glow: "border-[#22C55E]/40", label: "Just starting to emerge" },
};

export function TrendPanel({ trend, rank, onClose }: TrendPanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = trend ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [trend]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#020617]/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          trend ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={trend?.niche ?? "Trend detail"}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-[#0A0F1E] border-l border-[#1E293B] flex flex-col transition-transform duration-300 ease-out ${
          trend ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {trend && <PanelContent trend={trend} rank={rank} onClose={onClose} />}
      </aside>
    </>
  );
}

function PanelContent({ trend, rank, onClose }: { trend: TrendItem; rank: number; onClose: () => void }) {
  const tagStyle = TAG_STYLES[trend.tag] ?? TAG_STYLES.RISING;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#1E293B] shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-1">
            #{rank} · Trending Niche
          </p>
          <h2 className="font-mono font-bold text-base text-[#F8FAFC] leading-snug">
            {trend.niche}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
          aria-label="Close panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Score tiles */}
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Growth">
            <span className="font-mono text-xl font-bold text-[#22C55E]">{trend.growth}</span>
          </Tile>
          <Tile label="Signal">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${tagStyle.pill}`}>
              {trend.tag}
            </span>
          </Tile>
          <Tile label="Posts sampled">
            <span className="font-mono text-lg font-bold text-[#94A3B8]">{trend.posts}</span>
          </Tile>
        </div>

        {/* Momentum status */}
        <div className={`bg-[#0E1223] border rounded-md p-4 ${tagStyle.glow}`}>
          <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-1">Momentum</p>
          <p className="text-sm font-mono text-[#F8FAFC]">{tagStyle.label}</p>
        </div>

        {/* Description */}
        <Section label="What's driving this">
          <p className="text-sm text-[#CBD5E1] leading-relaxed">
            {trend.description || "No additional detail available for this niche."}
          </p>
        </Section>

        {/* Subreddit */}
        <Section label="Top community">
          <div className="flex items-center gap-3 bg-[#0E1223] border border-[#1E293B] rounded-md p-4">
            <div className="w-8 h-8 rounded-full bg-[#FF4500]/20 border border-[#FF4500]/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15" />
                <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.6-1.18zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.59 2.71a3.58 3.58 0 01-2.86.86 3.58 3.58 0 01-2.86-.86.23.23 0 01.33-.33 3.15 3.15 0 002.53.71 3.15 3.15 0 002.53-.71.23.23 0 01.33.33zm-.22-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-sm text-[#F8FAFC]">{trend.subreddit}</p>
              <p className="text-xs text-[#475569] mt-0.5">Highest signal community for this niche</p>
            </div>
          </div>
        </Section>

        {/* What to do */}
        <Section label="What to do with this">
          <div className="bg-[#22C55E]/8 border border-[#22C55E]/20 rounded-md p-4 space-y-2">
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Browse {trend.subreddit} and look for recurring complaints, tool requests, or workarounds people describe. Pain points inside a growing niche are double-signal.
            </p>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Run a Pain Point Scanner scan on <span className="font-mono text-[#22C55E]">{trend.subreddit.replace("r/", "")}</span> to surface specific problems people are willing to pay to solve.
            </p>
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t border-[#1E293B] flex items-center gap-3">
        <a
          href={`https://reddit.com/${trend.subreddit}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white py-2.5 rounded-md font-medium text-sm font-mono transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Browse {trend.subreddit}
        </a>
      </div>
    </>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-md p-3">
      <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-[#22C55E] uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  );
}
