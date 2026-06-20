interface UpgradeStripProps {
  lockedCount: number;
  noun?: string;
  onUpgrade?: () => void;
}

export function UpgradeStrip({ lockedCount, noun = "pain points", onUpgrade }: UpgradeStripProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#0E1223] border border-[#6366F1]/30 rounded-lg mt-2">
      <div>
        <p className="text-sm font-mono font-medium text-[#F8FAFC]">
          {lockedCount} more {noun} locked
        </p>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          Plus: exports, saved searches, weekly digest
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="shrink-0 bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 py-2 rounded-md font-medium text-sm font-mono transition-colors cursor-pointer whitespace-nowrap"
      >
        Upgrade — $19/mo
      </button>
    </div>
  );
}
