import type { Mode } from "../_types";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const MODES: { value: Mode; label: string }[] = [
  { value: "scanner", label: "Pain Point Scanner" },
  { value: "radar", label: "Trend Radar" },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-[#0E1223] border border-[#1E293B] rounded-lg p-1 w-fit mb-8">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-5 py-2 rounded-md text-sm font-mono font-medium transition-all cursor-pointer ${
            mode === value
              ? "bg-[#6366F1] text-white"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
