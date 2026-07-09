import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { PlanCTA } from "../_components/PlanCTA";
import { LiveActivity } from "../_components/LiveActivity";

export const metadata: Metadata = {
  title: "Pricing — Thynkk Growth Engine",
  description:
    "Free: 1 site scan, top threads, reply preview. Pro $19/mo: 50 scans, full reply drafts, all post ideas, promo-risk scoring.",
  alternates: { canonical: "https://thynkk.co/pricing" },
  openGraph: {
    title: "Thynkk Pricing — Reddit traffic without the grind",
    description: "Start with 1 free growth scan. Upgrade for full reply drafts and 50 site scans per month.",
    url: "https://thynkk.co/pricing",
  },
};

const FREE_FEATURES = [
  "1 site scan (lifetime)",
  "Top 3 Reddit threads to join",
  "Reply draft preview (first 120 chars)",
  "1 post idea with outline teaser",
  "Communities to watch",
];

const PRO_FEATURES = [
  "50 site scans per month",
  "All ranked threads in every report",
  "Full copy-ready reply drafts",
  "All post ideas with full outlines",
  "Promo-risk scoring per thread",
  "Priority scan processing",
];

const COMPARISON = [
  { feature: "Site scans", free: "1 total", pro: "50 / month" },
  { feature: "Threads per scan", free: "Top 3", pro: "All ranked" },
  { feature: "Reply drafts", free: "Preview only", pro: "Full text + copy" },
  { feature: "Post ideas", free: "1 teaser", pro: "All ideas" },
  { feature: "Promo-risk scores", free: "—", pro: "✓" },
  { feature: "Time saved vs manual Reddit", free: "~5 hrs", pro: "~5 hrs × 50" },
];

const FAQ = [
  {
    q: "What counts as a scan?",
    a: "One scan = one website URL. Thynkk reads your product, finds relevant Reddit discussions, ranks them, and drafts replies and post ideas. Most scans finish in about 60 seconds.",
  },
  {
    q: "Is the free scan really free?",
    a: "Yes. Request access via the waitlist, create your account, and run one full growth scan — no credit card. Upgrade only if you want full reply drafts and more scans.",
  },
  {
    q: "What do I get on Pro that Free doesn't?",
    a: "Free shows you the top opportunities with locked reply drafts. Pro unlocks every thread, full reply text you can copy-paste, and all post ideas — plus 50 scans per month for ongoing Reddit growth.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is billed monthly through PayPal. Cancel anytime from your PayPal subscription settings — no annual contract.",
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
        <h1 className="font-mono text-4xl font-bold text-center mb-4">Pay for hours saved, not hype</h1>
        <p className="text-center text-[#94A3B8] mb-2 max-w-2xl mx-auto leading-relaxed">
          Thynkk replaces hours of Reddit scanning with one paste-and-go growth report. Start free — upgrade when you&apos;re replying every week.
        </p>
        <p className="text-center text-sm text-[#64748B] mb-6 max-w-lg mx-auto">
          Targeted organic traffic · Copy-ready replies · No spam automation
        </p>
        <div className="flex justify-center mb-12">
          <LiveActivity variant="compact" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-xl p-8">
            <h2 className="font-mono font-bold text-xl mb-1">Free</h2>
            <p className="text-[#94A3B8] text-sm mb-6">See what we&apos;d find for your site.</p>
            <div className="font-mono text-4xl font-bold mb-2">$0</div>
            <p className="text-xs text-[#64748B] mb-8">1 scan · No credit card</p>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {FREE_FEATURES.map((f) => (
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
              FOR WEEKLY REDDIT GROWTH
            </div>
            <h2 className="font-mono font-bold text-xl mb-1">Pro</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Full reports. Copy every reply.</p>
            <div className="font-mono text-4xl font-bold mb-2">
              $19<span className="text-lg text-[#94A3B8] font-normal">/mo</span>
            </div>
            <p className="text-xs text-[#64748B] mb-8">Less than one hour of your time</p>
            <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
              {PRO_FEATURES.map((f) => (
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
          <p className="font-mono font-bold text-lg mb-2">Still scrolling Reddit manually?</p>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto leading-relaxed">
            Request access, run your first scan free, and see the threads you should&apos;ve found hours ago.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-lg font-medium text-sm transition-colors"
          >
            Join waitlist — free scan included
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