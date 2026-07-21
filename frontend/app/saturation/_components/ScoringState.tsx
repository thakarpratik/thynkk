"use client";

const STAGES = [
  "Validating specificity…",
  "Scanning competitors…",
  "Checking Reddit density…",
  "Building go / no-go…",
];

export function ScoringState() {
  return (
    <div className="mt-10 rounded-xl border border-[#1E293B] bg-[#0E1223] p-8 text-center">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-[#22C55E] border-t-transparent animate-spin" />
      <p className="font-mono font-bold text-lg mb-2">Calculating saturation…</p>
      <p className="text-sm text-[#94A3B8] mb-6">Usually 5–15 seconds with live search.</p>
      <ul className="space-y-2 text-left max-w-sm mx-auto">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <span className="text-[#22C55E]">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
