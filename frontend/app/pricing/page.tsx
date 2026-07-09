import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { PlanCTA } from "../_components/PlanCTA";
import { LiveActivity } from "../_components/LiveActivity";
import {
  FREE_FEATURE_LIST,
  FREE_SCANS_LIFETIME,
  PRO_FEATURE_LIST,
  PRO_PRICE_LABEL,
  PRO_PRICE_USD,
  PRO_SCANS_PER_MONTH,
} from "../_lib/pricing";

export const metadata: Metadata = {
  title: "Pricing — Thynkk Growth Engine",
  description: `Free: ${FREE_SCANS_LIFETIME} site scan. Pro ${PRO_PRICE_LABEL}: ${PRO_SCANS_PER_MONTH} scans, full reply drafts, all post ideas.`,
  alternates: { canonical: "https://thynkk.co/pricing" },
  openGraph: {
    title: "Thynkk Pricing — Reddit traffic without the grind",
    description: `Start with 1 free growth scan. Pro unlocks full reports and ${PRO_SCANS_PER_MONTH} scans per month.`,
    url: "https://thynkk.co/pricing",
  },
};

const COMPARISON = [
  { feature: "Site scans", free: "1 total", pro: `${PRO_SCANS_PER_MONTH} / month` },
  { feature: "Threads per scan", free: "Top 3", pro: "All ranked" },
  { feature: "Reply drafts", free: "Preview only", pro: "Full text + copy" },
  { feature: "Post ideas", free: "1 teaser", pro: "All ideas" },
  { feature: "Promo-risk scores", free: "—", pro: "✓" },
  { feature: "Typical use", free: "Try once", pro: "~2 scans / week" },
];

const FAQ = [
  {
    q: "Why only 10 scans per month on Pro?",
    a: "Most founders scan when they launch, pivot, or refresh positioning — about 2–4 times a month. Ten scans keeps quality high, costs sustainable, and is more than enough unless you're running an agency.",
  },
  {
    q: "What counts as a scan?",
    a: "One scan = one website URL. Thynkk finds relevant Reddit discussions, ranks them, and drafts replies and post ideas. Most scans finish in about 60 seconds.",
  },
  {
    q: "What do I get on Pro that Free doesn't?",
    a: "Free shows top opportunities with locked reply drafts. Pro unlocks every thread, full copy-paste replies, all post ideas, and enough monthly scans to grow on Reddit consistently.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is billed monthly through PayPal. Cancel anytime — no annual contract.",
  },
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

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">Pricing</p>
        <h1 className="font-mono text-4xl font-bold text-center mb-4">Built for founders, not agencies</h1>
        <p className="text-center text-[#94A3B8] mb-2 max-w-2xl mx-auto leading-relaxed">
          One free scan to see the magic. Pro gives you enough monthly scans to grow on Reddit without burning API budget on scan spam.
        </p>
        <p className="text-center text-sm text-[#64748B] mb-6 max-w-lg mx-auto">
          Most Pro users run 3–6 scans/month · Full reports every time
        </p>
        <div className="flex justify-center mb-12">
          <LiveActivity variant="compact" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-xl p-8">
            <h2 className="font-mono font-bold text-xl mb-1">Free</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Proof it works for your site.</p>
            <div className="font-mono text-4xl font-bold mb-2">$0</div>
            <p className="text-xs text-[#64748B] mb-8">{FREE_SCANS_LIFETIME} scan · No credit card</p>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {FREE_FEATURE_LIST.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <PlanCTA plan="free" />
          </div>

          <div
            className="bg-[#0E1223] border border-[#6366F1] rounded-xl p-8 relative"
            style={{ boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}
          >
            <div className="absolute -top-3 left-6 bg-[#6366F1] text-white text-xs font-mono px-3 py-1 rounded-full">
              FOR WEEKLY GROWTH
            </div>
            <h2 className="font-mono font-bold text-xl mb-1">Pro</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Full reports, every reply unlocked.</p>
            <div className="font-mono text-4xl font-bold mb-2">
              ${PRO_PRICE_USD}<span className="text-lg text-[#94A3B8] font-normal">/mo</span>
            </div>
            <p className="text-xs text-[#64748B] mb-8">{PRO_SCANS_PER_MONTH} scans/mo · ~${(PRO_PRICE_USD / PRO_SCANS_PER_MONTH).toFixed(2)} per scan</p>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {PRO_FEATURE_LIST.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <PlanCTA plan="pro" />
          </div>
        </div>

        <section className="mb-16">
          <h2 className="font-mono text-lg font-bold text-center mb-6">Compare plans</h2>
          <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0E1223] border-b border-[#1E293B]">
                  <th className="text-left px-5 py-3 font-mono text-[#64748B] font-normal">Feature</th>
                  <th className="text-center px-5 py-3 font-mono text-[#94A3B8]">Free</th>
                  <th className="text-center px-5 py-3 font-mono text-[#6366F1]">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-[#020617]" : "bg-[#0E1223]/50"}>
                    <td className="px-5 py-3 text-[#CBD5E1]">{row.feature}</td>
                    <td className="px-5 py-3 text-center text-[#94A3B8] font-mono text-xs">{row.free}</td>
                    <td className="px-5 py-3 text-center text-[#F8FAFC] font-mono text-xs">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-mono text-lg font-bold text-center mb-6">FAQ</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border border-[#1E293B] bg-[#0E1223] px-5 py-4">
                <p className="font-mono text-sm font-semibold text-[#F8FAFC] mb-2">{item.q}</p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div
          className="rounded-xl border border-[#6366F1]/30 bg-[#0E1223] p-8 text-center"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.08)" }}
        >
          <p className="font-mono font-bold text-lg mb-2">Need more than {PRO_SCANS_PER_MONTH} scans?</p>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto leading-relaxed">
            We&apos;re focused on indie founders for now. Agencies — reach out and we&apos;ll talk custom plans.
          </p>
          <Link
            href="/contact"
            className="inline-block border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-[#F8FAFC] px-6 py-2.5 rounded-lg font-medium text-sm transition-colors mr-3"
          >
            Contact us
          </Link>
          <Link
            href="/"
            className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-lg font-medium text-sm transition-colors"
          >
            Join waitlist
          </Link>
        </div>

        <p className="text-center text-sm text-[#475569] mt-10">
          Cancel anytime via PayPal. No annual lock-in.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}