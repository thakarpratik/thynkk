interface SeverityBarProps {
  score: number;
}

const severityColor = (score: number) => {
  if (score >= 8) return "#EF4444";
  if (score >= 6) return "#F59E0B";
  return "#22C55E";
};

export function SeverityBar({ score }: SeverityBarProps) {
  const color = severityColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score * 10}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {score}/10
      </span>
    </div>
  );
}
