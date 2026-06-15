import type { Theme, TrendItem, TrendRadarMeta } from "../_types";

export const MOCK_THEMES: Theme[] = [
  {
    name: "Payment Processor Shutdowns",
    summary:
      "Small business owners face sudden, unexplained account deactivations from Square and Stripe with no warning and no human support.",
    opportunity:
      "A payment processor risk monitor that alerts owners to warning signs and helps maintain backup processor accounts.",
    severity: 9,
    mentions: 24,
    demand: 94,
    verdict: "Strong signal",
    willingnessToPay: "High",
    willingnessReason: "Multiple posts mention revenue loss and explicit budget for a fix.",
    competition: "No direct tool. Stripe Radar handles fraud but not account health monitoring.",
    nextStep: "Post in r/smallbusiness: 'Would you pay $19/mo for a payment processor risk monitor?' Aim for 10 replies.",
    quotes: [
      {
        text: "After two years of processing payments, with zero notice Square closed our account Saturday.",
        url: "https://reddit.com/r/smallbusiness/comments/1kl99go",
      },
      {
        text: "Stripe froze $40k in my account for 90 days. No explanation. Customer support was useless.",
        url: "https://reddit.com/r/smallbusiness/comments/1jx9abc",
      },
      {
        text: "I had to take out a personal loan to cover payroll after Stripe held my funds. This is criminal.",
        url: "https://reddit.com/r/smallbusiness/comments/1km2def",
      },
    ],
  },
  {
    name: "Manual Invoicing Pain",
    summary:
      "Freelancers and small business owners waste hours on manual invoice creation, follow-ups, and reconciliation.",
    opportunity:
      "Automated invoicing tool with smart follow-up sequences for freelancers.",
    severity: 8,
    mentions: 18,
    demand: 78,
    verdict: "Already crowded",
    willingnessToPay: "Medium",
    willingnessReason: "Pain is real but FreshBooks and HoneyBook already capture most of the spend.",
    competition: "FreshBooks, HoneyBook, Wave — all handle invoicing. Gap is the enforcement / follow-up layer.",
    nextStep: "Survey 10 freelancers on what HoneyBook gets wrong about follow-ups. Look for a wedge.",
    quotes: [
      {
        text: "I spend 3+ hours a week chasing invoices. There has to be a better way.",
        url: "https://reddit.com/r/freelance/comments/1k2xyz",
      },
      {
        text: "My accountant charges me $200/month just to reconcile what I could automate in an afternoon.",
        url: "https://reddit.com/r/freelance/comments/1k3abc",
      },
    ],
  },
  {
    name: "Clients Expecting Free Work",
    summary:
      "Founders and freelancers who offered free work to build portfolios are being exploited by returning clients expecting continued free services.",
    opportunity:
      "Client onboarding tool that formalizes free/discounted work agreements with clear expectations.",
    severity: 8,
    mentions: 15,
    demand: 61,
    verdict: "Weak signal",
    willingnessToPay: "Low",
    willingnessReason: "People vent but rarely pay for boundary-setting tools — this is a behaviour problem, not a software problem.",
    competition: "Dubsado handles client agreements but this is more of an education/habit gap.",
    nextStep: "Validate whether people want a tool or just want community support. Post in r/freelance to find out.",
    quotes: [
      {
        text: "I'm on food stamps and people are coming back asking for more free work.",
        url: "https://reddit.com/r/smallbusiness/comments/1ij4ozn",
      },
    ],
  },
  {
    name: "Scaling Solo Service Business",
    summary:
      "Solopreneurs with proven demand can't scale beyond personal time capacity — unsure how to hire, delegate, or systemize.",
    opportunity:
      "Scaling playbook platform for solo service businesses with hiring templates and delegation workflows.",
    severity: 7,
    mentions: 12,
    demand: 48,
    verdict: "Strong signal",
    willingnessToPay: "High",
    willingnessReason: "Solopreneurs with revenue will pay for operational leverage — this is a clear ROI purchase.",
    competition: "No focused tool. Notion templates exist but no opinionated product for this exact stage.",
    nextStep: "Interview 5 solopreneurs who hit capacity. Ask what their first hire decision felt like and what they wish they had.",
    quotes: [
      {
        text: "My walking tour business blew up. I want to expand but have no idea how to find guides.",
        url: "https://reddit.com/r/smallbusiness/comments/1kotxoq",
      },
    ],
  },
  {
    name: "Predatory Networking",
    summary:
      "New brick-and-mortar owners are overwhelmed by local business visitors pretending to support but actually soliciting.",
    opportunity:
      "Local business community platform that filters genuine peer support from solicitation.",
    severity: 6,
    mentions: 9,
    demand: 31,
    verdict: "Weak signal",
    willingnessToPay: "Low",
    willingnessReason: "Venting thread energy — no indication people would pay to solve this.",
    competition: "Alignable targets local business networking but has low engagement.",
    nextStep: "Skip. Revisit if you see this theme appear in 3+ separate subreddits.",
    quotes: [
      {
        text: "90% of people who come in my shop want to sell me something, not buy anything.",
        url: "https://reddit.com/r/smallbusiness/comments/1k6lb1m",
      },
    ],
  },
  {
    name: "Selling Business Without Broker",
    summary:
      "Business owners trying to sell without a broker face difficulty finding serious buyers and structuring deals.",
    opportunity:
      "Self-serve business sale platform with automated valuation tools and buyer vetting workflows.",
    severity: 7,
    mentions: 7,
    demand: 19,
    verdict: "Strong signal",
    willingnessToPay: "High",
    willingnessReason: "Stakes are high — sellers will pay to avoid broker fees (typically 10-15% of sale price).",
    competition: "Acquire.com and Flippa exist but focus on online businesses. Physical/service businesses are underserved.",
    nextStep: "Post in r/smallbusiness asking sellers what Flippa/Acquire gets wrong for physical business sales.",
    quotes: [
      {
        text: "What's been the hardest part about selling? Finding serious buyers? Valuation? Deal structure?",
        url: "https://reddit.com/r/smallbusiness/comments/1kpw7b7",
      },
    ],
  },
];

export const MOCK_TRENDS: TrendItem[] = [
  { niche: "AI meeting tools", growth: "+340%", growthPct: 340, tag: "HOT", posts: 1240, subreddit: "r/productivity" },
  { niche: "Solo founder ops", growth: "+180%", growthPct: 180, tag: "RISING", posts: 890, subreddit: "r/indiehackers" },
  { niche: "B2B cold outreach automation", growth: "+95%", growthPct: 95, tag: "NEW", posts: 620, subreddit: "r/sales" },
  { niche: "No-code app builders", growth: "+72%", growthPct: 72, tag: "RISING", posts: 540, subreddit: "r/nocode" },
  { niche: "Micro SaaS acquisition", growth: "+64%", growthPct: 64, tag: "NEW", posts: 410, subreddit: "r/entrepreneur" },
  { niche: "Fractional CTO services", growth: "+51%", growthPct: 51, tag: "RISING", posts: 320, subreddit: "r/startups" },
];

export const MOCK_TREND_META: TrendRadarMeta = {
  asOf: new Date("2026-06-13T00:00:00Z"),
  windowDays: 7,
};

export const FREE_LIMIT = 3;
