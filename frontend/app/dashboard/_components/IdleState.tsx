"use client";

import { LiveActivity } from "../../_components/LiveActivity";

interface IdleStateProps {
  onScan: (query: string) => void;
  onSwitchRadar: () => void;
}

const QUICK_SCANS = [
  { label: "r/freelance", desc: "Freelancer pain points" },
  { label: "r/SaaS", desc: "SaaS founder struggles" },
  { label: "r/smallbusiness", desc: "Small biz problems" },
  { label: "productivity apps", desc: "Tool gaps & frustrations" },
  { label: "solo founder", desc: "Indie hacker needs" },
  { label: "r/webdev", desc: "Dev tool complaints" },
];

const EXAMPLE_THEMES = [
  { name: "Manual invoicing pain", demand: 94, verdict: "Strong signal" },
  { name: "Client no-show problem", demand: 78, verdict: "Strong signal" },
  { name: "Cash flow visibility", demand: 61, verdict: "Weak signal" },
];

export function IdleState({ onScan, onSwitchRadar }: IdleStateProps) {
  return (
    <div className="space-y-8 py-4">
      <LiveActivity variant="compact" />
      {/* Quick start */}
      <div>
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">Quick scan</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_SCANS.map((q) => (
            <button
              key={q.label}
              onClick={() => onScan(q.label)}
              className="text-left bg-[#0E1223] border border-[#1E293B] hover:border-[#6366F1]/60 rounded-lg px-4 py-3 transition-all group cursor-pointer"
            >
              <p className="font-mono text-sm text-[#F8FAFC] group-hover:text-[#818CF8] transition-colors">{q.label}</p>
              <p className="text-xs text-[#475569] mt-0.5">{q.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Example output */}
      <div>
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">Example output · r/smallbusiness</p>
        <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E293B]">
            <span className="text-xs font-mono text-[#475569]">Theme</span>
            <span className="text-xs font-mono text-[#475569]">Demand</span>
          </div>
          {EXAMPLE_THEMES.map((t, i) => (
            <div key={t.name} className={`flex items-center justify-between px-4 py-3 ${i < EXAMPLE_THEMES.length - 1 ? "border-b border-[#1E293B]" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-[#334155] shrink-0">#{i + 1}</span>
                <span className="text-sm text-[#CBD5E1] truncate">{t.name}</span>
                <span className={`hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  t.verdict === "Strong signal"
                    ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25"
                    : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                }`}>
                  {t.verdict}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <div className="w-20 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${t.demand}%`, opacity: 1 - i * 0.2 }} />
                </div>
                <span className="text-xs font-mono text-[#475569] w-6 text-right">{t.demand}</span>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 bg-[#080D1A] border-t border-[#1E293B]">
            <button
              onClick={() => onScan("r/smallbusiness")}
              className="text-xs font-mono text-[#6366F1] hover:text-[#818CF8] transition-colors cursor-pointer"
            >
              Run this scan live →
            </button>
          </div>
        </div>
      </div>

      {/* Trend Radar teaser */}
      <div
        onClick={onSwitchRadar}
        className="bg-[#0E1223] border border-[#1E293B] hover:border-[#22C55E]/50 rounded-lg px-5 py-4 flex items-center justify-between cursor-pointer transition-all group"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-xs font-mono text-[#22C55E] uppercase tracking-widest">Trend Radar</span>
          </div>
          <p className="text-sm text-[#CBD5E1]">Don&apos;t have a niche yet? Discover what&apos;s gaining momentum on Reddit right now.</p>
        </div>
        <svg className="w-4 h-4 text-[#334155] group-hover:text-[#22C55E] transition-colors shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

    </div>
  );
}
