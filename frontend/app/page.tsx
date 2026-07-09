import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "./_components/SiteNav";
import { SiteFooter } from "./_components/SiteFooter";
import { PlanCTA } from "./_components/PlanCTA";
import { LiveActivity } from "./_components/LiveActivity";
import { HeroCTA } from "./_components/HeroCTA";
import { WaitlistForm } from "./_components/WaitlistForm";

export const metadata: Metadata = {
  title: "Thynkk — Reddit Traffic Without the Hours of Grinding",
  description: "Stop spending hours scanning Reddit, hunting threads, and writing replies. Thynkk finds the conversations, drafts your responses, and helps you get real targeted traffic — the organic way.",
  alternates: { canonical: "https://thynkk.co" },
  openGraph: {
    title: "Thynkk — Reddit Traffic Without the Hours of Grinding",
    description: "Hours of Reddit scanning → one-minute scan. Find threads, copy reply drafts, get targeted organic traffic. Reddit is the real deal.",
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
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-4">Invite-only beta · Rolling access</p>
          <h1 className="font-mono text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Hours of scanning.<br />
            <span className="text-gradient">Done in 60 seconds.</span>
          </h1>
          <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto mb-4 leading-relaxed">
            You know Reddit works — but finding the right threads, writing replies, and showing up consistently eats <span className="text-[#F8FAFC]">hours every week</span>. Thynkk does the grind for you.
          </p>
          <p className="text-base text-[#64748B] max-w-xl mx-auto mb-10 leading-relaxed">
            Request access with your email. We find the threads, draft the replies, and save you hours every week.
          </p>
          <HeroCTA />
        </div>
      </section>

      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">What you&apos;re replacing</p>
          <h2 className="font-mono text-3xl font-bold text-center mb-4">The manual grind vs. one scan</h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-2xl mx-auto mb-12 leading-relaxed">
            Most founders spend 3–5 hours a week scrolling subreddits, searching for threads, and staring at a blank reply box. Thynkk compresses that into a single scan.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
              <p className="text-xs font-mono text-[#EF4444] uppercase tracking-widest mb-4">The old way</p>
              <ul className="space-y-3 text-sm text-[#94A3B8]">
                {[
                  "Scroll r/indiehackers, r/SaaS, r/entrepreneur for hours",
                  "Ctrl+F and hope you find a relevant thread",
                  "Write replies from scratch — or skip and lose the lead",
                  "Repeat tomorrow. And the next day.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[#EF4444] shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.12)" }}>
              <p className="text-xs font-mono text-[#22C55E] uppercase tracking-widest mb-4">With Thynkk</p>
              <ul className="space-y-3 text-sm text-[#94A3B8]">
                {[
                  "Paste your URL — we read your product and niche",
                  "Get ranked threads where your product actually fits",
                  "Copy reply drafts and post ideas, ready to go",
                  "Show up in minutes, not hours",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[#22C55E] shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">How it works</p>
          <h2 className="font-mono text-3xl font-bold text-center mb-4">Find. Reply. Get traffic.</h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-xl mx-auto mb-12 leading-relaxed">
            Reddit traffic is the real deal — people asking for recommendations, comparing tools, and ready to buy. Thynkk finds those moments for you.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Paste your URL", desc: "We learn your product and who you need to reach — no manual research.", color: "#6366F1" },
              { step: "02", title: "We find the threads", desc: "Skip hours of scrolling. Get ranked Reddit discussions where you can add real value.", color: "#818CF8" },
              { step: "03", title: "Copy & reply", desc: "Drafted replies and post ideas you paste in — targeted traffic without the grind.", color: "#22C55E" },
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
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">What you get in ~60 seconds</p>
          <p className="text-center text-[#94A3B8] text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            Real threads. Real reply drafts. The kind of Reddit traffic that actually converts — not vanity clicks.
          </p>
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
            { value: "5+ hrs", label: "Saved per week" },
            { value: "60s", label: "Not hours scanning" },
            { value: "10+", label: "Threads ranked" },
            { value: "Real", label: "Reddit traffic" },
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
            Reddit traffic works.<br /><span className="text-gradient">Stop grinding for it.</span>
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto leading-relaxed">
            Enter your email. If a spot opens up, you&apos;re in — then straight to your first scan.
          </p>
          <WaitlistForm source="homepage-footer" variant="footer" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}