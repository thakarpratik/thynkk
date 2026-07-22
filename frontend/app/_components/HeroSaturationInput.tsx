"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroSaturationInput() {
  const router = useRouter();
  const [idea, setIdea] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = idea.trim();
    if (!value) return;
    router.push(`/saturation?q=${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={idea}
          maxLength={120}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. AI scheduling for freelancers"
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#22C55E] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3.5 rounded-lg text-sm font-mono transition-colors text-left"
          aria-label="Niche or product idea"
        />
        <button
          type="submit"
          disabled={!idea.trim()}
          className="disabled:opacity-50 disabled:cursor-not-allowed bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] px-8 py-3.5 rounded-lg font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
          style={{ boxShadow: "0 0 24px rgba(34,197,94,0.25)" }}
        >
          Calculate score
        </button>
      </div>
      <p className="text-xs text-[#64748B] mt-3 leading-relaxed text-left">
        Free with email · ~15s deep check · Vague inputs like “game” or “furniture” are rejected
      </p>
    </form>
  );
}
