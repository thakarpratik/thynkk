"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Reading your website", at: 0 },
  { label: "Searching community discussions", at: 12 },
  { label: "Ranking the best threads to join", at: 35 },
  { label: "Writing reply drafts & post ideas", at: 55 },
];

const ESTIMATED_SEC = 90;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function GrowthScanningState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const progress = Math.min(95, Math.round((elapsed / ESTIMATED_SEC) * 100));
  const activeIndex = STEPS.findIndex((s, i) => {
    const next = STEPS[i + 1];
    return elapsed >= s.at && (!next || elapsed < next.at);
  });

  return (
    <section className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <h2 className="font-mono text-lg font-bold text-foreground">Finding your conversations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Usually takes about a minute · {formatElapsed(elapsed)} elapsed
          </p>
        </div>

        <ol className="space-y-3 mb-6">
          {STEPS.map((step, index) => {
            const done = index < activeIndex;
            const current = index === activeIndex;
            return (
              <li
                key={step.label}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${
                  current
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : done
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono ${
                    done
                      ? "bg-accent/20 text-accent"
                      : current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className={current ? "font-medium" : ""}>{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </section>
  );
}