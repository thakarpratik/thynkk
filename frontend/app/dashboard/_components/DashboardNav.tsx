import { UserButton } from "@clerk/nextjs";
import type { QuotaStatus } from "../_lib/api";
import { BrandLogo } from "../../_components/BrandLogo";

interface DashboardNavProps {
  scanCredits: number;
  quota: QuotaStatus | null;
  onUpgrade: () => void;
}

export function DashboardNav({ scanCredits, quota, onUpgrade }: DashboardNavProps) {
  const quotaLabel = (() => {
    if (!quota) return null;
    if (scanCredits > 0) {
      return `${scanCredits} full scan${scanCredits === 1 ? "" : "s"} left`;
    }
    if (quota.free_available) return "1 free scan";
    return "No scans left";
  })();

  const needsUpgrade = scanCredits === 0 && quota?.free_available === false;

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <BrandLogo className="h-8 w-auto sm:h-9" />

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {quotaLabel && (
            <span
              className={`hidden sm:inline text-xs font-mono px-2.5 py-1 rounded-full border truncate ${
                needsUpgrade
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {quotaLabel}
            </span>
          )}

          {scanCredits > 0 ? (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 shrink-0">
              Launch Pack
            </span>
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              className="text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
            >
              Buy scans
            </button>
          )}

          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7",
              },
            }}
          />
        </div>
      </div>
    </nav>
  );
}