import type { GrowthReport, GrowthThread, PostIdea, SubredditHint, Theme } from "../_types";

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

// ── Growth scans ─────────────────────────────────────────────────────────────

interface GrowthStatusResponse {
  scan_id: string;
  status: ApiScanStatus;
  url: string;
  error: string | null;
}

interface ApiGrowthThread {
  title: string;
  url: string;
  source: string;
  snippet: string;
  intent_type: string;
  match_reason: string;
  relevance_score: number;
  suggested_reply: string;
  promo_risk: string;
  locked?: boolean;
}

interface ApiPostIdea {
  title: string;
  hook: string;
  outline: string[];
  target_community: string;
  based_on_trend: string;
  locked?: boolean;
}

interface GrowthReportResponse {
  scan_id: string;
  url: string;
  product_name: string;
  niche_label: string;
  product_summary: string;
  audience: string;
  subreddits: { name: string; reason: string }[];
  threads: ApiGrowthThread[];
  post_ideas: ApiPostIdea[];
  total_threads: number;
  total_post_ideas: number;
  from_cache: boolean;
}

function toGrowthThread(t: ApiGrowthThread): GrowthThread {
  return {
    title: t.title,
    url: t.url,
    source: t.source,
    snippet: t.snippet,
    intentType: t.intent_type,
    matchReason: t.match_reason,
    relevanceScore: t.relevance_score,
    suggestedReply: t.suggested_reply,
    promoRisk: (t.promo_risk as GrowthThread["promoRisk"]) || "medium",
    locked: t.locked,
  };
}

function toPostIdea(p: ApiPostIdea): PostIdea {
  return {
    title: p.title,
    hook: p.hook,
    outline: p.outline,
    targetCommunity: p.target_community,
    basedOnTrend: p.based_on_trend,
    locked: p.locked,
  };
}

function formatApiDetail(detail: unknown): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "object" && item && "msg" in item) return String((item as { msg: string }).msg);
        return String(item);
      })
      .join("; ");
  }
  if (typeof detail === "object" && detail) {
    const obj = detail as { error?: string; message?: string };
    if (obj.message) return obj.message;
    if (obj.error) return obj.error;
  }
  return String(detail);
}

async function parseApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  const text = formatApiDetail(body?.detail) || fallback;
  const lower = text.toLowerCase();
  if (lower.includes("authorization token")) throw new Error("auth_invalid");
  if (lower.includes("email_not_verified") || lower.includes("verify your email")) {
    throw new Error("email_not_verified");
  }
  if (lower.includes("quota_exceeded")) throw new Error("quota_exceeded");
  if (lower.includes("ip_quota_exceeded")) throw new Error("ip_quota_exceeded");
  throw new Error(text);
}

export async function submitGrowthScan(url: string, getToken: TokenGetter): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error("auth_invalid");

  const res = await fetch(`${BASE}/growth-scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) await parseApiError(res, `Request failed (${res.status})`);
  const data = await res.json();
  return data.scan_id as string;
}

export async function pollGrowthStatus(scanId: string): Promise<GrowthStatusResponse> {
  const res = await fetch(`${BASE}/growth-scans/${scanId}/status`);
  if (!res.ok) throw new Error(`Failed to poll status: ${res.status}`);
  return res.json();
}

export async function fetchGrowthReport(scanId: string, getToken: TokenGetter): Promise<GrowthReport & { scanId: string; url: string }> {
  const token = await getToken();
  if (!token) throw new Error("auth_invalid");

  const res = await fetch(`${BASE}/growth-scans/${scanId}/report`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await parseApiError(res, `Failed to load report (${res.status})`);
  const data: GrowthReportResponse = await res.json();
  return {
    scanId: data.scan_id,
    url: data.url,
    productName: data.product_name,
    nicheLabel: data.niche_label,
    productSummary: data.product_summary,
    audience: data.audience,
    subreddits: data.subreddits as SubredditHint[],
    threads: data.threads.map(toGrowthThread),
    postIdeas: data.post_ideas.map(toPostIdea),
    totalThreads: data.total_threads,
    totalPostIdeas: data.total_post_ideas,
    fromCache: data.from_cache,
  };
}