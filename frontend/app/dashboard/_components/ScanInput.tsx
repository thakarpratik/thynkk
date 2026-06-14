import type { ScanStatus } from "../_types";

interface ScanInputProps {
  query: string;
  status: ScanStatus;
  onChange: (value: string) => void;
  onScan: () => void;
}

export function ScanInput({ query, status, onChange, onScan }: ScanInputProps) {
  return (
    <div className="mb-8">
      <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">
        Niche or subreddit
      </label>
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onScan()}
          placeholder="e.g. r/smallbusiness or freelancing tools"
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3 rounded-md text-sm font-mono transition-colors"
        />
        <button
          onClick={onScan}
          disabled={status === "loading" || !query.trim()}
          className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          {status === "loading" ? "Scanning..." : "Scan"}
        </button>
      </div>
    </div>
  );
}
