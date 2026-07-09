"use client";

import { HeroScanInput } from "./HeroScanInput";
import { WaitlistForm } from "./WaitlistForm";

interface HeroCTAProps {
  source?: string;
}

export function HeroCTA({ source = "homepage" }: HeroCTAProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <WaitlistForm source={source} variant="hero" />

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#1E293B]" />
        <span className="text-xs font-mono text-[#475569] uppercase tracking-widest shrink-0">
          or try free
        </span>
        <div className="flex-1 h-px bg-[#1E293B]" />
      </div>

      <div>
        <HeroScanInput compact />
        <p className="text-sm text-[#64748B] mt-3">1 free scan · No credit card · Sign in required</p>
      </div>
    </div>
  );
}