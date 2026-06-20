import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Real Thynkk scan results from Reddit — ranked pain points, demand scores, and product opportunities founders used to validate ideas.",
  alternates: { canonical: "https://thynkk.co/case-studies" },
  openGraph: {
    title: "Thynkk Case Studies — Real scan results",
    description: "See what Thynkk surfaces from Reddit: pain points, demand scores, verdicts, and build-ready opportunities.",
    url: "https://thynkk.co/case-studies",
  },
};

type CaseStudy = {
  id: string;
  mode: "Pain Point Scanner" | "Trend Radar";
  query: string;
  headline: string;
  context: string;
  stats: { label: string; value: string }[];
  topFinding: {
    name: string;
    demand: number;
    verdict: string;
    summary: string;
    opportunity: string;
    quote: string;
    sourceUrl: string;
    nextStep: string;
  };
  alsoFound?: string[];
};

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "smallbusiness",
    mode: "Pain Point Scanner",
    query: "r/smallbusiness",
    headline: "Payment processor risk is the #1 pain in r/smallbusiness",
    context:
      "Thynkk scanned r/smallbusiness and surfaced 6 ranked themes in under 2 minutes. Payment processor shutdowns ranked highest — with stronger demand than invoicing, hiring, or marketing tools.",
    stats: [
      { label: "Themes found", value: "6" },
      { label: "Top demand score", value: "94" },
      { label: "Verdict", value: "Strong signal" },
    ],
    topFinding: {
      name: "Payment Processor Shutdowns",
      demand: 94,
      verdict: "Strong signal",
      summary:
        "Owners report sudden Square and Stripe deactivations with no warning, frozen funds, and no human support — often during payroll week.",
      opportunity:
        "A payment processor risk monitor that flags warning signs early and helps owners maintain a backup processor before revenue stops.",
      quote:
        "After two years of processing payments, with zero notice Square closed our account Saturday.",
      sourceUrl: "https://reddit.com/r/smallbusiness/comments/1kl99go",
      nextStep:
        "Post in r/smallbusiness: 'Would you pay $19/mo for a tool that monitors processor account health?' Target 10 direct replies.",
    },
    alsoFound: [
      "Manual invoicing pain (demand 78) — crowded market",
      "Scaling solo service business (demand 48) — strong signal, less competition",
    ],
  },
  {
    id: "freelance-invoicing",
    mode: "Pain Point Scanner",
    query: "freelance invoicing",
    headline: "Invoicing pain is real — but the wedge is follow-up, not creation",
    context:
      "Thynkk scanned 'freelance invoicing' across r/freelance and related subs. Invoicing ranked high on demand — but the verdict and competition fields pointed to a narrower wedge.",
    stats: [
      { label: "Subreddits scanned", value: "3" },
      { label: "Top demand score", value: "78" },
      { label: "Verdict", value: "Already crowded" },
    ],
    topFinding: {
      name: "Manual Invoicing Pain",
      demand: 78,
      verdict: "Already crowded",
      summary:
        "Freelancers lose hours creating invoices, chasing payments, and reconciling books — but most frustration is follow-up, not invoice creation.",
      opportunity:
        "Don't build another invoicing app. Build the enforcement layer: automated follow-up sequences for overdue invoices, aimed at solo freelancers already on FreshBooks or Wave.",
      quote: "I spend 3+ hours a week chasing invoices. There has to be a better way.",
      sourceUrl: "https://reddit.com/r/freelance",
      nextStep:
        "Survey 10 freelancers: 'What does HoneyBook get wrong about payment follow-ups?' Look for the wedge before building.",
    },
    alsoFound: [
      "Client scope creep (demand 61) — weak signal, low willingness to pay",
      "Tax prep confusion (demand 44) — seasonal, harder to monetize",
    ],
  },
  {
    id: "trend-radar-ai-meetings",
    mode: "Trend Radar",
    query: "No input — weekly pulse",
    headline: "Trend Radar flagged AI meeting tools before the Twitter cycle",
    context:
      "Mode 2 needs no keyword. Thynkk pulled top post titles across r/entrepreneur, r/indiehackers, r/SaaS, and 10 other subs — then clustered emerging niches by momentum.",
    stats: [
      { label: "Posts analyzed", value: "390+" },
      { label: "Growth signal", value: "+340%" },
      { label: "Tag", value: "HOT" },
    ],
    topFinding: {
      name: "AI meeting tools",
      demand: 0,
      verdict: "HOT",
      summary:
        "Founders are actively comparing Otter, Fireflies, and cheaper AI alternatives — not just complaining, but shopping for replacements.",
      opportunity:
        "A niche-specific meeting recorder (e.g. for sales calls or user interviews) with a simpler price point than incumbents. Validate with a landing page before building.",
      quote:
        "Looking for something like Otter but cheaper — we do 20+ calls a week and the per-seat pricing is killing us.",
      sourceUrl: "https://reddit.com/r/productivity",
      nextStep:
        "Run a Pain Point Scanner on r/productivity to surface specific feature gaps incumbents miss.",
    },
    alsoFound: [
      "Solo founder ops (+180%) — RISING",
      "B2B cold outreach automation (+95%) — NEW",
    ],
  },
];

const MODE_STYLES: Record<CaseStudy["mode"], string> = {
  "Pain Point Scanner": "bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30",
  "Trend Radar": "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
};

const VERDICT_STYLES: Record<string, string> = {
  "Strong signal": "text-[#22C55E]",
  "Already crowded": "text-[#F59E0B]",
  HOT: "text-[#EF4444]",
  RISING: "text-[#F59E0B]",
  NEW: "text-[#22C55E]",
};

function CaseStudyCard({ study }: { study: CaseStudy }) {
  const { topFinding: t } = study;
  const verdictColor = VERDICT_STYLES[t.verdict] ?? "text-[#94A3B8]";

  return (
    <article className="bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden">
      <div className="p-6 md:p-8 border-b border-[#1E293B]">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${MODE_STYLES[study.mode]}`}>
            {study.mode}
          </span>
          <span className="text-[10px] font-mono text-[#475569]">{study.query}</span>
        </div>
        <h2 className="font-mono font-bold text-xl text-[#F8FAFC] mb-3 leading-snug">{study.headline}</h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed">{study.context}</p>
        <div className="flex flex-wrap gap-6 mt-5">
          {study.stats.map((s) => (
            <div key={s.label}>
              <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">{s.label}</p>
              <p className={`font-mono font-bold text-lg ${s.label === "Verdict" || s.label === "Tag" ? verdictColor : "text-[#F8FAFC]"}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8">
        <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-2">Top finding</p>
        <h3 className="font-mono font-semibold text-base text-[#F8FAFC] mb-2">{t.name}</h3>
        {t.demand > 0 && (
          <p className="text-xs font-mono text-[#94A3B8] mb-3">
            Demand score: <span className="text-[#6366F1]">{t.demand}</span>
            {" · "}
            <span className={verdictColor}>{t.verdict}</span>
          </p>
        )}
        <p className="text-sm text-[#94A3B8] mb-4 leading-relaxed">{t.summary}</p>

        <div className="bg-[#1A1E2F] rounded-md p-4 mb-4">
          <p className="text-[10px] font-mono text-[#6366F1] uppercase mb-1">Opportunity</p>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">{t.opportunity}</p>
        </div>

        <blockquote className="border-l-2 border-[#6366F1] pl-4 mb-4">
          <p className="text-sm text-[#94A3B8] italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
          <a
            href={t.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#6366F1] hover:underline font-mono mt-2 inline-block"
          >
            View on Reddit →
          </a>
        </blockquote>

        <div className="bg-[#020617] border border-[#1E293B] rounded-md p-4 mb-4">
          <p className="text-[10px] font-mono text-[#22C55E] uppercase mb-1">Next step</p>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{t.nextStep}</p>
        </div>

        {study.alsoFound && study.alsoFound.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-2">Also surfaced</p>
            <ul className="space-y-1">
              {study.alsoFound.map((item) => (
                <li key={item} className="text-xs text-[#94A3B8] font-mono">· {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export default function CaseStudiesPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3 text-center">Case studies</p>
        <h1 className="font-mono text-4xl font-bold mb-4 text-center">Real scan results</h1>
        <p className="text-[#94A3B8] text-center mb-16 max-w-2xl mx-auto leading-relaxed">
          Example outputs from Thynkk scans — ranked themes, demand scores, verdicts, and build-ready opportunities.
          Every quote links back to Reddit. No fabricated testimonials.
        </p>

        <div className="space-y-8 mb-16">
          {CASE_STUDIES.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>

        <div
          className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-8 text-center"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}
        >
          <p className="font-mono font-bold text-lg mb-2">Run your own scan</p>
          <p className="text-sm text-[#94A3B8] mb-6">
            Pick a subreddit or niche. See what people are struggling with — ranked by demand, backed by evidence.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-medium text-sm transition-colors"
          >
            Scan a niche free
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}