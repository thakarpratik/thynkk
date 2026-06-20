"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Fetching posts from Reddit", at: 0 },
  { label: "Filtering pain signals", at: 20 },
  { label: "Clustering themes with AI", at: 45 },
  { label: "Scoring and ranking", at: 85 },
];

const ESTIMATED_SEC = 120;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ScanningState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const progress = Math.min(95, Math.round((elapsed / ESTIMATED_SEC) * 100));
  const activeStep = [...STEPS].reverse().find((s) => elapsed >= s.at) ?? STEPS[0];

  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
      <div className="flex flex-col items-center gap-5 max-w-md mx-auto">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        <div className="text-center w-full">
          <p className="font-mono text-sm text-[#F8FAFC] mb-1">Scanning Reddit…</p>
          <p className="text-xs text-[#6366F1] font-mono mb-1">{activeStep.label}</p>
          <p className="text-xs text-[#475569]">
            Usually takes ~2 min · elapsed {formatElapsed(elapsed)}
          </p>
        </div>

        <div className="w-full space-y-2">
          {STEPS.map((step) => {
            const done = elapsed >= step.at + 15 || step !== activeStep && elapsed >= step.at;
            const active = step.label === activeStep.label;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    done ? "bg-[#22C55E]" : active ? "bg-[#6366F1] animate-pulse" : "bg-[#334155]"
                  }`}
                />
                <span
                  className={`text-xs font-mono ${
                    active ? "text-[#F8FAFC]" : done ? "text-[#94A3B8]" : "text-[#475569]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-[#1A1E2F] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#6366F1] rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}