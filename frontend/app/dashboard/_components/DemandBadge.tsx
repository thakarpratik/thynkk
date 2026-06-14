interface DemandBadgeProps {
  score: number;
}

const demandColor = (score: number) => {
  if (score >= 80) return "#6366F1";
  if (score >= 50) return "#818CF8";
  return "#94A3B8";
};

export function DemandBadge({ score }: DemandBadgeProps) {
  return (
    <span className="font-mono text-lg font-bold" style={{ color: demandColor(score) }}>
      {score}
    </span>
  );
}
