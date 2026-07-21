import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { PlanCTA } from "../_components/PlanCTA";
import { LiveActivity } from "../_components/LiveActivity";
import {
  FREE_FEATURE_LIST,
  FREE_SCANS_LIFETIME,
  PACK_FEATURE_LIST,
  PACK_NAME,
  PACK_PER_SCAN,
  PACK_PRICE_LABEL,
  PACK_PRICE_USD,
  PACK_SCANS,
} from "../_lib/pricing";

export const metadata: Metadata = {
  title: "Pricing — Thynkk Growth Engine",
  description: `Free: ${FREE_SCANS_LIFETIME} full site scan. ${PACK_NAME} ${PACK_PRICE_LABEL}: ${PACK_SCANS} more full scans.`,
  alternates: { canonical: "https://thynkk.co/pricing" },
  openGraph: {
    title: "Thynkk Pricing — Reddit traffic without the grind",
    description: `Start with 1 free full growth scan. ${PACK_NAME} adds ${PACK_SCANS} more — pay once, no subscription.`,
    url: "https://thynkk.co/pricing",
  },
};

const COMPARISON = [
  { feature: "Site scans", free: "1 full scan", pro: `${PACK_SCANS} per pack` },
  { feature: "Threads per scan", free: "All ranked", pro: "All ranked" },
  { feature: "Reply drafts", free: "Full text + copy", pro: "Full text + copy" },
  { feature: "Post ideas", free: "All ideas", pro: "All ideas" },
  { feature: "Promo-risk scores", free: "✓", pro: "✓" },
  { feature: "Billing", free: "Free forever", pro: "One-time $19" },
];

const FAQ = [
  {
    q: "Why pay-as-you-go instead of a subscription?",
    a: "Most founders scan when they launch, pivot, or refresh positioning — a few times a year, not every week. PAYG matches how you actually use Thynkk.",
  },
  {
    q: "What counts as a scan?",
    a: "One scan = one website URL. Thynkk finds relevant Reddit discussions, ranks them, and drafts replies and post ideas. Cached URLs and re-reading old reports don't burn credits.",
  },
  {
    q: "What do I get in the Launch Pack?",
    a: "3 full growth reports — every thread, copy-paste replies, all post ideas. Failed scans don't count. Buy another pack anytime you need more.",
  },
  {
    q: "Can I buy more packs later?",
    a: "Yes. Each $19 pack adds 3 more full scans. No subscription, no auto-renewal.",
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
        <h1 className="font-mono text-4xl font-bold text-center mb-4">Pay when you launch. Not every month.</h1>
        <p className="text-center text-[#94A3B8] mb-2 max-w-2xl mx-auto leading-relaxed">
          One free full scan — complete threads and drafts. Then buy a Launch Pack when you need more scans — no subscription.
        </p>
        <p className="text-center text-sm text-[#64748B] mb-6 max-w-lg mx-auto">
          {PACK_PER_SCAN} · Failed scans don&apos;t count · Re-read old reports free
        </p>
        <div className="flex justify-center mb-12">
          <LiveActivity variant="compact" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-xl p-8">
            <h2 className="font-mono font-bold text-xl mb-1">Free</h2>
            <p className="text-[#94A3B8] text-sm mb-6">One complete report for your site.</p>
            <div className="font-mono text-4xl font-bold mb-2">$0</div>
            <p className="text-xs text-[#64748B] mb-8">{FREE_SCANS_LIFETIME} full scan · No credit card</p>
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
              MOST POPULAR
            </div>
            <h2 className="font-mono font-bold text-xl mb-1">{PACK_NAME}</h2>
            <p className="text-[#94A3B8] text-sm mb-6">More full scans when you need them.</p>
            <div className="font-mono text-4xl font-bold mb-2">
              ${PACK_PRICE_USD}<span className="text-lg text-[#94A3B8] font-normal"> once</span>
            </div>
            <p className="text-xs text-[#64748B] mb-8">{PACK_SCANS} full scans · {PACK_PER_SCAN}</p>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {PACK_FEATURE_LIST.map((f) => (
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
                  <th className="text-center px-5 py-3 font-mono text-[#6366F1]">{PACK_NAME}</th>
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
          <p className="font-mono font-bold text-lg mb-2">Need more than {PACK_SCANS} scans?</p>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto leading-relaxed">
            Buy another pack anytime. Agencies — reach out for volume pricing.
          </p>
          <Link
            href="/contact"
            className="inline-block border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-[#F8FAFC] px-6 py-2.5 rounded-lg font-medium text-sm transition-colors mr-3"
          >
            Contact us
          </Link>
          <Link
            href="/dashboard"
            className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-lg font-medium text-sm transition-colors"
          >
            Start scanning
          </Link>
        </div>

        <p className="text-center text-sm text-[#475569] mt-10">
          One-time payment via PayPal. No auto-renewal.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}