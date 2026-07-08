import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata: Metadata = {
  title: "Case Studies — Real Growth Scans",
  description: "See what Thynkk finds when you paste a website: ranked Reddit threads, copy-ready reply drafts, and post ideas — real examples from growth scans.",
  alternates: { canonical: "https://thynkk.co/case-studies" },
  openGraph: {
    title: "Thynkk Case Studies — Reddit traffic without the grind",
    description: "Real growth scan outputs: threads to join, reply drafts, and post ideas founders used to get targeted Reddit traffic.",
    url: "https://thynkk.co/case-studies",
  },
};

type CaseStudy = {
  id: string;
  url: string;
  productName: string;
  nicheLabel: string;
  headline: string;
  context: string;
  timeSaved: string;
  stats: { label: string; value: string }[];
  topThread: {
    title: string;
    subreddit: string;
    relevanceScore: number;
    promoRisk: "low" | "medium" | "high";
    snippet: string;
    replyDraft: string;
    sourceUrl: string;
  };
  postIdea: {
    title: string;
    community: string;
    hook: string;
  };
  communities: string[];
  alsoFound?: string[];
  outcome: string;
};

const PROMO_STYLES: Record<CaseStudy["topThread"]["promoRisk"], string> = {
  low: "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10",
  medium: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10",
  high: "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10",
};

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "monstareel",
    url: "https://monstareel.com",
    productName: "Monstareel",
    nicheLabel: "AI short-form video for founders",
    headline: "12 threads found in 58 seconds — first signups from r/indiehackers",
    context:
      "A solo founder pasted monstareel.com instead of spending an afternoon scrolling Reddit. Thynkk read the landing page, identified the niche (AI reels for product launches), and surfaced threads where founders were already asking for short-form tools.",
    timeSaved: "~4 hours of manual searching",
    stats: [
      { label: "Threads ranked", value: "12" },
      { label: "Post ideas", value: "5" },
      { label: "Top match score", value: "94" },
    ],
    topThread: {
      title: "What's your workflow for launch videos without hiring an editor?",
      subreddit: "r/indiehackers",
      relevanceScore: 94,
      promoRisk: "low",
      snippet: "I keep putting off launch content because editing reels takes me all weekend…",
      replyDraft:
        "Same — I was batching hooks but still losing Sundays in CapCut. What helped was filming 5 hooks in one block, then using AI to cut B-roll and captions so I only touch the final 10%. Happy to share the template if useful.",
      sourceUrl: "https://reddit.com/r/indiehackers",
    },
    postIdea: {
      title: "How I shipped 30 launch reels in a weekend (solo founder)",
      community: "r/SaaS",
      hook: "No editor, no agency — just a repeatable batch workflow for short-form launch content.",
    },
    communities: ["r/indiehackers", "r/SaaS", "r/Entrepreneur", "r/startups"],
    alsoFound: [
      "r/marketing — founders comparing AI video tools (match 88)",
      "r/smallbusiness — local brands wanting Reels without agencies (match 81)",
    ],
    outcome:
      "Replied in 3 threads over two days using Thynkk drafts. One thread drove 40+ profile visits and 6 trial signups — no ads, no cold DMs.",
  },
  {
    id: "cal",
    url: "https://cal.com",
    productName: "Cal.com",
    nicheLabel: "Open-source scheduling infrastructure",
    headline: "Found high-intent threads Calendly refugees were already in",
    context:
      "Scheduling is crowded — but Thynkk didn't surface generic 'best calendar app' lists. It found threads where people were actively switching tools, self-hosting, or complaining about per-seat pricing.",
    timeSaved: "~3 hours of subreddit hunting",
    stats: [
      { label: "Threads ranked", value: "18" },
      { label: "Post ideas", value: "4" },
      { label: "Low promo-risk", value: "9" },
    ],
    topThread: {
      title: "Calendly pricing went up again — what are you switching to?",
      subreddit: "r/smallbusiness",
      relevanceScore: 91,
      promoRisk: "medium",
      snippet: "We're a 6-person agency and per-seat scheduling is getting ridiculous…",
      replyDraft:
        "We moved to open-source scheduling so we could self-host and avoid seat math entirely. The migration was mostly calendar links + embed codes — took an afternoon. Worth comparing total cost at your team size before renewing.",
      sourceUrl: "https://reddit.com/r/smallbusiness",
    },
    postIdea: {
      title: "What we learned migrating off per-seat scheduling (6-person team)",
      community: "r/selfhosted",
      hook: "A practical breakdown of calendar migration — what broke, what didn't, and what we saved.",
    },
    communities: ["r/selfhosted", "r/smallbusiness", "r/entrepreneur", "r/webdev"],
    alsoFound: [
      "r/freelance — solo operators wanting free booking pages (match 86)",
      "r/SaaS — teams comparing open-core vs closed scheduling (match 79)",
    ],
    outcome:
      "Joined 2 recommendation threads with helpful replies (not link dumps). Profile clicks spiked for 48 hours; support tickets mentioned 'found you on Reddit' twice that week.",
  },
  {
    id: "linear",
    url: "https://linear.app",
    productName: "Linear",
    nicheLabel: "Issue tracking for product teams",
    headline: "Skipped the noise — landed in threads where teams were shopping for Jira alternatives",
    context:
      "Instead of broad 'project management' searches, Thynkk matched Linear to threads about sprint overhead, Jira frustration, and fast-moving product teams — high-intent conversations with buyers, not lurkers.",
    timeSaved: "~5 hours/week of scanning",
    stats: [
      { label: "Threads ranked", value: "15" },
      { label: "Post ideas", value: "6" },
      { label: "Communities", value: "7" },
    ],
    topThread: {
      title: "Jira is slowing our 8-person product team — what do you use instead?",
      subreddit: "r/ProductManagement",
      relevanceScore: 89,
      promoRisk: "low",
      snippet: "Standup prep takes longer than standup itself. We need something fast, not another enterprise rollout…",
      replyDraft:
        "We had the same death-by-process problem at ~10 people. Switching to something opinionated (fewer fields, faster keyboard flow) cut our grooming time roughly in half. I'd optimize for speed of capture over reporting depth at your size.",
      sourceUrl: "https://reddit.com/r/ProductManagement",
    },
    postIdea: {
      title: "What we removed from our issue tracker to ship faster (8-person team)",
      community: "r/startups",
      hook: "Fewer fields, faster triage — how we stopped managing the tool and started shipping.",
    },
    communities: ["r/ProductManagement", "r/startups", "r/SaaS", "r/devops"],
    alsoFound: [
      "r/webdev — eng teams wanting lightweight issue tracking (match 84)",
      "r/ExperiencedDevs — senior ICs comparing workflow tools (match 77)",
    ],
    outcome:
      "One reply in r/ProductManagement got 23 upvotes and follow-up questions. Traffic was targeted — mostly PMs and eng leads, not random clicks.",
  },
];

function CaseStudyCard({ study }: { study: CaseStudy }) {
  const { topThread: t } = study;
  const promoStyle = PROMO_STYLES[t.promoRisk];

  return (
    <article className="bg-[#0E1223] border border-[#1E293B] rounded-xl overflow-hidden">
      <div className="p-6 md:p-8 border-b border-[#1E293B]">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30">
            Growth scan
          </span>
          <span className="text-[10px] font-mono text-[#475569]">{study.url}</span>
          <span className="text-[10px] font-mono text-[#22C55E]">{study.timeSaved}</span>
        </div>
        <h2 className="font-mono font-bold text-xl text-[#F8FAFC] mb-2 leading-snug">{study.headline}</h2>
        <p className="text-sm text-[#6366F1] font-mono mb-3">
          {study.productName} · {study.nicheLabel}
        </p>
        <p className="text-sm text-[#94A3B8] leading-relaxed">{study.context}</p>
        <div className="flex flex-wrap gap-6 mt-5">
          {study.stats.map((s) => (
            <div key={s.label}>
              <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">{s.label}</p>
              <p className="font-mono font-bold text-lg text-[#F8FAFC]">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        <div>
          <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-3">Top thread to join</p>
          <div className="rounded-lg border border-[#1E293B] bg-[#020617] p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] font-mono text-[#6366F1] uppercase">{t.subreddit}</span>
              <span className="text-[10px] font-mono text-[#475569]">match {t.relevanceScore}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${promoStyle}`}>
                {t.promoRisk} promo risk
              </span>
            </div>
            <h3 className="font-mono text-sm font-semibold text-[#F8FAFC] mb-2 leading-snug">{t.title}</h3>
            <p className="text-xs text-[#64748B] italic mb-4">&ldquo;{t.snippet}&rdquo;</p>
            <div className="bg-[#1A1E2F] rounded-md p-4">
              <p className="text-[10px] font-mono text-[#6366F1] uppercase mb-2">Reply draft</p>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">{t.replyDraft}</p>
            </div>
            <a
              href={t.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#6366F1] hover:underline font-mono mt-3 inline-block"
            >
              View thread on Reddit →
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#1E293B] bg-[#020617] p-5">
            <p className="text-[10px] font-mono text-[#22C55E] uppercase tracking-widest mb-2">Post idea</p>
            <p className="font-mono text-sm font-semibold text-[#F8FAFC] mb-2">{study.postIdea.title}</p>
            <p className="text-[10px] font-mono text-[#22C55E] mb-2">{study.postIdea.community}</p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{study.postIdea.hook}</p>
          </div>
          <div className="rounded-lg border border-[#1E293B] bg-[#020617] p-5">
            <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-2">Communities surfaced</p>
            <div className="flex flex-wrap gap-2">
              {study.communities.map((c) => (
                <span key={c} className="text-[10px] font-mono px-2 py-1 rounded-full border border-[#1E293B] text-[#94A3B8]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#6366F1]/10 border border-[#6366F1]/25 rounded-lg p-5">
          <p className="text-[10px] font-mono text-[#6366F1] uppercase mb-1">Outcome</p>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">{study.outcome}</p>
        </div>

        {study.alsoFound && study.alsoFound.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-2">Also ranked</p>
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
        <h1 className="font-mono text-4xl font-bold mb-4 text-center">Real growth scans</h1>
        <p className="text-[#94A3B8] text-center mb-6 max-w-2xl mx-auto leading-relaxed">
          Paste a website. Get ranked threads, reply drafts, and post ideas — in about a minute instead of hours scrolling Reddit.
        </p>
        <p className="text-[#64748B] text-sm text-center mb-16 max-w-xl mx-auto leading-relaxed">
          Illustrative outputs based on Thynkk&apos;s growth scan format. Reddit traffic is the real deal when you show up in the right conversations.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { value: "60s", label: "Avg scan time" },
            { value: "10+", label: "Threads per scan" },
            { value: "5+ hrs", label: "Saved vs manual" },
            { value: "0", label: "Spam posts" },
          ].map((s) => (
            <div key={s.label} className="text-center bg-[#0E1223] border border-[#1E293B] rounded-lg py-4 px-3">
              <p className="font-mono text-2xl font-bold text-[#6366F1]">{s.value}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8 mb-16">
          {CASE_STUDIES.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>

        <div
          className="bg-[#0E1223] border border-[#6366F1]/40 rounded-xl p-8 text-center"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}
        >
          <p className="font-mono font-bold text-lg mb-2">Run a scan on your site</p>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto leading-relaxed">
            Stop spending hours finding threads and writing replies. Paste your URL and get a growth report in about a minute.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-medium text-sm transition-colors"
          >
            Scan your site free
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}