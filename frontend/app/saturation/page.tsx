import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { SaturationApp } from "./_components/SaturationApp";

export const metadata: Metadata = {
  title: "Niche Saturation Score — Go / No-go | Thynkk",
  description:
    "Calculate a 0–100 niche saturation score before you build. Transparent factors, go / caution / no-go decision, and niche-down recommendations.",
  alternates: { canonical: "https://thynkk.co/saturation" },
  openGraph: {
    title: "Niche Saturation Score — Go / No-go | Thynkk",
    description:
      "Still choosing a niche? Get a data-backed saturation score and go / no-go call before you write code.",
    url: "https://thynkk.co/saturation",
  },
};

export default function SaturationPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-mono text-[#22C55E] uppercase tracking-widest mb-3">
            Pre-launch · Section 2
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            Calculate your niche{" "}
            <span className="text-gradient">Saturation Score</span>
          </h1>
          <p className="text-[#94A3B8] text-base leading-relaxed mb-8">
            Thinking of a niche — or stuck between ideas? Enter your idea, unlock with
            email (no account), and get a 0–100 score with a clear{" "}
            <span className="text-[#F8FAFC]">Go / Caution / No-go</span> in about 15
            seconds. Not for live sites — use{" "}
            <Link href="/#explore-reddit" className="text-[#818CF8] hover:underline">
              Find Reddit threads
            </Link>{" "}
            after you ship.
          </p>

          <Suspense
            fallback={
              <div className="text-sm text-[#94A3B8] font-mono">Loading…</div>
            }
          >
            <SaturationApp />
          </Suspense>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
