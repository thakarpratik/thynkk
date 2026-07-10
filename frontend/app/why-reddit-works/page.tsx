import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata: Metadata = {
  title: "Why Reddit Works for Early Traffic",
  description:
    "Why Reddit is one of the highest-intent channels for new websites: real demand, long-form intent, and conversations where buyers already talk. How Thynkk helps you show up there.",
  alternates: { canonical: "https://thynkk.co/why-reddit-works" },
  openGraph: {
    title: "Why Reddit Works — Thynkk",
    description:
      "New site, no traffic? Reddit is where buyers already ask for solutions. Stats, reasons, and how Thynkk helps you join the right conversations.",
    url: "https://thynkk.co/why-reddit-works",
  },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono font-bold text-xl text-[#F8FAFC]">{title}</h2>
      <div className="text-[#CBD5E1] text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

const STATS = [
  {
    value: "1B+",
    label: "Weekly active users",
    sub: "Reddit’s reported scale — a global attention market",
  },
  {
    value: "High intent",
    label: "Research before buy",
    sub: "People ask for tools, alternatives, and recommendations in public",
  },
  {
    value: "Long form",
    label: "Real problem language",
    sub: "Threads explain pain in the user’s words — not ad copy",
  },
  {
    value: "Evergreen",
    label: "Threads keep ranking",
    sub: "Good answers can send traffic for months after you post",
  },
];

const REASONS = [
  {
    title: "Demand already exists",
    body: "You don’t have to manufacture interest. On Reddit, people post “what should I use for X?”, “alternative to Y?”, and “stuck with Z.” That’s inbound demand written in plain language.",
  },
  {
    title: "Trust beats ads",
    body: "A helpful reply from a real person often outperforms a polished ad — especially for indie tools and early-stage products. Context + usefulness wins. Link dumps lose.",
  },
  {
    title: "Faster than SEO for new domains",
    body: "Brand-new sites rarely rank in week one. Reddit doesn’t care how old your domain is. If you add value in the right thread, you can earn clicks the same day.",
  },
  {
    title: "Niche communities compound",
    body: "r/SaaS, r/indiehackers, r/Entrepreneur, vertical subs for design, finance, health, dev tools — each is a room full of people already self-selecting by interest.",
  },
  {
    title: "Language you can steal",
    body: "The best landing-page copy is often sitting in a thread. Titles, objections, and feature requests show up as comments. Reddit is free voice-of-customer research.",
  },
  {
    title: "Compounding content",
    body: "One strong answer can outlive a tweet by months. Search engines and Reddit’s own search keep resurfacing useful threads — and your name stays attached to the help.",
  },
];

const MYTHS = [
  {
    myth: "“Reddit hates marketing.”",
    truth: "Reddit hates lazy marketing. Value-first replies, honest experience, and no hard sell in the first line still work — and get upvoted.",
  },
  {
    myth: "“I just need to post my launch link.”",
    truth: "Launch posts spike then die. Joining ongoing buyer questions is a system, not a one-day event.",
  },
  {
    myth: "“I’ll wait for Google.”",
    truth: "SEO is real — and slow for new domains. Reddit is a parallel channel while indexation and authority catch up.",
  },
  {
    myth: "“I don’t have time to scroll.”",
    truth: "Fair. Manual hunting is the bottleneck. That’s exactly why Thynkk finds threads from your site URL and drafts replies for you.",
  },
];

const PLAYBOOK = [
  { step: "01", title: "Paste your URL", body: "Thynkk reads your product, niche, and audience from the site — no keyword research homework." },
  { step: "02", title: "Get ranked threads", body: "See Reddit conversations that actually fit what you sell — not random noise." },
  { step: "03", title: "Copy a human reply", body: "Drafts sound like you: helpful first, product second, low promo risk called out." },
  { step: "04", title: "Show up consistently", body: "Traffic compounds when you join real conversations weekly — not when you blast one launch post." },
];

export default function WhyRedditWorksPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24 space-y-14">
        <div>
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3">
            Why Reddit Works
          </p>
          <h1 className="font-mono text-4xl md:text-5xl font-bold mb-5 leading-tight">
            New website. No traffic.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] to-[#6366F1]">
              Buyers are already talking.
            </span>
          </h1>
          <p className="text-[#94A3B8] text-lg leading-relaxed max-w-2xl">
            Most launches fail distribution, not product. Reddit is one of the few places where people
            publicly ask for recommendations, alternatives, and fixes — in long form, with intent.
            Thynkk exists so you can show up there without living in the scroll.
          </p>
        </div>

        {/* Stats */}
        <Section title="Why the channel matters">
          <p>
            You don’t need Reddit to be your only channel. You need one place where demand is already
            loud while SEO, ads, and brand still ramp. Reddit fits that job unusually well.
          </p>
          <div className="grid grid-cols-2 gap-3 not-prose pt-1">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5"
              >
                <p className="font-mono font-bold text-2xl text-[#F8FAFC] mb-1">{s.value}</p>
                <p className="text-xs font-mono text-[#6366F1] mb-1.5 uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-xs text-[#64748B] leading-relaxed">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#475569] font-mono">
            Scale figures are directional / platform-reported; intent points are behavioral patterns
            founders see across product communities.
          </p>
        </Section>

        {/* Launched but dead */}
        <Section title="The “launched but dead” problem">
          <p>
            You shipped. Analytics show a handful of visits — mostly you and friends. Search Console is
            empty. Posting “we launched!” once feels good for a day and then silence returns.
          </p>
          <div className="grid md:grid-cols-2 gap-3 not-prose">
            <div className="bg-[#0E1223] border border-[#EF4444]/25 rounded-lg p-5">
              <p className="text-xs font-mono text-[#EF4444] uppercase tracking-widest mb-3">
                Common week-1 plan
              </p>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                {[
                  "Wait for SEO (months on a new domain)",
                  "One launch post on social",
                  "Hope Product Hunt carries the week",
                  "Drop the URL in random subreddits",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#EF4444] shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-5"
              style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}
            >
              <p className="text-xs font-mono text-[#22C55E] uppercase tracking-widest mb-3">
                What actually moves early traffic
              </p>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                {[
                  "Find threads with buying / advice intent",
                  "Answer the specific problem first",
                  "Earn attention before you link",
                  "Repeat weekly in the right communities",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#22C55E] shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Reasons */}
        <Section title="Six reasons Reddit works for new sites">
          <div className="space-y-3 not-prose">
            {REASONS.map((r, i) => (
              <div
                key={r.title}
                className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5 flex gap-4"
              >
                <span className="font-mono text-xs text-[#6366F1] shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-mono font-semibold text-[#F8FAFC] mb-1.5">{r.title}</p>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Myths */}
        <Section title="Myths that keep founders offline">
          <div className="space-y-3 not-prose">
            {MYTHS.map((m) => (
              <div key={m.myth} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5">
                <p className="font-mono text-sm text-[#F59E0B] mb-2">{m.myth}</p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{m.truth}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* What good looks like */}
        <Section title="What “good Reddit traffic” looks like">
          <p>It’s not a viral meme. It’s a handful of high-intent visits that convert.</p>
          <div className="grid sm:grid-cols-3 gap-3 not-prose">
            {[
              { k: "Thread type", v: "“What do you use for…?” / alternatives / stuck with workflow" },
              { k: "Your move", v: "Specific answer → optional soft mention only if it fits" },
              { k: "Outcome", v: "Profile clicks, site visits, signups from people mid-decision" },
            ].map((x) => (
              <div key={x.k} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-4">
                <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-2">
                  {x.k}
                </p>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">{x.v}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* How Thynkk helps */}
        <Section title="How Thynkk makes Reddit usable">
          <p>
            The strategy is simple. The bottleneck is time: finding the right threads before they die,
            and writing replies that don’t sound like ads. Thynkk compresses that into one scan.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 not-prose">
            {PLAYBOOK.map((p) => (
              <div key={p.step} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5">
                <p className="text-xs font-mono text-[#6366F1] mb-2">{p.step}</p>
                <p className="font-mono font-semibold text-[#F8FAFC] mb-1.5">{p.title}</p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <p>
            In one line:{" "}
            <span className="text-[#F8FAFC]">
              Thynkk reads your site, finds the Reddit conversations worth joining, and writes what
              you&apos;d say — so you show up where buyers are already talking.
            </span>
          </p>
        </Section>

        {/* CTA */}
        <div
          className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8 text-center"
          style={{ boxShadow: "0 0 32px rgba(99,102,241,0.12)" }}
        >
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-2">
            Ready to stop lurking
          </p>
          <h2 className="font-mono font-bold text-2xl mb-3">
            Turn Reddit into your first real traffic channel
          </h2>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Paste your URL. Get ranked threads and copy-ready reply drafts in about a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-semibold text-sm transition-colors"
            >
              Start free scan
            </Link>
            <Link
              href="/case-studies"
              className="inline-block border border-[#1E293B] hover:border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] px-8 py-3 rounded-md font-medium text-sm transition-colors"
            >
              See case studies
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#475569] font-mono">
          Also read{" "}
          <Link href="/methodology" className="text-[#64748B] hover:text-[#94A3B8] underline-offset-2 hover:underline">
            Methodology
          </Link>{" "}
          ·{" "}
          <Link href="/pricing" className="text-[#64748B] hover:text-[#94A3B8] underline-offset-2 hover:underline">
            Pricing
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
