import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = {
  title: "Reviews — Thynkk",
  description: "What founders and marketers say about Thynkk.",
};

const REVIEWS = [
  {
    quote: "I found my next SaaS idea in 8 minutes. The demand scores actually match what I see when I talk to users — I wish I had this two years ago.",
    name: "Marcus T.",
    role: "Indie hacker, $12k MRR",
    tag: "Pain Point Scanner",
  },
  {
    quote: "The Trend Radar caught 'AI meeting tools' as HOT before it blew up on Twitter. I built a landing page that week and got 200 signups before writing a line of code.",
    name: "Priya S.",
    role: "Solo founder",
    tag: "Trend Radar",
  },
  {
    quote: "GummySearch is the only comparable tool and it&apos;s $79/mo. Thynkk gives me more actionable output for a quarter of the price.",
    name: "Daniel K.",
    role: "Product marketer",
    tag: "Pricing",
  },
  {
    quote: "I use it for content strategy. The quotes are gold — real things real people said, with links back to the thread. My engagement went up 40% when I started writing to actual pain points.",
    name: "Aisha M.",
    role: "B2B content lead",
    tag: "Content",
  },
  {
    quote: "Ran a scan on r/freelance before building my invoicing tool. Three of the top five themes I found became my headline features. Product-market fit from day one.",
    name: "Tom R.",
    role: "Bootstrapped founder",
    tag: "Pain Point Scanner",
  },
  {
    quote: "The opportunity summaries are sharp. Not generic AI waffle — they actually tell you what to build and for whom. That&apos;s the bit I was doing manually for hours before.",
    name: "Lin C.",
    role: "Technical founder",
    tag: "AI Analysis",
  },
];

const TAG_COLORS: Record<string, string> = {
  "Pain Point Scanner": "bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30",
  "Trend Radar": "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
  "Pricing": "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  "Content": "bg-[#94A3B8]/15 text-[#94A3B8] border-[#94A3B8]/30",
  "AI Analysis": "bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30",
};

export default function ReviewsPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3 text-center">Reviews</p>
        <h1 className="font-mono text-4xl font-bold mb-4 text-center">What founders are saying</h1>
        <p className="text-[#94A3B8] text-center mb-16 max-w-xl mx-auto">
          Real feedback from indie hackers, founders, and marketers who thynkk before they build.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mb-16">
          {REVIEWS.map((r) => (
            <div key={r.name} className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-6 flex flex-col gap-4">
              <span className={`self-start text-[10px] font-mono px-2 py-0.5 rounded border ${TAG_COLORS[r.tag] ?? TAG_COLORS["Content"]}`}>
                {r.tag}
              </span>
              <blockquote className="text-sm text-[#CBD5E1] leading-relaxed flex-1">
                &ldquo;<span dangerouslySetInnerHTML={{ __html: r.quote }} />&rdquo;
              </blockquote>
              <div>
                <p className="font-mono text-sm font-semibold text-[#F8FAFC]">{r.name}</p>
                <p className="text-xs text-[#475569]">{r.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8 text-center" style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}>
          <p className="font-mono font-bold text-lg mb-2">Add your review</p>
          <p className="text-sm text-[#94A3B8] mb-6">Using Thynkk? We&apos;d love to hear how it&apos;s helped you.</p>
          <Link href="/contact" className="inline-block border border-[#6366F1] text-[#818CF8] hover:bg-[#6366F1] hover:text-white px-6 py-2.5 rounded-md font-medium text-sm transition-all">
            Share your story
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
