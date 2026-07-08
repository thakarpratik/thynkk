"use client";

import { LiveActivity } from "../../_components/LiveActivity";

interface GrowthIdleStateProps {
  onScan: (url: string) => void;
}

const EXAMPLES = [
  { url: "https://monstareel.com", label: "Monstareel", desc: "AI reel tool" },
  { url: "https://linear.app", label: "Linear", desc: "Issue tracking" },
  { url: "https://cal.com", label: "Cal.com", desc: "Scheduling SaaS" },
];

const SAMPLE_THREADS = [
  { title: "What tool do you use for short-form launch videos?", score: 92, risk: "low" },
  { title: "How do I get my first 10 users without ads?", score: 88, risk: "low" },
  { title: "Best alternative to expensive video editors?", score: 81, risk: "medium" },
];

export function GrowthIdleState({ onScan }: GrowthIdleStateProps) {
  return (
    <div className="space-y-8 py-4">
      <LiveActivity variant="compact" />

      <div>
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">Try an example</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              onClick={() => onScan(ex.url)}
              className="text-left bg-[#0E1223] border border-[#1E293B] hover:border-[#6366F1]/60 rounded-lg px-4 py-3 transition-all group cursor-pointer"
            >
              <p className="font-mono text-sm text-[#F8FAFC] group-hover:text-[#818CF8]">{ex.label}</p>
              <p className="text-xs text-[#475569] mt-0.5">{ex.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">Example output</p>
        <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden">
          {SAMPLE_THREADS.map((t, i) => (
            <div
              key={t.title}
              className={`flex items-center justify-between px-4 py-3 ${i < SAMPLE_THREADS.length - 1 ? "border-b border-[#1E293B]" : ""}`}
            >
              <span className="text-sm text-[#CBD5E1] truncate pr-4">{t.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-[#6366F1]">{t.score}</span>
                <span className="text-[10px] font-mono text-[#22C55E]">{t.risk}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}