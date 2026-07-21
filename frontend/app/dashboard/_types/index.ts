export type ScanStatus = "idle" | "loading" | "done" | "error";

/** @deprecated Legacy modes — pain scanner removed from dashboard */
export type Mode = "scanner" | "radar";

export interface TrendItem {
  niche: string;
  description: string;
  growth: string;
  growthPct: number;
  tag: "HOT" | "RISING" | "NEW";
  posts: number;
  subreddit: string;
  locked?: boolean;
}

export interface TrendRadarMeta {
  asOf: Date;
  windowDays: number;
}

/** @deprecated Legacy pain-scanner types — kept for api.ts compat */
export interface Theme {
  name: string;
  summary: string;
  opportunity: string;
  severity: number;
  mentions: number;
  demand: number;
  verdict: string;
  willingnessToPay: string;
  willingnessReason: string;
  competition: string;
  nextStep: string;
  quotes: { text: string; url: string }[];
  demandLabel?: string | null;
  severityLabel?: string | null;
  locked?: boolean;
}

export interface GrowthThread {
  title: string;
  url: string;
  source: string;
  snippet: string;
  /** Human date from search, e.g. "2 weeks ago" */
  date: string;
  intentType: string;
  matchReason: string;
  relevanceScore: number;
  suggestedReply: string;
  promoRisk: "low" | "medium" | "high";
  locked?: boolean;
}

export interface PostIdea {
  title: string;
  hook: string;
  outline: string[];
  /** Full Reddit post body ready to paste (title is separate). */
  body: string;
  targetCommunity: string;
  basedOnTrend: string;
  locked?: boolean;
}

export interface SubredditHint {
  name: string;
  reason: string;
}

export interface GrowthReport {
  productName: string;
  nicheLabel: string;
  productSummary: string;
  audience: string;
  subreddits: SubredditHint[];
  threads: GrowthThread[];
  postIdeas: PostIdea[];
  totalThreads: number;
  totalPostIdeas: number;
  fromCache: boolean;
  reportTier: "free" | "full";
}

/** Early Serper hits shown while Claude writes drafts */
export interface PartialThread {
  title: string;
  url: string;
  source: string;
  snippet: string;
  date: string;
  query?: string;
}

export interface GrowthPartial {
  productName: string;
  nicheLabel: string;
  productSummary: string;
  audience: string;
  threads: PartialThread[];
  totalThreads: number;
  draftsReady: boolean;
}

export interface GrowthScanProgress {
  stage: string;
  stageMessage: string;
  progressPct: number;
  partial: GrowthPartial | null;
  notifyEmail: string | null;
}