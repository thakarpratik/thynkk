import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "./_components/SiteNav";
import { SiteFooter } from "./_components/SiteFooter";
import { PlanCTA } from "./_components/PlanCTA";
import { LiveActivity } from "./_components/LiveActivity";
import { HeroCTA } from "./_components/HeroCTA";
import { HeroSaturationInput } from "./_components/HeroSaturationInput";
import { DemoVideo } from "./_components/DemoVideo";
import { PACK_FEATURE_LIST, PACK_NAME, PACK_PRICE_USD } from "./_lib/pricing";

export const metadata: Metadata = {
  title: "Thynkk — First Reddit traffic for new websites",
  description:
    "Just launched and invisible? Thynkk finds niche Reddit threads where people already want what you sell — and drafts replies so you get intent traffic without ads or waiting on SEO. Still choosing a niche? Calculate a saturation go / no-go score.",
  alternates: { canonical: "https://thynkk.co" },
  openGraph: {
    title: "Thynkk — First Reddit traffic for new websites",
    description:
      "Paste your URL for Reddit threads — or calculate niche saturation before you build.",
    url: "https://thynkk.co",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      {/* —— HERO —— */}
      <section className="pt-40 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <LiveActivity />
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-4">
            Don&apos;t build blind. Don&apos;t launch quiet.
          </p>
          <h1 className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your first visitors
            <br />
            <span className="text-gradient">won&apos;t come from Google.</span>
          </h1>
          <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto mb-4 leading-relaxed">
            Already shipped? Find niche Reddit threads. Still choosing? Calculate a
            saturation score and make a go / no-go call.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-2">
            <a
              href="#explore-reddit"
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-6 py-3 rounded-md font-semibold text-sm transition-all"
              style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
            >
              I already shipped
            </a>
            <a
              href="#check-saturation"
              className="border border-[#1E293B] hover:border-[#22C55E] text-[#F8FAFC] px-6 py-3 rounded-md font-semibold text-sm transition-all"
            >
              Still picking a niche
            </a>
          </div>
          <p className="mt-6">
            <a
              href="#see-how-it-works"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#0E1223] text-[#6366F1]">
                ▶
              </span>
              See how Reddit scan works
            </a>
          </p>
        </div>
      </section>

      {/* —— DUAL DOORS —— */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Section 1 — Reddit / live site */}
          <div
            id="explore-reddit"
            className="scroll-mt-28 bg-[#0E1223] border border-[#6366F1]/40 rounded-xl p-6 sm:p-8"
          >
            <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-2">
              1 · Site is live
            </p>
            <h2 className="font-mono text-xl sm:text-2xl font-bold mb-2">
              Explore Reddit
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              Paste your URL. We find niche threads, rank them, and draft replies —
              traffic in days, not months of SEO.
            </p>
            <HeroCTA />
          </div>

          {/* Section 2 — Saturation / pre-launch */}
          <div
            id="check-saturation"
            className="scroll-mt-28 bg-[#0E1223] border border-[#22C55E]/35 rounded-xl p-6 sm:p-8"
          >
            <p className="text-[10px] font-mono text-[#22C55E] uppercase tracking-widest mb-2">
              2 · Still choosing
            </p>
            <h2 className="font-mono text-xl sm:text-2xl font-bold mb-2">
              Saturation Score
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              Enter an idea or niche. Get a 0–100 score and a clear{" "}
              <span className="text-[#F8FAFC]">Go / Caution / No-go</span> before you
              build.
            </p>
            <HeroSaturationInput />
          </div>
        </div>
        <p className="text-center text-xs text-[#64748B] mt-6 font-mono max-w-xl mx-auto">
          Same founder journey. Different stage. Reddit scan does not show idea
          saturation — and saturation does not require a live URL.
        </p>
      </section>

      {/* —— DEMO —— */}
      <section
        id="see-how-it-works"
        className="scroll-mt-24 py-16 px-6 border-t border-[#1E293B]"
      >
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            See how it works
          </p>
          <h2 className="font-mono text-3xl font-bold text-center mb-3">
            From URL to Reddit traffic — in one scan
          </h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-xl mx-auto mb-10 leading-relaxed">
            Watch how Thynkk turns a new site into ranked niche threads and copy-ready
            replies — without hours of scrolling.
          </p>
          <DemoVideo />
        </div>
      </section>

      {/* —— WHO IT'S FOR —— */}
      <section className="py-16 px-6 border-t border-[#1E293B]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            Built for
          </p>
          <h2 className="font-mono text-3xl font-bold text-center mb-4">
            When you just shipped — and nobody knows
          </h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-2xl mx-auto mb-12 leading-relaxed">
            Thynkk is distribution for week 1–12: website owners, indie launches, and
            side projects that need real visitors before SEO or brand catch up.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "New website owners",
                desc: "Site is live. Google ignores you. Get your first waves of traffic from people already searching for a fix.",
              },
              {
                title: "Product launches",
                desc: "Don’t bet everything on one launch post. Join niche threads the same week you ship.",
              },
              {
                title: "Solo founders",
                desc: "No growth hire. No ad budget. 20 minutes of good replies beats 5 hours of lurking.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-6"
              >
                <h3 className="font-mono font-bold text-base mb-2 text-[#F8FAFC]">
                  {card.title}
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— PROBLEM / INSIGHT —— */}
      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            The insight
          </p>
          <h2 className="font-mono text-3xl font-bold text-center mb-4">
            Stop launch-posting. Start replying to demand.
          </h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-2xl mx-auto mb-12 leading-relaxed">
            On Reddit, traffic comes from joining conversations where people already want
            help — not from announcing your homepage into the void.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
              <p className="text-xs font-mono text-[#EF4444] uppercase tracking-widest mb-4">
                What usually fails
              </p>
              <ul className="space-y-3 text-sm text-[#94A3B8]">
                {[
                  "“We just launched” posts that get ignored or removed",
                  "Waiting on SEO while the site sits at zero traffic",
                  "Scrolling mega-subs for hours and still missing niche threads",
                  "Blank reply box — or a spammy link dump that kills trust",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[#EF4444] shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8"
              style={{ boxShadow: "0 0 24px rgba(99,102,241,0.12)" }}
            >
              <p className="text-xs font-mono text-[#22C55E] uppercase tracking-widest mb-4">
                What actually works
              </p>
              <ul className="space-y-3 text-sm text-[#94A3B8]">
                {[
                  "Niche threads where people ask for recommendations",
                  "Value-first replies (then a natural product mention)",
                  "Your own posts in the right communities — not link spam",
                  "Minutes of focused commenting instead of endless lurking",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[#22C55E] shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            How Thynkk helps
          </p>
          <h2 className="font-mono text-3xl font-bold text-center mb-4">
            Find niche threads. Reply. Get traffic.
          </h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-xl mx-auto mb-12 leading-relaxed">
            Same Reddit strategy that works for founders — without the hunting. Paste your
            URL and get a playbook for this week’s distribution.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Paste your URL",
                desc: "We read your product, niche, and audience — so search matches what you sell, not random keywords.",
                color: "#6366F1",
              },
              {
                step: "02",
                title: "Get niche threads",
                desc: "Ranked Reddit conversations where your product fits — plus promo-risk so you don’t get banned for being salesy.",
                color: "#818CF8",
              },
              {
                step: "03",
                title: "Reply or create posts",
                desc: "Copy-ready comment drafts and new post ideas. Join demand, or start the right thread yourself.",
                color: "#22C55E",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8"
              >
                <p className="text-xs font-mono mb-3" style={{ color: item.color }}>
                  {item.step}
                </p>
                <h3 className="font-mono font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— SAMPLE OUTPUT —— */}
      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            What you get in ~60 seconds
          </p>
          <h2 className="font-mono text-2xl font-bold text-center mb-3">
            Not vanity clicks — intent traffic
          </h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            Real niche threads. Reply drafts for comments. New posts for your own threads.
            The kind of Reddit traffic that converts because people already have the problem.
          </p>
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-6 font-mono text-sm space-y-4">
            {[
              {
                label: "Reply to thread",
                text: "What tool do you use for launch videos?",
                meta: "niche rec thread · safe to mention product",
              },
              {
                label: "Reply draft",
                text: "I had the same problem — short-form was eating my weekends. What worked was batching hooks first, then filming in one sitting…",
                meta: "copy as a comment · edit in your voice",
              },
              {
                label: "Create new post",
                text: "How I got my first 50 users without paid ads",
                meta: "your own thread · title + body ready to paste",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="border-b border-[#1E293B] pb-4 last:border-0 last:pb-0"
              >
                <p className="text-[10px] text-[#6366F1] uppercase tracking-widest mb-1">
                  {row.label}
                </p>
                <p className="text-[#F8FAFC] text-xs leading-relaxed">{row.text}</p>
                <p className="text-[10px] text-[#475569] mt-1">{row.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— VS ALTERNATIVES —— */}
      <section className="py-16 px-6 border-t border-[#1E293B]">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            Why not just…
          </p>
          <h2 className="font-mono text-2xl font-bold text-center mb-10">
            Pick the right tool for the stage
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              {
                alt: "SEO",
                line: "Compounds later. Thynkk is traffic this week — while Google is still ignoring a brand-new site.",
              },
              {
                alt: "Ads",
                line: "Fine when you know CAC. Until then, join free high-intent threads instead of buying cold clicks.",
              },
              {
                alt: "Manual Reddit",
                line: "Same strategy. Thynkk removes the hunt — ranked threads + drafts from your URL in ~60s.",
              },
            ].map((row) => (
              <div
                key={row.alt}
                className="rounded-lg border border-[#1E293B] bg-[#0E1223] p-5"
              >
                <p className="font-mono text-xs text-[#6366F1] uppercase tracking-widest mb-2">
                  vs {row.alt}
                </p>
                <p className="text-[#94A3B8] leading-relaxed">{row.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— STATS —— */}
      <section className="py-16 px-6 border-t border-[#1E293B]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "Days", label: "Not months to first traffic" },
            { value: "60s", label: "Per site scan" },
            { value: "Niche", label: "Threads, not mega-spam" },
            { value: "Intent", label: "Buyers already asking" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono text-3xl font-bold text-[#6366F1] mb-1">
                {s.value}
              </div>
              <div className="text-sm text-[#94A3B8]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* —— PRICING —— */}
      <section className="py-20 px-6 border-t border-[#1E293B]">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-mono text-[#6366F1] mb-3 uppercase tracking-widest">
            Pricing
          </p>
          <h2 className="font-mono text-3xl font-bold text-center mb-3">
            Start free. Pay when you need more scans.
          </h2>
          <p className="text-center text-[#94A3B8] text-sm max-w-lg mx-auto mb-12 leading-relaxed">
            No subscription. Built for founders who need a launch playbook, not another
            monthly bill.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-8">
              <h3 className="font-mono font-bold text-xl mb-1">Free</h3>
              <p className="text-[#94A3B8] text-sm mb-6">
                One complete report for your site.
              </p>
              <div className="font-mono text-4xl font-bold mb-8">$0</div>
              <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
                {[
                  "1 full site scan",
                  "All ranked threads + communities",
                  "Full copy-ready reply drafts",
                  "All post ideas with drafts",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#22C55E] shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
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
                FOR LAUNCHES
              </div>
              <h3 className="font-mono font-bold text-xl mb-1">{PACK_NAME}</h3>
              <p className="text-[#94A3B8] text-sm mb-6">
                Full reports for launch week and beyond.
              </p>
              <div className="font-mono text-4xl font-bold mb-8">
                ${PACK_PRICE_USD}
                <span className="text-lg text-[#94A3B8] font-normal"> once</span>
              </div>
              <ul className="space-y-3 text-sm text-[#94A3B8] mb-8">
                {PACK_FEATURE_LIST.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#22C55E] shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
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

      {/* —— FINAL CTA —— */}
      <section className="py-24 px-6 border-t border-[#1E293B]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono text-3xl sm:text-4xl font-bold mb-4">
            Ship the site.
            <br />
            <span className="text-gradient">Then find where buyers already are.</span>
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto leading-relaxed">
            Paste your URL. Get niche Reddit threads and reply drafts in about a minute —
            fair, high-intent distribution for people willing to help in the comments.
          </p>
          <HeroCTA />
          <p className="mt-6 text-xs text-[#64748B]">
            Prefer the long version?{" "}
            <Link
              href="/why-reddit-works"
              className="text-[#6366F1] hover:underline"
            >
              Why Reddit works for new sites →
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
