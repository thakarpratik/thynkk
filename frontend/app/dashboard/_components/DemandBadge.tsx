interface DemandBadgeProps {
  score: number;
  label?: string | null;
}

const demandColor = (score: number, label?: string | null) => {
  if (label === "High" || score >= 80) return "#6366F1";
  if (label === "Medium" || score >= 50) return "#818CF8";
  return "#94A3B8";
};

export function DemandBadge({ score, label }: DemandBadgeProps) {
  const display = label ?? String(score);
  return (
    <span className="font-mono text-lg font-bold" style={{ color: demandColor(score, label) }}>
      {display}
    </span>
  );
}
