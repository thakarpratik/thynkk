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
      return `${quota.remaining} scan${quota.remaining === 1 ? "" : "s"} left this month`;
    }
    if (quota.remaining === 0) return "Free scan used";
    return `${quota.remaining} free scan`;
  })();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-[#1E293B] bg-[#020617]/95 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-mono font-bold text-lg tracking-tight shrink-0">
          thynkk<span className="text-[#6366F1]">.</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {quotaLabel && (
            <span
              className={`hidden sm:inline text-xs font-mono px-2.5 py-1 rounded-full border truncate ${
                quota?.remaining === 0 && !isPro
                  ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                  : "bg-[#1A1E2F] text-[#94A3B8] border-[#1E293B]"
              }`}
            >
              {quotaLabel}
            </span>
          )}

          {isPro ? (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shrink-0">
              Pro
            </span>
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              className="text-xs sm:text-sm bg-[#6366F1] hover:bg-[#4F46E5] text-white px-3 sm:px-4 py-1.5 rounded-md font-medium font-mono transition-colors cursor-pointer shrink-0"
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