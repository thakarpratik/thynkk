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
}

export interface TrendItem {
  niche: string;
  growth: string;
  tag: "HOT" | "RISING" | "NEW";
  posts: number;
  subreddit: string;
}
