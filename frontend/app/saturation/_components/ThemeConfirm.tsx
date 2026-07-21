"use client";

interface ThemeConfirmProps {
  idea: string;
  message: string;
  examples?: string[];
  suggestedRewrite?: string | null;
  onConfirm: () => void;
  onRefine: (rewrite?: string) => void;
  loading?: boolean;
}

export function ThemeConfirm({
  idea,
  message,
  examples,
  suggestedRewrite,
  onConfirm,
  onRefine,
  loading,
}: ThemeConfirmProps) {
  return (
    <div className="mt-6 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-6">
      <p className="text-[10px] font-mono text-[#FBBF24] uppercase tracking-widest mb-2">
        Broad theme detected
      </p>
      <h3 className="font-mono font-bold text-lg text-[#F8FAFC] mb-2">
        “{idea}”
      </h3>
      <p className="text-sm text-[#E2E8F0] leading-relaxed mb-4">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#0F172A] px-5 py-2.5 rounded-md font-semibold text-sm cursor-pointer transition-colors"
        >
          {loading ? "Scoring…" : "Score as theme anyway"}
        </button>
        <button
          type="button"
          onClick={() => onRefine(suggestedRewrite || undefined)}
          disabled={loading}
          className="border border-[#334155] hover:border-[#F8FAFC] text-[#F8FAFC] px-5 py-2.5 rounded-md font-medium text-sm cursor-pointer transition-colors"
        >
          Refine input
        </button>
      </div>
      {examples && examples.length > 0 && (
        <div>
          <p className="text-xs text-[#94A3B8] mb-2 font-mono">Stronger product wedges:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onRefine(ex)}
                className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-[#334155] bg-[#0E1223] text-[#CBD5E1] hover:border-[#F59E0B] transition-colors cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
