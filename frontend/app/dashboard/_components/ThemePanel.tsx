"use client";

import { useEffect } from "react";
import type { Theme } from "../_types";
import { SeverityBar } from "./SeverityBar";
import { DemandBadge } from "./DemandBadge";

interface ThemePanelProps {
  theme: Theme | null;
  rank: number;
  isPro: boolean;
  onClose: () => void;
}

const BLURRED: React.CSSProperties = {
  filter: "blur(5px)",
  userSelect: "none",
  pointerEvents: "none",
};

const VERDICT_STYLES: Record<string, string> = {
  "Strong signal": "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
  "Weak signal":   "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  "Already crowded": "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
};

const WTP_STYLES: Record<string, string> = {
  High:    "text-[#22C55E]",
  Medium:  "text-[#F59E0B]",
  Low:     "text-[#EF4444]",
  Unknown: "text-[#94A3B8]",
};

export function ThemePanel({ theme, rank, isPro, onClose }: ThemePanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = theme ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [theme]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#020617]/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          theme ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={theme?.name ?? "Theme detail"}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-[#0A0F1E] border-l border-[#1E293B] flex flex-col transition-transform duration-300 ease-out ${
          theme ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {theme && <PanelContent theme={theme} rank={rank} isPro={isPro} onClose={onClose} />}
      </aside>
    </>
  );
}

function PanelContent({ theme, rank, isPro, onClose }: { theme: Theme; rank: number; isPro: boolean; onClose: () => void }) {
  const verdictStyle = VERDICT_STYLES[theme.verdict] ?? "bg-[#1E293B] text-[#94A3B8] border-[#1E293B]";
  const wtpStyle = WTP_STYLES[theme.willingnessToPay] ?? WTP_STYLES.Unknown;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#1E293B] shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-1">
            #{rank} · Pain Point Theme
          </p>
          <h2 className="font-mono font-bold text-base text-[#F8FAFC] leading-snug">
            {theme.name}
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Score tiles */}
        <div className="grid grid-cols-3 gap-3">
          <ScoreTile label="Demand" blurred={false}>
            <DemandBadge score={theme.demand} />
          </ScoreTile>
          <ScoreTile label="Severity" blurred={false}>
            <SeverityBar score={theme.severity} />
          </ScoreTile>
          <ScoreTile label="Mentions" blurred={false}>
            <span className="font-mono text-lg font-bold text-[#94A3B8]">{theme.mentions}</span>
          </ScoreTile>
        </div>

        {/* Verdict + WTP row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-md p-3">
            <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Verdict</p>
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${verdictStyle}`}>
              {theme.verdict}
            </span>
          </div>
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-md p-3">
            <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Willingness to pay</p>
            <p className={`font-mono text-sm font-semibold ${wtpStyle}`}>{theme.willingnessToPay}</p>
            {theme.willingnessReason && (
              <p className="text-[10px] text-[#475569] mt-1 leading-relaxed">{theme.willingnessReason}</p>
            )}
          </div>
        </div>

        <Section label="Summary">
          <p className="text-sm text-[#CBD5E1] leading-relaxed">{theme.summary}</p>
        </Section>

        <Section label="Opportunity">
          <div className="bg-[#6366F1]/10 border border-[#6366F1]/25 rounded-md p-4">
            <p className="text-sm text-[#CBD5E1] leading-relaxed">{theme.opportunity}</p>
          </div>
        </Section>

        {/* Competition */}
        {theme.competition && (
          <Section label="Competition">
            <p className="text-sm text-[#94A3B8] leading-relaxed">{theme.competition}</p>
          </Section>
        )}

        {/* Next step */}
        {theme.nextStep && (
          <Section label="Next step this week">
            <div className="bg-[#22C55E]/8 border border-[#22C55E]/20 rounded-md p-4">
              <p className="text-sm text-[#CBD5E1] leading-relaxed">{theme.nextStep}</p>
            </div>
          </Section>
        )}

        {/* Quotes */}
        <Section label={`${theme.quotes.length} ${theme.quotes.length === 1 ? "Quote" : "Quotes"} from Reddit`}>
          <div className="space-y-3">
            {theme.quotes.map((q, i) => (
              <div key={i} className="bg-[#0E1223] rounded-md p-4 border border-[#1E293B]">
                <p className="text-sm text-[#94A3B8] italic leading-relaxed mb-3">
                  &ldquo;{q.text}&rdquo;
                </p>
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#6366F1] hover:text-[#818CF8] transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Reddit
                </a>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t border-[#1E293B] flex items-center gap-3">
        <button className="flex-1 bg-[#6366F1] hover:bg-[#4F46E5] text-white py-2.5 rounded-md font-medium text-sm font-mono transition-colors cursor-pointer">
          Scan this theme deeper
        </button>
        <button className="px-4 py-2.5 border border-[#1E293B] hover:border-[#6366F1]/50 text-[#94A3B8] hover:text-[#F8FAFC] rounded-md text-sm font-mono transition-all cursor-pointer">
          Save
        </button>
        <button className="px-4 py-2.5 border border-[#1E293B] hover:border-[#6366F1]/50 text-[#94A3B8] hover:text-[#F8FAFC] rounded-md text-sm font-mono transition-all cursor-pointer">
          Share
        </button>
      </div>
    </>
  );
}

function ScoreTile({ label, blurred, children }: { label: string; blurred: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-md p-3">
      <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5">{label}</p>
      <div style={blurred ? BLURRED : undefined}>{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  );
}
