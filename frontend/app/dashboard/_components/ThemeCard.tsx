import type { Theme } from "../_types";
import { SeverityBar } from "./SeverityBar";
import { DemandBadge } from "./DemandBadge";

const VERDICT_STYLES: Record<string, string> = {
  "Strong signal":   "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
  "Weak signal":     "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  "Already crowded": "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
};

interface ThemeCardProps {
  theme: Theme;
  index: number;
  isPro: boolean;
  variant?: "full" | "shallow";
  onClick?: () => void;
}

const BLURRED: React.CSSProperties = {
  filter: "blur(5px)",
  userSelect: "none",
  pointerEvents: "none",
};

export function ThemeCard({ theme, index, isPro, variant = "full", onClick }: ThemeCardProps) {
  const isShallow = variant === "shallow";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      className="relative bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden transition-all cursor-pointer hover:border-[#6366F1]/50"
    >
      <div className="p-5">
        {/* Title row — always fully visible */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs text-[#94A3B8] shrink-0">#{index + 1}</span>
            <h3 className="font-mono font-semibold text-sm text-[#F8FAFC] truncate">
              {theme.name}
            </h3>
          </div>

          {/* Score cluster — labels always visible, values blurred for free users */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8] uppercase font-mono mb-1">Demand</p>
              <div style={isPro ? undefined : BLURRED}>
                <DemandBadge score={theme.demand} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8] uppercase font-mono mb-1">Severity</p>
              <div style={isPro ? undefined : BLURRED}>
                <SeverityBar score={theme.severity} />
              </div>
            </div>
          </div>
        </div>

        {isShallow ? (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[#475569] font-mono">Analysis and quotes locked</p>
            <span className="text-xs text-[#6366F1] font-mono shrink-0 ml-4">Upgrade to unlock &rarr;</span>
          </div>
        ) : (
          <>
            {theme.verdict && theme.verdict !== "Unknown" && (
              <div className="mb-3">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${VERDICT_STYLES[theme.verdict] ?? "bg-[#1E293B] text-[#94A3B8] border-[#1E293B]"}`}>
                  {theme.verdict}
                </span>
              </div>
            )}
            <p className="text-sm text-[#94A3B8] mb-3 leading-relaxed">{theme.summary}</p>

            <div className="bg-[#1A1E2F] rounded-md p-3 mb-3">
              <p className="text-[10px] font-mono text-[#6366F1] uppercase mb-1">Opportunity</p>
              <p className="text-xs text-[#CBD5E1]">{theme.opportunity}</p>
            </div>

            {theme.quotes[0] && (
              <blockquote className="border-l-2 border-[#6366F1] pl-3 mb-3">
                <p className="text-xs text-[#94A3B8] italic leading-relaxed">
                  &ldquo;{theme.quotes[0].text}&rdquo;
                </p>
                <a
                  href={theme.quotes[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-[#6366F1] hover:underline font-mono mt-1 inline-block"
                >
                  View source
                </a>
              </blockquote>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8] font-mono">{theme.mentions} mentions</span>
              <span className="text-xs text-[#6366F1] font-mono">
                {theme.quotes.length > 1 ? `+${theme.quotes.length - 1} more quotes · ` : ""}View all &rarr;
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
