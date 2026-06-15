import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = {
  title: "Affiliate Program — Thynkk",
  description: "Earn 30% recurring commission for every paid Thynkk subscriber you refer.",
};

const STEPS = [
  { step: "01", title: "Apply", body: "Fill out the short form below. We approve within 48 hours." },
  { step: "02", title: "Share", body: "Get your unique referral link. Share it with your audience — newsletter, YouTube, Twitter, wherever." },
  { step: "03", title: "Earn", body: "Earn 30% of every subscription payment, every month, for as long as your referral stays subscribed." },
];

const FAQS = [
  { q: "How much do I earn?", a: "30% recurring commission on every $19/mo Pro subscription. That&apos;s $5.70/month per referred user, paid every month they stay subscribed." },
  { q: "When do I get paid?", a: "Payouts run on the 15th of each month via Stripe for balances over $25. First payout arrives 30 days after your first referral converts." },
  { q: "How long do cookies last?", a: "60 days. If someone clicks your link and upgrades any time within 60 days, you get credit." },
  { q: "Is there a minimum audience size?", a: "No. We care about fit, not follower count. If you talk to indie hackers, founders, or marketers — you&apos;re a good fit." },
  { q: "Can I use paid ads?", a: "Yes, with prior written approval. Bidding on our brand keywords is not allowed." },
];

export default function AffiliatePage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3 text-center">Affiliate Program</p>
        <h1 className="font-mono text-4xl font-bold mb-4 text-center">Earn 30% recurring commission</h1>
        <p className="text-[#94A3B8] text-center text-lg mb-16 max-w-xl mx-auto">
          Refer founders to Thynkk. Earn 30% of every payment they make — forever, not just the first month.
        </p>

        {/* Commission callout */}
        <div className="grid grid-cols-3 gap-4 mb-16">
          {[
            { value: "30%", label: "Recurring commission" },
            { value: "$5.70", label: "Per user per month" },
            { value: "60 days", label: "Cookie window" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-6 text-center">
              <p className="font-mono text-3xl font-bold text-[#6366F1] mb-1">{s.value}</p>
              <p className="text-xs text-[#94A3B8]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 className="font-mono font-bold text-xl mb-6">How it works</h2>
        <div className="space-y-4 mb-16">
          {STEPS.map((s) => (
            <div key={s.step} className="flex gap-5 bg-[#0E1223] border border-[#1E293B] rounded-lg p-5">
              <span className="font-mono text-2xl font-bold text-[#6366F1] shrink-0">{s.step}</span>
              <div>
                <p className="font-mono font-semibold mb-1">{s.title}</p>
                <p className="text-sm text-[#94A3B8]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Apply CTA */}
        <div className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8 text-center mb-16" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}>
          <h2 className="font-mono font-bold text-xl mb-2">Ready to apply?</h2>
          <p className="text-sm text-[#94A3B8] mb-6">We approve applications within 48 hours. No minimum audience required.</p>
          <Link href="/contact?subject=affiliate" className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-semibold text-sm transition-colors">
            Apply now
          </Link>
        </div>

        {/* FAQ */}
        <h2 className="font-mono font-bold text-xl mb-6">FAQ</h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-[#1E293B] pb-4 last:border-0">
              <p className="font-mono font-semibold text-sm mb-1">{f.q}</p>
              <p className="text-sm text-[#94A3B8]" dangerouslySetInnerHTML={{ __html: f.a }} />
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
