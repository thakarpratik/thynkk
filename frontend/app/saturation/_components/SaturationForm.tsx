"use client";

interface SaturationFormProps {
  value: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  examples?: string[];
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPickExample?: (example: string) => void;
}

export function SaturationForm({
  value,
  disabled,
  loading,
  error,
  examples,
  onChange,
  onSubmit,
  onPickExample,
}: SaturationFormProps) {
  return (
    <div className="w-full">
      <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">
        Idea, niche, or product concept
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={value}
          maxLength={120}
          disabled={disabled || loading}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="e.g. AI scheduling for freelance designers"
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#22C55E] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3.5 rounded-lg text-sm font-mono transition-colors disabled:opacity-60"
          aria-label="Niche or product idea"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading || !value.trim()}
          className="bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed text-[#0F172A] px-8 py-3.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          style={{ boxShadow: "0 0 24px rgba(34,197,94,0.25)" }}
        >
          {loading ? "Working…" : "Calculate score"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3">
          <p className="text-sm text-[#FCA5A5] font-medium">{error}</p>
          {examples && examples.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => onPickExample?.(ex)}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-[#334155] bg-[#0E1223] text-[#CBD5E1] hover:border-[#22C55E] hover:text-white transition-colors cursor-pointer"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!error && (
        <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
          Be specific: who it&apos;s for + what problem. Free with email · ~15s research ·
          vague words like &quot;game&quot; or industries like &quot;furniture&quot; are rejected.
        </p>
      )}
    </div>
  );
}
