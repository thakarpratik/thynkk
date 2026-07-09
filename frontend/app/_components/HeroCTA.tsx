"use client";

import { WaitlistForm } from "./WaitlistForm";

interface HeroCTAProps {
  source?: string;
}

export function HeroCTA({ source = "homepage" }: HeroCTAProps) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <WaitlistForm source={source} variant="hero" />
    </div>
  );
}