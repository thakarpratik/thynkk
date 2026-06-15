import type { Theme } from "../_types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ApiScanStatus = "queued" | "running" | "done" | "failed";

interface StatusResponse {
  scan_id: string;
  status: ApiScanStatus;
  query: string;
  error: string | null;
}

interface ApiQuote {
  excerpt: string;
  permalink: string;
}

interface ApiTheme {
  name: string;
  summary: string;
  opportunity: string;
  severity_score: number;
  mention_count: number;
  demand_score: number;
  verdict: string;
  willingness_to_pay: string;
  willingness_reason: string;
  competition: string;
  next_step: string;
  quotes: ApiQuote[];
}

interface ReportResponse {
  scan_id: string;
  query: string;
  themes: ApiTheme[];
  from_cache: boolean;
}

export interface Report {
  themes: Theme[];
  fromCache: boolean;
}

function toTheme(t: ApiTheme): Theme {
  return {
    name: t.name,
    summary: t.summary,
    opportunity: t.opportunity,
    severity: t.severity_score,
    mentions: t.mention_count,
    demand: Math.round(t.demand_score),
    verdict: t.verdict ?? "Unknown",
    willingnessToPay: t.willingness_to_pay ?? "Unknown",
    willingnessReason: t.willingness_reason ?? "",
    competition: t.competition ?? "",
    nextStep: t.next_step ?? "",
    quotes: t.quotes.map((q) => ({ text: q.excerpt, url: q.permalink })),
  };
}

export async function submitScan(query: string): Promise<string> {
  const res = await fetch(`${BASE}/scans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, post_limit: 100 }),
  });
  if (!res.ok) throw new Error(`Failed to submit scan: ${res.status}`);
  const data = await res.json();
  return data.scan_id as string;
}

export async function pollStatus(scanId: string): Promise<StatusResponse> {
  const res = await fetch(`${BASE}/scans/${scanId}/status`);
  if (!res.ok) throw new Error(`Failed to poll status: ${res.status}`);
  return res.json();
}

export async function fetchReport(scanId: string): Promise<Report> {
  const res = await fetch(`${BASE}/scans/${scanId}/report`);
  if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`);
  const data: ReportResponse = await res.json();
  return {
    themes: data.themes.map(toTheme),
    fromCache: data.from_cache ?? false,
  };
}

export interface TrendItemApi {
  niche: string;
  description: string;
  growth: string;
  growth_pct: number;
  tag: "HOT" | "RISING" | "NEW";
  posts: number;
  subreddit: string;
}

export interface TrendsResponse {
  niches: TrendItemApi[];
  as_of: string;
  window_days: number;
  from_cache: boolean;
}

export async function fetchTrends(refresh = false): Promise<TrendsResponse> {
  const url = `${BASE}/radar/trends${refresh ? "?refresh=true" : ""}`;
  const res = await fetch(url);
  if (res.status === 503) throw new Error("scanning");
  if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
  return res.json();
}
