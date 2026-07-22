"use client";

import { useEffect, useState } from "react";

/** Staged research theater — ~15s total feel */
export const SCORE_MIN_MS = 15_000;

export const SCORE_STAGES = [
  { label: "Checking idea specificity", atMs: 0 },
  { label: "Scanning competitor landscape", atMs: 2_500 },
  { label: "Measuring product density", atMs: 5_000 },
  { label: "Mapping Reddit demand", atMs: 7_500 },
  { label: "Estimating search pressure", atMs: 10_000 },
  { label: "Building go / no-go decision", atMs: 12_500 },
] as const;

interface ScoringStateProps {
  /** 0-based active stage index */
  activeStage?: number;
  /** 0–100 progress */
  progressPct?: number;
}

export function ScoringState({ activeStage = 0, progressPct = 0 }: ScoringStateProps) {
  const pct = Math.min(100, Math.max(0, progressPct));

  return (
    <div className="mt-10 rounded-xl border border-[#1E293B] bg-[#0E1223] p-8">
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-[#22C55E] border-t-transparent animate-spin" />
        <p className="font-mono font-bold text-lg mb-1">Researching saturation…</p>
        <p className="text-sm text-[#94A3B8]">
          Deep check · about 15 seconds
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-mono text-[#64748B] mb-1.5">
          <span>Progress</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22C55E] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-3 text-left max-w-md mx-auto">
        {SCORE_STAGES.map((s, i) => {
          const done = i < activeStage;
          const current = i === activeStage;
          return (
            <li
              key={s.label}
              className={`flex items-center gap-3 text-sm font-mono transition-colors ${
                current
                  ? "text-[#F8FAFC]"
                  : done
                    ? "text-[#22C55E]"
                    : "text-[#475569]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] border ${
                  current
                    ? "border-[#22C55E] bg-[#22C55E]/15 text-[#22C55E]"
                    : done
                      ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
                      : "border-[#1E293B] text-[#475569]"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={current ? "font-medium" : ""}>
                {s.label}
                {current && (
                  <span className="text-[#22C55E] animate-pulse"> …</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Hook: advances stages over SCORE_MIN_MS while parent waits on the API. */
export function useScoringProgress(active: boolean) {
  const [activeStage, setActiveStage] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setActiveStage(0);
      setProgressPct(0);
      setElapsedMs(0);
      return;
    }

    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setElapsedMs(elapsed);
      setProgressPct(Math.min(96, (elapsed / SCORE_MIN_MS) * 100));

      let stage = 0;
      for (let i = 0; i < SCORE_STAGES.length; i++) {
        if (elapsed >= SCORE_STAGES[i].atMs) stage = i;
      }
      setActiveStage(stage);
    }, 200);

    return () => window.clearInterval(id);
  }, [active]);

  return { activeStage, progressPct, elapsedMs, minMs: SCORE_MIN_MS };
}
