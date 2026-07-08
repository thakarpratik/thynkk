interface UpgradeStripProps {
  variant: "scanner" | "radar" | "growth" | "growth-posts";
  hiddenCount?: number;
  onUpgrade?: () => void;
}

export function UpgradeStrip({ variant, hiddenCount = 0, onUpgrade }: UpgradeStripProps) {
  const title =
    hiddenCount > 0
      ? variant === "growth"
        ? `${hiddenCount} more thread${hiddenCount === 1 ? "" : "s"} with full reply drafts`
        : variant === "growth-posts"
          ? `${hiddenCount} more post idea${hiddenCount === 1 ? "" : "s"}`
          : variant === "scanner"
            ? `${hiddenCount} more theme${hiddenCount === 1 ? "" : "s"} in full report`
            : `${hiddenCount} more niche${hiddenCount === 1 ? "" : "s"} in full feed`
      : variant === "growth" || variant === "growth-posts"
        ? "Unlock full growth report"
        : variant === "scanner"
          ? "Unlock the full report"
          : "Unlock the full Trend Radar feed";

  const subtitle =
    variant === "growth" || variant === "growth-posts"
      ? "Pro: all threads, full reply drafts, all post ideas, 50 site scans/month"
      : variant === "scanner"
        ? "Pro: all themes, exact scores, opportunity analysis, CSV export, 50 scans/month"
        : "Pro: every trending niche, full momentum data, 50 scans/month";

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#0E1223] border border-[#6366F1]/30 rounded-lg mt-4">
      <div>
        <p className="text-sm font-mono font-medium text-[#F8FAFC]">{title}</p>
        <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="shrink-0 bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 py-2 rounded-md font-medium text-sm font-mono transition-colors cursor-pointer whitespace-nowrap"
      >
        Upgrade — $19/mo
      </button>
    </div>
  );
}