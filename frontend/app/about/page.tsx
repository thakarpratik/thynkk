import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = {
  title: "About",
  description: "Thynkk was built for founders who are tired of guessing. Learn why we turned Reddit into a market research engine and what we're building next.",
  alternates: { canonical: "https://thynkk.co/about" },
  openGraph: {
    title: "About Thynkk",
    description: "Thynkk was built for founders who are tired of guessing. Learn why we turned Reddit into a market research engine.",
    url: "https://thynkk.co/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3">About</p>
        <h1 className="font-mono text-4xl font-bold mb-6">Thynkk before you build.</h1>
        <p className="text-[#94A3B8] text-lg leading-relaxed mb-12">
          We built Thynkk because we kept making the same mistake — spending months on products nobody asked for, while the actual demand was sitting in plain sight on Reddit.
        </p>

        <div className="space-y-10 text-[#CBD5E1] leading-relaxed">
          <section>
            <h2 className="font-mono font-bold text-xl text-[#F8FAFC] mb-3">The problem we solve</h2>
            <p>
              Every day, millions of people post on Reddit about their frustrations, workarounds, and tool requests. It&apos;s the most honest market research data in the world — unfiltered, unsolicited, and freely available. But manually reading thousands of posts to find signal is brutal. Most founders skip it and build on gut instinct instead.
            </p>
            <p className="mt-3">
              Thynkk automates the hard part. You enter a niche or subreddit. We pull the posts, filter for pain-point language, cluster them with AI, score demand, and hand you a ranked report in under two minutes.
            </p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-xl text-[#F8FAFC] mb-3">Two modes, one goal</h2>
            <p>
              <span className="text-[#6366F1] font-mono">Pain Point Scanner</span> — validate a specific idea before you build it. Enter your niche, get real evidence of demand ranked by severity and engagement.
            </p>
            <p className="mt-3">
              <span className="text-[#22C55E] font-mono">Trend Radar</span> — discover your next idea before competitors do. No input needed. We monitor Reddit daily and surface niches gaining momentum right now.
            </p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-xl text-[#F8FAFC] mb-3">Who it&apos;s for</h2>
            <ul className="space-y-2 list-none">
              {[
                "Indie hackers looking for the next SaaS idea",
                "Founders validating before writing a line of code",
                "Marketers finding content angles that resonate",
                "Sales teams understanding their prospects&apos; real pain",
                "Anyone who&apos;s tired of building things nobody wants",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#6366F1] mt-1">→</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold text-xl text-[#F8FAFC] mb-3">Built lean, priced fairly</h2>
            <p>
              Thynkk is a small product built by a small team. We charge $19/month for Pro — that&apos;s it. No per-seat pricing, no usage-based gotchas, no enterprise tier that costs 10x more for the same features. We want founders to afford the research they need.
            </p>
          </section>
        </div>

        <div className="mt-16 bg-[#0E1223] border border-[#1E293B] rounded-lg p-8 text-center">
          <h2 className="font-mono font-bold text-xl mb-3">Ready to thynkk before you build?</h2>
          <p className="text-[#94A3B8] text-sm mb-6">Your first scan is free. No credit card required.</p>
          <Link href="/dashboard" className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-semibold text-sm transition-colors">
            Start scanning free
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
