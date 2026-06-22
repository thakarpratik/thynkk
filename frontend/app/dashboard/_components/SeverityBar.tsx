interface SeverityBarProps {
  score: number;
  label?: string | null;
}

const severityColor = (score: number, label?: string | null) => {
  if (label === "High" || score >= 8) return "#EF4444";
  if (label === "Medium" || score >= 6) return "#F59E0B";
  return "#22C55E";
};

const barWidth = (score: number, label?: string | null) => {
  if (label === "High") return "85%";
  if (label === "Medium") return "55%";
  if (label === "Low") return "30%";
  return `${score * 10}%`;
};

export function SeverityBar({ score, label }: SeverityBarProps) {
  const color = severityColor(score, label);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: barWidth(score, label), backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {label ?? `${score}/10`}
      </span>
    </div>
  );
}
