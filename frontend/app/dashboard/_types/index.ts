export type Mode = "scanner" | "radar";
export type ScanStatus = "idle" | "loading" | "done" | "error";

export interface Quote {
  text: string;
  url: string;
}

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
  quotes: Quote[];
  demandLabel?: string | null;
  severityLabel?: string | null;
  locked?: boolean;
}

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
