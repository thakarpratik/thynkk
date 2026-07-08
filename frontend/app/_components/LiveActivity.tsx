"use client";

import { useEffect, useState } from "react";

type Activity =
  | { kind: "scanning"; name: string; site: string }
  | { kind: "found"; name: string; site: string; threads: number }
  | { kind: "drafted"; name: string; site: string };

const ACTIVITIES: Activity[] = [
  { kind: "scanning", name: "Priya", site: "monstareel.com" },
  { kind: "found", name: "Marcus", site: "cal.com", threads: 8 },
  { kind: "scanning", name: "Tom", site: "indie-saas.io" },
  { kind: "drafted", name: "Aisha", site: "horoscope.app" },
  { kind: "found", name: "Daniel", site: "notion-alternative.dev", threads: 6 },
  { kind: "scanning", name: "Lin", site: "shipfast.co" },
  { kind: "drafted", name: "James", site: "reelstudio.ai" },
  { kind: "found", name: "Sofia", site: "budgettracker.app", threads: 9 },
];

function formatActivity(a: Activity): string {
  switch (a.kind) {
    case "scanning":
      return `${a.name} is scanning ${a.site}…`;
    case "found":
      return `${a.name} found ${a.threads} threads for ${a.site}`;
    case "drafted":
      return `${a.name} got reply drafts for ${a.site}`;
  }
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface LiveActivityProps {
  variant?: "hero" | "compact";
}

export function LiveActivity({ variant = "hero" }: LiveActivityProps) {
  const [scanCount, setScanCount] = useState(14);
  const [activityIndex, setActivityIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setScanCount(randomBetween(11, 19));
    const tick = setInterval(() => {
      setScanCount((c) => Math.min(31, Math.max(6, c + randomBetween(-2, 3))));
    }, 12000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const rotate = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActivityIndex((i) => (i + 1) % ACTIVITIES.length);
        setVisible(true);
      }, 280);
    }, 4500);
    return () => clearInterval(rotate);
  }, []);

  const message = formatActivity(ACTIVITIES[activityIndex]);

  if (variant === "compact") {
    return (
      <div className="w-full bg-[#0E1223] border border-[#1E293B] rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
          <p className="text-xs font-mono text-[#94A3B8]">
            <span className="text-[#F8FAFC] font-semibold">{scanCount}</span> founders finding conversations right now
          </p>
        </div>
        <p className={`text-xs text-[#475569] font-mono truncate transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 mb-8">
      <div className="inline-flex items-center gap-2 bg-[#1A1E2F] border border-[#1E293B] rounded-full px-4 py-1.5 text-sm text-[#94A3B8]">
        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
        <span>
          <span className="text-[#F8FAFC] font-mono font-semibold tabular-nums">{scanCount}</span>
          {" "}founders finding conversations right now
        </span>
      </div>
      <p className={`text-sm text-[#475569] font-mono transition-opacity duration-300 min-h-[1.25rem] ${visible ? "opacity-100" : "opacity-0"}`}>
        {message}
      </p>
    </div>
  );
}