import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface DashboardNavProps {
  isPro: boolean;
}

export function DashboardNav({ isPro }: DashboardNavProps) {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-[#1E293B] bg-[#020617]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono font-bold text-lg tracking-tight">
          thynkk<span className="text-[#6366F1]">.</span>
        </Link>
        <div className="flex items-center gap-3">
          {!isPro && (
            <span className="text-xs bg-[#1A1E2F] border border-[#1E293B] text-[#94A3B8] px-2.5 py-1 rounded-full font-mono">
              Free plan
            </span>
          )}
          {!isPro && (
            <button className="text-sm bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-1.5 rounded-md font-medium transition-colors cursor-pointer">
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
