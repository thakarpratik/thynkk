import type { TrendItem } from "../_types";
import { UpgradeStrip } from "./UpgradeStrip";

interface TrendRadarProps {
  trends: TrendItem[];
  isPro: boolean;
  lockedCount: number;
}

const TAG_STYLES: Record<TrendItem["tag"], string> = {
  HOT:    "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
  RISING: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  NEW:    "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
};

const BLURRED: React.CSSProperties = {
  filter: "blur(5px)",
  userSelect: "none",
  pointerEvents: "none",
};

function TrendRow({ trend, index, shallow, isPro }: {
  trend: TrendItem;
  index: number;
  shallow: boolean;
  isPro: boolean;
}) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] hover:border-[#22C55E]/50 rounded-lg p-5 transition-colors">
      <div className="flex items-center justify-between">
        {/* Left: rank + name always visible */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#94A3B8]">#{index + 1}</span>
          <div>
            <h3 className={`font-mono font-semibold text-sm ${shallow ? "text-[#94A3B8]" : "text-[#F8FAFC]"}`}>
              {trend.niche}
            </h3>
            {!shallow && (
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {trend.subreddit} · {trend.posts.toLocaleString()} posts
              </p>
            )}
            {shallow && (
              <p className="text-xs text-[#475569] mt-0.5 font-mono">Growth and signal locked</p>
            )}
          </div>
        </div>

        {/* Right: growth + tag — blurred for free users */}
        <div
          className="flex items-center gap-3"
          style={(!isPro) ? BLURRED : undefined}
        >
          <span className="font-mono text-lg font-bold text-[#22C55E]">{trend.growth}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${TAG_STYLES[trend.tag]}`}>
            {trend.tag}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TrendRadar({ trends, isPro, lockedCount }: TrendRadarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-mono font-bold text-lg">Trend Radar</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Niches gaining momentum on Reddit · Updated daily
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#22C55E] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Live
        </div>
      </div>

      <div className="space-y-3">
        {trends.map((trend, i) => (
          <TrendRow
            key={trend.niche}
            trend={trend}
            index={i}
            isPro={isPro}
            shallow={!isPro && i >= 3}
          />
        ))}
      </div>

      {!isPro && lockedCount > 0 && (
        <UpgradeStrip lockedCount={lockedCount} noun="trending niches" />
      )}
    </div>
  );
}
