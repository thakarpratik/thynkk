import type { ScanStatus } from "../_types";
import type { QuotaStatus } from "../_lib/api";

interface GrowthScanInputProps {
  url: string;
  status: ScanStatus;
  quota: QuotaStatus | null;
  onChange: (value: string) => void;
  onScan: () => void;
  onUpgrade?: () => void;
}

export function GrowthScanInput({ url, status, quota, onChange, onScan, onUpgrade }: GrowthScanInputProps) {
  const exhausted = quota !== null && quota.remaining === 0;
  const isLoading = status === "loading";
  const disabled = isLoading || !url.trim() || exhausted;
  const showInput = status === "idle" || status === "error" || status === "loading";

  if (!showInput && status === "done") return null;

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="site-url" className="block text-sm font-medium text-foreground mb-2">
            Your website URL
          </label>
          <input
            id="site-url"
            type="url"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !disabled && onScan()}
            placeholder="https://yourproduct.com"
            disabled={exhausted || isLoading}
            className="w-full bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-foreground placeholder:text-muted-foreground/50 px-4 py-3 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {quota && (
            <p className={`text-xs mt-2 ${exhausted ? "text-destructive" : "text-muted-foreground"}`}>
              {exhausted
                ? quota.is_paid
                  ? "You've used all scans this month."
                  : "You've used your free scan."
                : `${quota.remaining} scan${quota.remaining === 1 ? "" : "s"} left${quota.is_paid ? " this month" : ""}`}
            </p>
          )}
        </div>
        <button
          onClick={onScan}
          disabled={disabled}
          className="shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm transition-colors cursor-pointer whitespace-nowrap w-full sm:w-auto"
        >
          {isLoading ? "Scanning…" : "Start scan"}
        </button>
      </div>
      {exhausted && !quota?.is_paid && (
        <p className="mt-4 text-sm text-muted-foreground rounded-lg bg-muted/50 px-4 py-3">
          Free plan includes 1 scan.{" "}
          <button type="button" onClick={onUpgrade} className="text-primary font-medium cursor-pointer hover:underline">
            Upgrade to Pro
          </button>{" "}
          for 50 scans/month and full reply drafts.
        </p>
      )}
    </section>
  );
}