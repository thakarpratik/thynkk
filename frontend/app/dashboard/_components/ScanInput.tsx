import type { ScanStatus } from "../_types";
import type { QuotaStatus } from "../_lib/api";

interface ScanInputProps {
  query: string;
  status: ScanStatus;
  quota: QuotaStatus | null;
  onChange: (value: string) => void;
  onScan: () => void;
}

export function ScanInput({ query, status, quota, onChange, onScan }: ScanInputProps) {
  const exhausted = quota !== null && quota.remaining === 0;
  const isLoading = status === "loading";
  const disabled = isLoading || !query.trim() || exhausted;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest">
          Niche or subreddit
        </label>
        {quota && (
          <span className={`text-xs font-mono ${exhausted ? "text-[#EF4444]" : quota.remaining <= 1 && !quota.is_paid ? "text-[#F59E0B]" : "text-[#475569]"}`}>
            {exhausted
              ? quota.is_paid ? "Monthly limit reached" : "Free scan used"
              : `${quota.remaining} scan${quota.remaining === 1 ? "" : "s"} remaining${quota.is_paid ? " this month" : ""}`
            }
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !disabled && onScan()}
          placeholder="e.g. r/smallbusiness or freelancing tools"
          disabled={exhausted}
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3 rounded-md text-sm font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          onClick={onScan}
          disabled={disabled}
          className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          {isLoading ? "Scanning..." : "Scan"}
        </button>
      </div>
      {exhausted && !quota?.is_paid && (
        <p className="mt-2 text-xs text-[#94A3B8]">
          You&apos;ve used your free scan.{" "}
          <span className="text-[#6366F1] cursor-pointer hover:underline">Upgrade to Pro</span>
          {" "}for 50 scans/month.
        </p>
      )}
    </div>
  );
}
