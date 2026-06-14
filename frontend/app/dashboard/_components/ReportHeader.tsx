interface ReportHeaderProps {
  query: string;
  totalCount: number;
  isPro: boolean;
  freeLimit: number;
  fromCache?: boolean;
}

export function ReportHeader({ query, totalCount, isPro, freeLimit, fromCache }: ReportHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="font-mono font-bold text-lg">
          Pain Point Report
          <span className="text-[#94A3B8] font-normal text-sm ml-2">· {query}</span>
        </h2>
        <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-2">
          <span>{totalCount} themes found · {isPro ? "Full report" : `Showing top ${freeLimit} free`}</span>
          {fromCache && (
            <span className="inline-flex items-center gap-1 text-[#22C55E] font-mono">
              <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
              cached
            </span>
          )}
        </p>
      </div>
      {isPro && (
        <button className="text-xs border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-white px-3 py-1.5 rounded-md font-mono transition-all cursor-pointer">
          Export CSV
        </button>
      )}
    </div>
  );
}
