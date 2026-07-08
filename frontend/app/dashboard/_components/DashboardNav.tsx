import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { QuotaStatus } from "../_lib/api";

interface DashboardNavProps {
  isPro: boolean;
  quota: QuotaStatus | null;
  onUpgrade: () => void;
}

export function DashboardNav({ isPro, quota, onUpgrade }: DashboardNavProps) {
  const quotaLabel = (() => {
    if (!quota) return null;
    if (quota.is_paid) {
      return `${quota.remaining} scan${quota.remaining === 1 ? "" : "s"} left`;
    }
    if (quota.remaining === 0) return "Free scan used";
    return `${quota.remaining} free scan`;
  })();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-mono font-bold text-lg tracking-tight shrink-0">
          thynkk<span className="text-primary">.</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {quotaLabel && (
            <span
              className={`hidden sm:inline text-xs font-mono px-2.5 py-1 rounded-full border truncate ${
                quota?.remaining === 0 && !isPro
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {quotaLabel}
            </span>
          )}

          {isPro ? (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 shrink-0">
              Pro
            </span>
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              className="text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
            >
              Upgrade
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