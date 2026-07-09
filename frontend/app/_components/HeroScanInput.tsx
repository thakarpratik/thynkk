"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

interface HeroScanInputProps {
  compact?: boolean;
}

export function HeroScanInput({ compact = false }: HeroScanInputProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const target = normalizeUrl(url);
    if (!target) return;
    router.push(`/dashboard?url=${encodeURIComponent(target)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourproduct.com"
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3 rounded-lg text-sm font-mono transition-colors text-left"
          aria-label="Your website URL"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className={`disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer whitespace-nowrap ${
            compact
              ? "bg-[#1A1E2F] border border-[#1E293B] hover:border-[#6366F1] text-[#CBD5E1]"
              : "bg-[#6366F1] hover:bg-[#4F46E5] font-semibold px-8 py-3.5"
          }`}
          style={compact ? undefined : { boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
        >
          {compact ? "Free scan" : "Scan your site for free"}
        </button>
      </div>
    </form>
  );
}