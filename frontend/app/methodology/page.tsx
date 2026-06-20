import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Thynkk ranks pain points and calculates demand scores from Reddit — pipeline, formula, field definitions, and what the numbers mean.",
  alternates: { canonical: "https://thynkk.co/methodology" },
  openGraph: {
    title: "Thynkk Methodology — How demand is ranked",
    description: "Transparent scoring: how Thynkk filters Reddit posts, clusters themes, and ranks demand.",
    url: "https://thynkk.co/methodology",
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

function FormulaBlock({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5 font-mono text-sm text-[#818CF8] overflow-x-auto">
      {children}
    </div>
  );
}

function FieldRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-4">
      <p className="font-mono text-sm font-semibold text-[#F8FAFC] mb-1">{name}</p>
      <p className="text-sm text-[#94A3B8] leading-relaxed">{desc}</p>
    </div>
  );
}

const PIPELINE = [
  { step: "01", label: "Harvest", body: "Pull top and recent posts from relevant subreddits." },
  { step: "02", label: "Filter", body: "Match posts against pain-point language before any AI call — cutting noise by ~90%." },
  { step: "03", label: "Cluster", body: "AI groups filtered posts into 3–8 distinct, actionable themes with representative quotes." },
  { step: "04", label: "Score", body: "Demand, severity, and verdict are calculated and themes are ranked." },
  { step: "05", label: "Present", body: "Ranked report with source links — every quote traceable to Reddit." },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24 space-y-12">
        <div>
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3">Methodology</p>
          <h1 className="font-mono text-4xl font-bold mb-4">How we rank demand</h1>
          <p className="text-[#94A3B8] text-lg leading-relaxed">
            Thynkk is not a black box. Here is how we turn Reddit posts into ranked pain-point themes —
            what the numbers mean, what is math, and what is AI judgment.
          </p>
        </div>

        <Section title="The pipeline">
          <p>Every Pain Point Scanner scan follows the same five steps:</p>
          <div className="space-y-3 not-prose">
            {PIPELINE.map((s) => (
              <div key={s.step} className="flex gap-4 bg-[#0E1223] border border-[#1E293B] rounded-lg p-4">
                <span className="font-mono text-xs text-[#6366F1] shrink-0 pt-0.5">{s.step}</span>
                <div>
                  <p className="font-mono text-sm font-semibold text-[#F8FAFC] mb-1">{s.label}</p>
                  <p className="text-sm text-[#94A3B8]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[#94A3B8]">
            We filter before we call AI. That keeps cost sane and stops generic posts from diluting your report.
          </p>
        </Section>

        <Section title="Demand score">
          <p>
            Demand is a <strong className="text-[#F8FAFC] font-normal">comparative ranking within a scan</strong> —
            not an absolute market size. A score of 94 means this theme ranked highest in <em>this</em> report,
            not that 94% of the internet wants it.
          </p>
          <FormulaBlock>
            demand = mention_count × log(1 + upvotes + comments) × recency_weight
          </FormulaBlock>
          <div className="space-y-3 not-prose">
            <FieldRow
              name="mention_count"
              desc="How many posts in the scan cluster into this theme. Assigned during AI clustering — themes with more recurring language score higher."
            />
            <FieldRow
              name="log(1 + upvotes + comments)"
              desc="Engagement on source posts linked in the theme's quotes. Log-scaled so one viral post does not dominate the ranking."
            />
            <FieldRow
              name="recency_weight"
              desc="Recent pain matters more. Weight decays linearly over 12 months: a post from today scores 1.0; a post from a year ago scores ~0.0. Older posts floor at 0.1."
            />
          </div>
        </Section>

        <Section title="Other fields">
          <div className="space-y-3 not-prose">
            <FieldRow
              name="Severity (1–10)"
              desc="AI-assessed based on emotional intensity, how often the problem appears, and how much it disrupts the person's work or life. Higher = louder, more urgent pain."
            />
            <FieldRow
              name="Verdict"
              desc="Strong signal — recurring frustration, real build opportunity. Weak signal — people vent but unlikely to pay. Already crowded — pain is real but incumbents exist and satisfaction is adequate."
            />
            <FieldRow
              name="Willingness to pay"
              desc="High, Medium, or Low — based on money language in posts: workarounds people already pay for, time wasted, or phrases like 'I'd pay for' and 'shut up and take my money.'"
            />
            <FieldRow
              name="Competition"
              desc="Whether an obvious existing tool is named in the posts, and what gap remains. 'No obvious tool' is a signal; 'FreshBooks handles this' is a warning."
            />
            <FieldRow
              name="Next step"
              desc="One concrete validation action for this week — a post to write, people to interview, or a landing page to test. Not generic advice."
            />
          </div>
        </Section>

        <Section title="Trend Radar">
          <p>
            Mode 2 works differently. No keyword input — Thynkk pulls recent post titles across tracked
            subreddits (r/entrepreneur, r/indiehackers, r/SaaS, and others), then clusters emerging topics by momentum.
          </p>
          <div className="space-y-3 not-prose">
            <FieldRow
              name="HOT"
              desc="Highest growth velocity this week. Topic volume and engagement are spiking relative to the 7-day window."
            />
            <FieldRow
              name="RISING"
              desc="Steady upward momentum — not yet peaked, but gaining posts and attention."
            />
            <FieldRow
              name="NEW"
              desc="First appearance in our radar window. Early signal — higher novelty, less historical data."
            />
          </div>
          <p className="text-[#94A3B8]">
            Trend Radar niches are sorted by tag priority (HOT → RISING → NEW), then by growth percentage within each tier.
            Run a Pain Point Scanner on the subreddit to go deeper on any niche.
          </p>
        </Section>

        <Section title="What we do not publish">
          <p>
            Transparency does not mean giving away the recipe. We keep private:
          </p>
          <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
            <li>Exact pain-phrase filter lists (tuned constantly)</li>
            <li>Full AI prompts and clustering instructions</li>
            <li>Data source and infrastructure details</li>
          </ul>
          <p>
            The formula and field definitions above are stable. The tuning behind them improves over time
            as we run more scans and refine quality.
          </p>
        </Section>

        <div
          className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8 text-center"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}
        >
          <p className="font-mono font-bold text-lg mb-2">See it in action</p>
          <p className="text-sm text-[#94A3B8] mb-6">
            Example scan outputs with demand scores, verdicts, and source quotes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/case-studies"
              className="inline-block border border-[#1E293B] hover:border-[#6366F1] text-[#F8FAFC] px-6 py-2.5 rounded-md font-medium text-sm transition-all"
            >
              Read case studies
            </Link>
            <Link
              href="/dashboard"
              className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors"
            >
              Run a scan
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}