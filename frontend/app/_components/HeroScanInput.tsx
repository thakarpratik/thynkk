"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import { normalizeWebsiteUrl } from "../dashboard/_lib/website-url";

interface HeroScanInputProps {
  compact?: boolean;
  buttonLabel?: string;
}

export function HeroScanInput({
  compact = false,
  buttonLabel,
}: HeroScanInputProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignUp } = useClerk();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const label = buttonLabel ?? "Start scanning";

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    let target: string;
    try {
      target = normalizeWebsiteUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter a valid website URL.");
      return;
    }

    const dashboardPath = `/dashboard?url=${encodeURIComponent(target)}`;

    if (isLoaded && isSignedIn) {
      router.push(dashboardPath);
      return;
    }

    openSignUp({
      forceRedirectUrl: dashboardPath,
      signInForceRedirectUrl: dashboardPath,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          placeholder="Enter your website"
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3.5 rounded-lg text-sm font-mono transition-colors text-left"
          aria-label="Your website URL"
        />
        <button
          type="submit"
          disabled={!url.trim() || !isLoaded}
          className={`disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer whitespace-nowrap ${
            compact
              ? "bg-[#1A1E2F] border border-[#1E293B] hover:border-[#6366F1] text-[#CBD5E1]"
              : "bg-[#6366F1] hover:bg-[#4F46E5] font-semibold px-8 py-3.5"
          }`}
          style={compact ? undefined : { boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
        >
          {label}
        </button>
      </div>
      {error && (
        <p className="text-xs text-[#EF4444] mt-2 text-left font-mono">{error}</p>
      )}
      {!compact && !error && (
        <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
          Free scan included. Sign in or create an account to start — about 60 seconds.
        </p>
      )}
    </form>
  );
}
