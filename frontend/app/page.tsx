import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "./_components/SiteNav";
import { SiteFooter } from "./_components/SiteFooter";
import { PlanCTA } from "./_components/PlanCTA";
import { LiveActivity } from "./_components/LiveActivity";
import { HeroScanInput } from "./_components/HeroScanInput";

export const metadata: Metadata = {
  title: "Thynkk — Targeted Organic Traffic for Indie Founders",
  description: "Thynkk helps you get targeted traffic the organic, legit way — by joining real community discussions, not spamming links. Paste your site for reply drafts and post ideas.",
  alternates: { canonical: "https://thynkk.co" },
  openGraph: {
    title: "Thynkk — Targeted Organic Traffic for Indie Founders",
    description: "Get targeted traffic organically. Find conversations worth joining. Copy reply drafts and post ideas — no spam, no ads.",
    url: "https://thynkk.co",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <LiveActivity />
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-4">Targeted traffic · Organic · Legit</p>
          <h1 className="font-mono text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Stop launching into<br />
            <span className="text-gradient">silence.</span>
          </h1>
          <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto mb-4 leading-relaxed">
            Thynkk is your tool to get <span className="text-[#F8FAFC]">targeted traffic</span> — the organic, legit way. No paid ads. No spam blasts.
          </p>
          <p className="text-base text-[#64748B] max-w-xl mx-auto mb-10 leading-relaxed">
            Paste your website and we&apos;ll find the discussions your ideal customers are already having — with reply drafts and post ideas you can use today.
          </p>
          <div className="mb-4">
            <HeroScanInput />
          </div>
          <p className="text-sm text-[#94A3B8]">Free scan · No credit card</p>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">How it works</p>
          <h2 className="font-mono text-3xl font-bold text-center mb-4">How you get targeted traffic — without ads</h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-xl mx-auto mb-12 leading-relaxed">
            Show up where your audience already talks. Add value first. Let the right people discover you naturally.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Paste your URL", desc: "We learn your product, niche, and who you need to reach.", color: "#6366F1" },
              { step: "02", title: "Find live threads", desc: "We surface community discussions where your product genuinely fits.", color: "#818CF8" },
              { step: "03", title: "Get copy-ready drafts", desc: "Helpful replies and post ideas — organic reach, not link-dropping.", color: "#22C55E" },
            ].map((item) => (
              <div key={item.step} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
                <p className="text-xs font-mono mb-3" style={{ color: item.color }}>{item.step}</p>
                <h3 className="font-mono font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-[#94A3B8] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">What targeted traffic looks like</p>
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-6 font-mono text-sm space-y-4">
            {[
              { label: "Thread", text: "What tool do you use for launch videos?", meta: "recommendation · low promo risk" },
              { label: "Reply draft", text: "I had the same problem — short-form was eating my weekends. What worked was batching hooks first, then filming in one sitting…", meta: "copy-ready" },
              { label: "Post idea", text: "How I got my first 50 users without paid ads", meta: "r/indiehackers" },
            ].map((row) => (
              <div key={row.label} className="border-b border-[#1E293B] pb-4 last:border-0 last:pb-0">
                <p className="text-[10px] text-[#6366F1] uppercase tracking-widest mb-1">{row.label}</p>
                <p className="text-[#F8FAFC] text-xs leading-relaxed">{row.text}</p>
                <p className="text-[10px] text-[#475569] mt-1">{row.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-[#1E293B]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "100%", label: "Organic traffic" },
            { value: "10+", label: "Threads to join" },
            { value: "60s", label: "Avg scan time" },
            { value: "0", label: "Spam posts sent" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono text-3xl font-bold text-[#6366F1] mb-1">{s.value}</div>
              <div className="text-sm text-[#94A3B8]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">Pricing</p>
          <h2 className="font-mono text-3xl font-bold text-center mb-12">Simple. No tricks.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
              <h3 className="font-mono font-bold text-xl mb-1">Free</h3>
              <p className="text-[#94A3B8] text-sm mb-6">Try it on your site.</p>
              <div className="font-mono text-4xl font-bold mb-8">$0</div>
              <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
                {["1 site scan", "Top 3 threads to answer", "1 post idea", "Reply draft preview"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#22C55E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <PlanCTA plan="free" />
            </div>
            <div className="bg-[#0E1223] border border-[#6366F1] rounded-lg p-8 relative" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}>
              <div className="absolute -top-3 left-6 bg-[#6366F1] text-white text-xs font-mono px-3 py-1 rounded-full">MOST POPULAR</div>
              <h3 className="font-mono font-bold text-xl mb-1">Pro</h3>
              <p className="text-[#94A3B8] text-sm mb-6">Full growth reports.</p>
              <div className="font-mono text-4xl font-bold mb-8">
                $19<span className="text-lg text-[#94A3B8] font-normal">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
                {["50 site scans per month", "All threads + full reply drafts", "All post ideas", "Promo-risk scoring", "Priority processing"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#22C55E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <PlanCTA plan="pro" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-[#1E293B]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono text-4xl font-bold mb-4">
            Your next customers are already talking.<br /><span className="text-gradient">Reach them the right way.</span>
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto leading-relaxed">
            Start getting targeted, organic traffic today. Paste your site — threads, reply drafts, and post ideas in about a minute.
          </p>
          <div className="max-w-xl mx-auto">
            <HeroScanInput />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}