import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "./_components/SiteNav";
import { SiteFooter } from "./_components/SiteFooter";
import { PlanCTA } from "./_components/PlanCTA";
import { LiveActivity } from "./_components/LiveActivity";

export const metadata: Metadata = {
  title: "Thynkk — Thynkk before you build",
  description: "Turn Reddit into a market research engine. Surface pain points, validate ideas, and discover trending niches — before your competitors do. Free to try.",
  alternates: { canonical: "https://thynkk.co" },
  openGraph: {
    title: "Thynkk — Thynkk before you build",
    description: "Turn Reddit into a market research engine. Surface pain points, validate ideas, and discover trending niches — before your competitors do.",
    url: "https://thynkk.co",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <LiveActivity />
          <h1 className="font-mono text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Thynkk before<br />
            <span className="text-gradient">you build.</span>
          </h1>
          <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed">
            Thynkk scans Reddit to surface what people are struggling with, asking for,
            and willing to pay for — ranked by demand, backed by real evidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link href="/dashboard" className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3.5 rounded-md font-semibold transition-all" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}>
              Scan a niche for free
            </Link>
            <Link href="/dashboard?mode=radar" className="border border-[#1E293B] hover:border-[#6366F1] text-[#F8FAFC] px-8 py-3.5 rounded-md font-semibold transition-all">
              Explore Trend Radar
            </Link>
          </div>
          <p className="text-sm text-[#94A3B8]">Free forever · No credit card</p>
        </div>
      </section>

      {/* Two modes */}
      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">Two modes</p>
          <h2 className="font-mono text-3xl font-bold text-center mb-12">Validate ideas. Discover niches.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0E1223] border border-[#1E293B] hover:border-[#6366F1] rounded-lg p-8 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#6366F1]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest">Mode 1</p>
                  <h3 className="font-mono font-bold text-lg">Pain Point Scanner</h3>
                </div>
              </div>
              <p className="text-[#94A3B8] text-sm mb-6">Enter a niche or subreddit. Get ranked pain points with real quotes and demand scores. Thynkk before you build.</p>
              <div className="bg-[#1A1E2F] rounded-md p-4 font-mono text-sm space-y-2.5">
                <div className="flex justify-between text-[10px] text-[#94A3B8] pb-2 border-b border-[#1E293B] uppercase">
                  <span>Theme</span><span>Demand</span>
                </div>
                {[
                  { name: "Manual invoicing pain", score: 94 },
                  { name: "Client no-show problem", score: 78 },
                  { name: "Cash flow visibility", score: 61 },
                ].map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <div className="flex-1 text-xs text-[#F8FAFC] truncate">{t.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${t.score}%`, opacity: 1 - i * 0.25 }} />
                      </div>
                      <span className="text-xs text-[#94A3B8] w-5 text-right">{t.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0E1223] border border-[#1E293B] hover:border-[#22C55E] rounded-lg p-8 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#22C55E]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-[#22C55E] uppercase tracking-widest">Mode 2</p>
                  <h3 className="font-mono font-bold text-lg">Trend Radar</h3>
                </div>
              </div>
              <p className="text-[#94A3B8] text-sm mb-6">No input needed. Thynkk detects niches gaining momentum on Reddit right now. Find your next idea before competitors do.</p>
              <div className="bg-[#1A1E2F] rounded-md p-4 font-mono text-sm space-y-3">
                {[
                  { niche: "AI meeting tools", growth: "+340%", tag: "HOT" },
                  { niche: "Solo founder ops", growth: "+180%", tag: "RISING" },
                  { niche: "B2B cold outreach", growth: "+95%", tag: "NEW" },
                ].map((t) => (
                  <div key={t.niche} className="flex items-center justify-between">
                    <span className="text-xs text-[#F8FAFC]">{t.niche}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#22C55E] font-mono">{t.growth}</span>
                      <span className="text-[10px] bg-[#22C55E]/15 text-[#22C55E] px-1.5 py-0.5 rounded font-mono border border-[#22C55E]/20">{t.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-t border-[#1E293B]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "50K+", label: "Posts analyzed" },
            { value: "$0.05", label: "Cost per scan" },
            { value: "2 min", label: "Avg scan time" },
            { value: "10x", label: "Faster than manual" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono text-3xl font-bold text-[#6366F1] mb-1">{s.value}</div>
              <div className="text-sm text-[#94A3B8]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">Pricing</p>
          <h2 className="font-mono text-3xl font-bold text-center mb-12">Simple. No tricks.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
              <h3 className="font-mono font-bold text-xl mb-1">Free</h3>
              <p className="text-[#94A3B8] text-sm mb-6">Forever. No card needed.</p>
              <div className="font-mono text-4xl font-bold mb-8">$0</div>
              <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
                {["1 free scan", "Top 3 pain-point themes", "Top 3 trending niches", "Source quotes + links"].map((f) => (
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
              <p className="text-[#94A3B8] text-sm mb-6">Everything, unlocked.</p>
              <div className="font-mono text-4xl font-bold mb-8">
                $19<span className="text-lg text-[#94A3B8] font-normal">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
                {["50 scans per month", "Full pain-point reports", "Full Trend Radar feed", "CSV + PDF exports", "Saved searches", "Weekly digest emails"].map((f) => (
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

      {/* Final CTA */}
      <section className="py-24 px-6 border-t border-[#1E293B]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono text-4xl font-bold mb-4">
            Stop guessing.<br /><span className="text-gradient">Start knowing.</span>
          </h2>
          <p className="text-[#94A3B8] mb-8">Your next product idea is already on Reddit. Thynkk finds it.</p>
          <Link href="/dashboard" className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-10 py-3.5 rounded-md font-semibold transition-all" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}>
            Scan your first niche free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
