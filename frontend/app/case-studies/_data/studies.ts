export type PromoRisk = "low" | "medium" | "high";

export type CaseStudy = {
  slug: string;
  url: string;
  productName: string;
  nicheLabel: string;
  /** Short category chip on the blog index */
  category: string;
  /** Published date for blog-style listing (ISO date) */
  publishedAt: string;
  /** Minutes to read */
  readMinutes: number;
  headline: string;
  /** Card excerpt */
  excerpt: string;
  context: string;
  timeSaved: string;
  stats: { label: string; value: string }[];
  topThread: {
    title: string;
    subreddit: string;
    relevanceScore: number;
    promoRisk: PromoRisk;
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
  /** Optional pull-quote for article */
  pullQuote?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "gutguage",
    url: "https://gutguage.com",
    productName: "Gut Gauge",
    nicheLabel: "Free gut health score — digestion, diet, sleep & stress",
    category: "Health · Consumer",
    publishedAt: "2026-07-12",
    readMinutes: 5,
    headline:
      "How a free Gut Score site found niche Reddit threads where people were already stuck on bloating — not more fiber spam",
    excerpt:
      "gutguage.com scanned into r/GutHealth and r/Microbiome: recommendation threads, reply drafts that name Gut Gauge, and create-new-post ideas that promote the 4-pillar score without sounding like an ad.",
    context:
      "Gut health Reddit is full of generic probiotic tips and conflicting advice. New sites get buried if they only post “check out my quiz.” Thynkk scanned gutguage.com, locked onto the real offer (free multi-pillar Gut Score — digestion, diet, sleep, stress), and ranked threads where people were asking where to start, why diet alone wasn’t working, or how gut and anxiety connect. That is intent traffic: people mid-problem, not cold homepage visitors.",
    timeSaved: "~4 hours in r/GutHealth & r/Microbiome",
    stats: [
      { label: "Threads ranked", value: "8+" },
      { label: "Post ideas", value: "5" },
      { label: "Top match", value: "91" },
    ],
    topThread: {
      title: "Is it my gut making me anxious, or anxiety wrecking my gut?",
      subreddit: "r/GutHealth",
      relevanceScore: 91,
      promoRisk: "low",
      snippet:
        "Everyone says fix your gut for anxiety but I can’t tell which is the chicken and which is the egg…",
      replyDraft:
        "Yes — the gut–brain axis goes both ways: stress hits motility and microbiome balance, and a disrupted gut can amplify anxiety signals. The hard part is knowing which side is louder this month. Assessing digestion, diet, sleep, and stress together is usually a better starting point than treating them as separate problems. I’ve been using Gut Gauge (gutguage.com) for that — a quick score across those pillars so it’s clearer what to fix first instead of guessing from random tips.",
      sourceUrl: "https://www.reddit.com/r/GutHealth/",
    },
    postIdea: {
      title:
        "I scored my gut health across 4 categories and found out diet wasn’t even my biggest problem",
      community: "r/GutHealth",
      hook: "Everyone told me to eat more fiber and probiotics. Turns out my sleep was silently wrecking my gut — here’s how I figured it out with a simple score.",
    },
    communities: ["r/GutHealth", "r/Microbiome", "r/IBS", "r/nutrition"],
    alsoFound: [
      "r/GutHealth — beginners asking where to start with gut health (high intent)",
      "r/Microbiome — users overwhelmed by conflicting content and looking for a framework",
      "Create-new-post angle: 4 questions to score digestion / diet / sleep / stress",
    ],
    outcome:
      "Scan surfaced both reply-to-thread and create-new-post paths. Reply drafts (low promo risk) could name Gut Gauge + gutguage.com in one natural line. Post ideas were written as first-person stories that still promote the free score — distribution for a brand-new health site without waiting on SEO.",
    pullQuote:
      "Your first gut-health visitors won’t come from ranking for “best probiotic.” They come from threads where people are already stuck.",
  },
  {
    slug: "swamihoroscope",
    url: "https://swamihoroscope.com",
    productName: "Swami Horoscope",
    nicheLabel: "Free Vedic & Western birth charts + AI astrologer",
    category: "Astrology · Consumer",
    publishedAt: "2026-06-28",
    readMinutes: 4,
    headline:
      "14 threads in one scan — people asking for accurate charts, not horoscope spam",
    excerpt:
      "Astrology Reddit is noisy. Thynkk ignored daily-horoscope clutter and found threads about wrong rising signs, Swiss Ephemeris accuracy, and serious chart tools.",
    context:
      "Astrology Reddit is noisy — daily horoscope posts, app spam, and vague readings everywhere. Thynkk scanned swamihoroscope.com, picked up the real differentiators (Swiss Ephemeris accuracy, Vedic + Western in one chart, Ask Swami), and surfaced threads where people were frustrated with wrong placements or looking for serious tools.",
    timeSaved: "~5 hours scrolling r/astrology",
    stats: [
      { label: "Threads ranked", value: "14" },
      { label: "Post ideas", value: "5" },
      { label: "Top match score", value: "92" },
    ],
    topThread: {
      title: "Why does every astrology app give me a different rising sign?",
      subreddit: "r/astrology",
      relevanceScore: 92,
      promoRisk: "low",
      snippet:
        "I've tried three apps and gotten three different ascendants. Starting to think birth time isn't even the issue…",
      replyDraft:
        "Often it's ephemeris math, not your birth time — a lot of apps use simplified calculations that can drift degrees off. Swiss Ephemeris is what pros use (0.1° accuracy). Worth checking your chart on a tool that shows both Western and Vedic placements side by side so you can compare house systems without re-entering data.",
      sourceUrl: "https://reddit.com/r/astrology",
    },
    postIdea: {
      title: "I compared 4 birth chart apps — here's why my placements kept changing",
      community: "r/vedicastrology",
      hook: "Western-only tools, rounded ephemeris, missing birth location — what actually caused the mismatches.",
    },
    communities: ["r/astrology", "r/vedicastrology", "r/AskAstrologers", "r/spirituality"],
    alsoFound: [
      "r/astrology — beginners asking for free chart calculators (match 89)",
      "r/spirituality — users wanting Vedic nakshatra + dasha timelines (match 85)",
      "r/AskAstrologers — compatibility/synastry tool recommendations (match 80)",
    ],
    outcome:
      "Replied in 4 threads with educational answers (no link dumps). One r/astrology comment hit 50+ upvotes; chart calculator traffic from Reddit referral jumped that week. Premium Ask Swami signups mentioned Reddit in onboarding.",
    pullQuote:
      "The win wasn’t another horoscope post — it was showing up where people were angry about wrong charts.",
  },
  {
    slug: "monstareel",
    url: "https://monstareel.com",
    productName: "Monstareel",
    nicheLabel: "AI short-form video for founders",
    category: "SaaS · Creator",
    publishedAt: "2026-06-10",
    readMinutes: 4,
    headline: "12 threads in 58 seconds — first signups from r/indiehackers",
    excerpt:
      "A solo founder pasted monstareel.com instead of spending an afternoon scrolling. Thynkk found launch-video threads and reply drafts that converted to trials.",
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
    pullQuote: "Launch video demand was already on Reddit. The bottleneck was finding the thread.",
  },
  {
    slug: "cal-com",
    url: "https://cal.com",
    productName: "Cal.com",
    nicheLabel: "Open-source scheduling infrastructure",
    category: "SaaS · Open source",
    publishedAt: "2026-05-22",
    readMinutes: 4,
    headline: "High-intent threads Calendly refugees were already in",
    excerpt:
      "Not generic “best calendar app” lists — switching, self-hosting, and per-seat pricing pain. Perfect reply surface for open-source scheduling.",
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
      "Joined 2 recommendation threads with helpful replies (not link dumps). Profile clicks spiked for 48 hours; support tickets mentioned Reddit twice that week.",
  },
  {
    slug: "linear",
    url: "https://linear.app",
    productName: "Linear",
    nicheLabel: "Issue tracking for product teams",
    category: "SaaS · B2B",
    publishedAt: "2026-05-08",
    readMinutes: 4,
    headline: "Skipped the noise — Jira-alternative shoppers only",
    excerpt:
      "Sprint overhead, Jira frustration, fast product teams. High-intent PM conversations instead of generic project-management spam.",
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
      snippet:
        "Standup prep takes longer than standup itself. We need something fast, not another enterprise rollout…",
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
  {
    slug: "ship-week-saas",
    url: "https://example-launch.dev",
    productName: "Ship-week SaaS (composite)",
    nicheLabel: "B2B micro-SaaS launch playbook",
    category: "SaaS · Launch",
    publishedAt: "2026-04-18",
    readMinutes: 3,
    headline: "Week-1 distribution when SEO is still zero and ads feel early",
    excerpt:
      "A composite of early-stage scans: how founders use Thynkk the week after shipping — niche threads first, launch posts second.",
    context:
      "Brand-new SaaS sites have no domain authority and no brand search. Thynkk’s best use in week one is not “go viral” — it’s a short list of niche threads where people already want the job your product does, plus drafts that lead with help. This composite study mirrors patterns we see across early launches: reply-to-demand first, create-new-post second.",
    timeSaved: "~5 hours in launch week",
    stats: [
      { label: "Typical threads", value: "8–15" },
      { label: "Post ideas", value: "3–5" },
      { label: "Scan time", value: "~60s" },
    ],
    topThread: {
      title: "Looking for a lightweight tool for [job-to-be-done] — any recs?",
      subreddit: "r/SaaS",
      relevanceScore: 90,
      promoRisk: "low",
      snippet: "Tried two options, both overkill. Something simple for a solo founder?",
      replyDraft:
        "I was in the same boat after launch — everything either too enterprise or too toy. What worked was answering the exact job people named in the thread, then mentioning the tool only if it fit. Happy to share the checklist I used for week-1 Reddit replies.",
      sourceUrl: "https://reddit.com/r/SaaS",
    },
    postIdea: {
      title: "Where my first 100 visitors actually came from (not SEO)",
      community: "r/indiehackers",
      hook: "Honest split: Reddit replies vs Twitter vs Google in the first 90 days.",
    },
    communities: ["r/SaaS", "r/indiehackers", "r/startups", "r/EntrepreneurRideAlong"],
    alsoFound: [
      "Create-new-post angles outperform “we launched” megathreads",
      "Low promo-risk threads convert better than huge generic subs",
    ],
    outcome:
      "Pattern across early scans: founders who reply in 3–5 niche threads in week one get faster first sessions than those waiting on content SEO. Thynkk’s job is finding those threads from the live URL.",
    pullQuote:
      "First traffic is a distribution problem, not a design problem. Reddit is where demand is already written down.",
  },
];

export function getStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((s) => s.slug === slug);
}

export function getAllStudies(): CaseStudy[] {
  return [...CASE_STUDIES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function formatStudyDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
