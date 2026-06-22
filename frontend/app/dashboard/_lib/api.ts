import type { Theme } from "../_types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ApiScanStatus = "queued" | "running" | "done" | "failed";

type TokenGetter = () => Promise<string | null>;

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
  demand_label?: string | null;
  severity_label?: string | null;
  locked?: boolean;
}

interface ReportResponse {
  scan_id: string;
  query: string;
  themes: ApiTheme[];
  total_themes: number;
  from_cache: boolean;
}

export interface Report {
  themes: Theme[];
  totalThemes: number;
  fromCache: boolean;
}

export interface BillingStatus {
  is_paid: boolean;
  subscription_id: string | null;
  subscription_status: string | null;
}

export interface TrendItemApi {
  niche: string;
  description: string;
  growth: string;
  growth_pct: number;
  tag: "HOT" | "RISING" | "NEW";
  posts: number;
  subreddit: string;
  locked?: boolean;
}

export interface TrendsResponse {
  niches: TrendItemApi[];
  as_of: string;
  window_days: number;
  from_cache: boolean;
}

export interface QuotaStatus {
  is_paid: boolean;
  scan_count: number;
  limit: number;
  remaining: number;
  period_start: string;
}

export interface ScanHistoryItemApi {
  scan_id: string;
  query: string;
  total_themes: number;
  theme_count: number;
  top_theme: string;
  from_cache: boolean;
  scanned_at: string;
  themes: ApiTheme[];
}

async function authHeaders(getToken?: TokenGetter): Promise<HeadersInit> {
  if (!getToken) return {};
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    willingnessToPay: t.willingness_to_pay ?? "",
    willingnessReason: t.willingness_reason ?? "",
    competition: t.competition ?? "",
    nextStep: t.next_step ?? "",
    quotes: t.quotes.map((q) => ({ text: q.excerpt, url: q.permalink })),
    demandLabel: t.demand_label ?? null,
    severityLabel: t.severity_label ?? null,
    locked: t.locked ?? false,
  };
}

export async function submitScan(query: string, getToken: TokenGetter): Promise<string> {
  const res = await fetch(`${BASE}/scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(getToken)),
    },
    body: JSON.stringify({ query, post_limit: 100 }),
  });
  if (res.status === 429) {
    const detail = await res.json().catch(() => ({}));
    const code = detail?.detail?.error ?? "quota_exceeded";
    throw new Error(code);
  }
  if (res.status === 403) {
    const detail = await res.json().catch(() => ({}));
    const code = detail?.detail?.error ?? "forbidden";
    throw new Error(code);
  }
  if (!res.ok) throw new Error(`Failed to submit scan: ${res.status}`);
  const data = await res.json();
  return data.scan_id as string;
}

export async function pollStatus(scanId: string): Promise<StatusResponse> {
  const res = await fetch(`${BASE}/scans/${scanId}/status`);
  if (!res.ok) throw new Error(`Failed to poll status: ${res.status}`);
  return res.json();
}

export async function fetchReport(scanId: string, getToken?: TokenGetter): Promise<Report> {
  const res = await fetch(`${BASE}/scans/${scanId}/report`, {
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`);
  const data: ReportResponse = await res.json();
  return {
    themes: data.themes.map(toTheme),
    totalThemes: data.total_themes ?? data.themes.length,
    fromCache: data.from_cache ?? false,
  };
}

export async function fetchScanHistory(getToken: TokenGetter): Promise<ScanHistoryItemApi[]> {
  const res = await fetch(`${BASE}/scans/history`, {
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(`Failed to fetch scan history: ${res.status}`);
  const data = await res.json();
  return (data.scans ?? []) as ScanHistoryItemApi[];
}

export async function fetchQuota(getToken?: TokenGetter): Promise<QuotaStatus> {
  const res = await fetch(`${BASE}/quota/status`, {
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(`Failed to fetch quota: ${res.status}`);
  return res.json();
}

export async function fetchBillingStatus(getToken: TokenGetter): Promise<BillingStatus> {
  const res = await fetch(`${BASE}/billing/status`, {
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(`Failed to fetch billing status: ${res.status}`);
  return res.json();
}

export async function activatePayPalSubscription(
  subscriptionId: string,
  getToken: TokenGetter,
): Promise<BillingStatus> {
  const res = await fetch(`${BASE}/billing/paypal/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(getToken)),
    },
    body: JSON.stringify({ subscription_id: subscriptionId }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? `Activation failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchTrends(refresh = false, getToken?: TokenGetter): Promise<TrendsResponse> {
  const url = `${BASE}/radar/trends${refresh ? "?refresh=true" : ""}`;
  const res = await fetch(url, { headers: await authHeaders(getToken) });
  if (res.status === 503) throw new Error("scanning");
  if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
  return res.json();
}