import type { Metadata } from "next";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { PlanCTA } from "../_components/PlanCTA";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, honest pricing for Thynkk. Free tier with 1 scan. Pro at $19/mo for full reports, 50 scans, exports, and weekly digests.",
  alternates: { canonical: "https://thynkk.co/pricing" },
  openGraph: {
    title: "Thynkk Pricing — Simple. No tricks.",
    description: "Free forever for your first scan. Pro at $19/mo for full pain-point reports, Trend Radar, exports, and weekly digests.",
    url: "https://thynkk.co/pricing",
  },
};

const FREE_FEATURES = [
  "1 free scan",
  "Top 3 pain-point themes",
  "Top 3 trending niches",
  "Source quotes + links",
];

const PRO_FEATURES = [
  "50 scans per month",
  "Full pain-point reports",
  "Full Trend Radar feed",
  "CSV + PDF exports",
  "Saved searches",
  "Weekly digest emails",
];

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-[#22C55E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">Pricing</p>
        <h1 className="font-mono text-4xl font-bold text-center mb-4">Simple. No tricks.</h1>
        <p className="text-center text-[#94A3B8] mb-12 max-w-xl mx-auto">
          Start free. Upgrade when you need full reports and more scans.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
            <h2 className="font-mono font-bold text-xl mb-1">Free</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Forever. No card needed.</p>
            <div className="font-mono text-4xl font-bold mb-8">$0</div>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
            <PlanCTA plan="free" />
          </div>

          <div
            className="bg-[#0E1223] border border-[#6366F1] rounded-lg p-8 relative"
            style={{ boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}
          >
            <div className="absolute -top-3 left-6 bg-[#6366F1] text-white text-xs font-mono px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <h2 className="font-mono font-bold text-xl mb-1">Pro</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Everything, unlocked.</p>
            <div className="font-mono text-4xl font-bold mb-8">
              $19<span className="text-lg text-[#94A3B8] font-normal">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
            <PlanCTA plan="pro" />
          </div>
        </div>

        <p className="text-center text-sm text-[#475569] mt-10">
          Cancel anytime via PayPal. No annual lock-in.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}