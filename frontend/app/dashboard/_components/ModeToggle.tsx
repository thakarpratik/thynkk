"use client";

import type { Mode } from "../_types";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const MODES: {
  value: Mode;
  label: string;
  desc: string;
  badge: string;
  activeColor: string;
  dotColor: string;
}[] = [
  {
    value: "scanner",
    label: "Pain Point Scanner",
    desc: "Surface what people struggle with in any niche",
    badge: "1 free scan",
    activeColor: "border-[#6366F1] bg-[#6366F1]/5",
    dotColor: "bg-[#6366F1]",
  },
  {
    value: "radar",
    label: "Trend Radar",
    desc: "Discover niches gaining momentum on Reddit now",
    badge: "Free preview",
    activeColor: "border-[#22C55E] bg-[#22C55E]/5",
    dotColor: "bg-[#22C55E]",
  },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {MODES.map(({ value, label, desc, badge, activeColor, dotColor }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`text-left rounded-lg border px-5 py-4 transition-all cursor-pointer ${
              active
                ? activeColor
                : "border-[#1E293B] bg-[#0E1223] hover:border-[#334155]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? dotColor : "bg-[#334155]"}`} />
                <span className={`font-mono font-semibold text-sm ${active ? "text-[#F8FAFC]" : "text-[#94A3B8]"}`}>
                  {label}
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                active
                  ? value === "scanner"
                    ? "bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30"
                    : "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30"
                  : "bg-[#1E293B] text-[#475569] border-[#1E293B]"
              }`}>
                {badge}
              </span>
            </div>
            <p className={`text-xs leading-relaxed ml-3.5 ${active ? "text-[#94A3B8]" : "text-[#475569]"}`}>
              {desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
