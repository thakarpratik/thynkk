"use client";

import { HeroScanInput } from "./HeroScanInput";

interface HeroCTAProps {
  compact?: boolean;
}

export function HeroCTA({ compact = false }: HeroCTAProps) {
  return (
    <div className={`w-full mx-auto ${compact ? "max-w-xl" : "max-w-xl"}`}>
      <HeroScanInput compact={compact} buttonLabel="Start scanning" />
    </div>
  );
}
