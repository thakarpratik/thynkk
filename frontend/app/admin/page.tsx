"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "../_components/BrandLogo";

const API =
  typeof window !== "undefined"
    ? "/api/backend"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

type RangeKey = "24h" | "7d" | "30d" | "90d" | "all" | "custom";

interface ScanLogEntry {
  id: number;
  ip: string;
  query: string;
  from_cache: boolean;
  status: string;
  themes_count: number;
  scan_type: string;
  clerk_id: string | null;
  tier: string | null;
  user_email: string | null;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
  country: string;
  device: string;
  browser: string;
  os: string;
  created_at: string;
}

interface SourceCount {
  source: string;
  count: number;
}

interface NamedCount {
  name: string;
  count: number;
}

interface UrlCount {
  url: string;
  count: number;
}

interface DayCount {
  date: string;
  scans: number;
  signups: number;
  purchases: number;
}

interface UserRow {
  email: string;
  clerk_id: string;
  created_at: string;
  scan_credits: number;
  free_scan_used: boolean;
  growth_scans: number;
  purchased: boolean;
}

interface PurchaseRow {
  order_id: string;
  clerk_id: string;
  amount: string;
  currency: string;
  credits_granted: number;
  created_at: string;
}

interface SaturationLeadRow {
  id: number;
  email: string;
  idea: string;
  score: number | null;
  decision: string | null;
  data_mode: string | null;
  created_at: string;
}

interface TechCheck {
  name: string;
  ok: boolean;
  detail: string;
}

interface TechHealth {
  database: string;
  checks: TechCheck[];
}

interface FilterOptions {
  sources: string[];
  referrers: string[];
  countries: string[];
  devices: string[];
  browsers: string[];
  operating_systems: string[];
  scan_types: string[];
}

interface AppliedFilters {
  range: string;
  date_from: string | null;
  date_to: string | null;
  source: string | null;
  referral: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  scan_type: string | null;
}

interface AdminStats {
  total_scans: number;
  scans_today: number;
  scans_this_week: number;
  growth_scans: number;
  pain_scans: number;
  cache_hit_rate_pct: number;
  total_unique_ips: number;
  total_users: number;
  signups_today: number;
  signups_this_week: number;
  users_with_scans: number;
  free_scans_used: number;
  users_with_credits: number;
  pack_purchases: number;
  pack_revenue_usd: number;
  waitlist_total: number;
  waitlist_sources: SourceCount[];
  top_urls: UrlCount[];
  tier_breakdown: Record<string, number>;
  saturation_total: number;
  saturation_today: number;
  saturation_this_week: number;
  saturation_in_period: number;
  saturation_unique_emails: number;
  saturation_avg_score: number;
  saturation_by_decision: NamedCount[];
  saturation_top_ideas: NamedCount[];
  recent_saturation_leads: SaturationLeadRow[];
  filtered_scans: number;
  filtered_unique_ips: number;
  filtered_signups: number;
  filtered_purchases: number;
  filtered_revenue_usd: number;
  by_source: NamedCount[];
  by_referral: NamedCount[];
  by_country: NamedCount[];
  by_device: NamedCount[];
  by_browser: NamedCount[];
  by_os: NamedCount[];
  by_day: DayCount[];
  filter_options: FilterOptions;
  applied_filters: AppliedFilters;
  tech: TechHealth;
  recent_users: UserRow[];
  recent_purchases: PurchaseRow[];
  recent_scans: ScanLogEntry[];
}

interface Filters {
  range: RangeKey;
  from: string;
  to: string;
  source: string;
  referral: string;
  country: string;
  device: string;
  browser: string;
  os: string;
  scan_type: string;
}

const DEFAULT_FILTERS: Filters = {
  range: "7d",
  from: "",
  to: "",
  source: "",
  referral: "",
  country: "",
  device: "",
  browser: "",
  os: "",
  scan_type: "",
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
  { key: "custom", label: "Custom" },
];

function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.slice(0, 8) + "…";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function displayUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
  }
}

function buildQuery(filters: Filters): string {
  const p = new URLSearchParams();
  p.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) p.set("from", new Date(filters.from).toISOString());
    if (filters.to) {
      // Inclusive end of day for date inputs
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      p.set("to", end.toISOString());
    }
  }
  if (filters.source) p.set("source", filters.source);
  if (filters.referral) p.set("referral", filters.referral);
  if (filters.country) p.set("country", filters.country);
  if (filters.device) p.set("device", filters.device);
  if (filters.browser) p.set("browser", filters.browser);
  if (filters.os) p.set("os", filters.os);
  if (filters.scan_type) p.set("scan_type", filters.scan_type);
  return p.toString();
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg px-5 py-4">
      <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-1">{label}</p>
      <p className="font-mono font-bold text-2xl text-[#F8FAFC]">{value}</p>
      {sub && <p className="text-xs text-[#475569] mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-[#1E293B]">
        <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-[120px]">
      <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#020617] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#E2E8F0] text-xs font-mono rounded-md px-2.5 py-2"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function BarList({
  items,
  onSelect,
  active,
}: {
  items: NamedCount[];
  onSelect?: (name: string) => void;
  active?: string;
}) {
  if (items.length === 0) {
    return <p className="px-5 py-4 text-xs text-[#475569] font-mono">No data in this range</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="divide-y divide-[#1E293B]">
      {items.map((item) => {
        const pct = Math.round((item.count / max) * 100);
        const isActive = active === item.name;
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelect?.(item.name)}
            className={`w-full text-left px-5 py-2.5 hover:bg-[#0D1120] transition-colors cursor-pointer ${
              isActive ? "bg-[#6366F1]/10" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-sm text-[#CBD5E1] font-mono truncate" title={item.name}>
                {item.name}
              </span>
              <span className="text-xs font-mono text-[#475569] shrink-0">{item.count}</span>
            </div>
            <div className="h-1 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#6366F1]/70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayChart({ days }: { days: DayCount[] }) {
  if (days.length === 0) {
    return <p className="px-5 py-8 text-xs text-[#475569] font-mono text-center">No daily data</p>;
  }
  const max = Math.max(...days.map((d) => d.scans), 1);
  return (
    <div className="px-5 py-4">
      <div className="flex items-end gap-1 h-28">
        {days.map((d) => {
          const h = Math.max(2, Math.round((d.scans / max) * 100));
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className="w-full max-w-[18px] rounded-t bg-[#6366F1]/80 hover:bg-[#818CF8] transition-colors"
                style={{ height: `${h}%` }}
                title={`${d.date}: ${d.scans} scans · ${d.signups} signups · ${d.purchases} purchases`}
              />
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] font-mono text-[#E2E8F0] bg-[#0E1223] border border-[#1E293B] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d.scans}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-mono text-[#475569]">
        <span>{days[0]?.date?.slice(5)}</span>
        <span>{days[days.length - 1]?.date?.slice(5)}</span>
      </div>
      <div className="flex gap-4 mt-3 text-[10px] font-mono text-[#64748B]">
        <span>Scans (bars)</span>
        <span>Σ scans {days.reduce((a, d) => a + d.scans, 0)}</span>
        <span>Σ signups {days.reduce((a, d) => a + d.signups, 0)}</span>
        <span>Σ purchases {days.reduce((a, d) => a + d.purchases, 0)}</span>
      </div>
    </div>
  );
}

function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.range !== "7d") n++;
  if (f.source) n++;
  if (f.referral) n++;
  if (f.country) n++;
  if (f.device) n++;
  if (f.browser) n++;
  if (f.os) n++;
  if (f.scan_type) n++;
  return n;
}

function decisionBadge(decision: string | null) {
  const d = (decision || "unknown").toLowerCase();
  if (d === "go") {
    return "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25";
  }
  if (d === "caution") {
    return "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/25";
  }
  if (d === "no_go" || d === "no-go") {
    return "bg-[#EF4444]/10 text-[#FCA5A5] border-[#EF4444]/25";
  }
  return "bg-[#1E293B] text-[#94A3B8] border-[#334155]";
}

function decisionLabel(decision: string | null): string {
  const d = (decision || "—").toLowerCase();
  if (d === "no_go") return "no-go";
  return d;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const load = useCallback(async (s: string, f: Filters = filters) => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQuery(f);
      const res = await fetch(`${API}/admin/stats?${qs}`, {
        headers: { Authorization: `Bearer ${s}` },
      });
      if (res.status === 401) { setError("Wrong secret."); return; }
      if (res.status === 503) { setError("Backend is down or restarting — check Railway logs."); return; }
      if (!res.ok) { setError(`Backend returned ${res.status}`); return; }
      setStats(await res.json());
      setAuthed(true);
    } catch {
      setError(`Could not reach API at ${API} — check CORS_ORIGINS and that Railway is running.`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!authed || !secret) return;
    const id = setInterval(() => load(secret, filters), 30000);
    return () => clearInterval(id);
  }, [authed, secret, filters, load]);

  // Re-fetch when filters change (after auth)
  useEffect(() => {
    if (!authed || !secret) return;
    load(secret, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on filter change after auth
  }, [
    filters.range,
    filters.from,
    filters.to,
    filters.source,
    filters.referral,
    filters.country,
    filters.device,
    filters.browser,
    filters.os,
    filters.scan_type,
  ]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNamed = (key: keyof Filters, name: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === name ? "" : name,
    }));
  };

  const options = stats?.filter_options;
  const filterBadge = useMemo(() => activeFilterCount(filters), [filters]);

  if (!authed) {
    return (
      <div className="min-h-dvh bg-[#020617] text-[#F8FAFC] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <BrandLogo href="" className="h-8 w-auto" />
            <span className="font-mono font-bold text-lg text-[#94A3B8]">admin</span>
          </div>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(secret)}
            className="w-full bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#475569] px-4 py-3 rounded-md text-sm font-mono mb-3"
          />
          {error && <p className="text-xs text-[#EF4444] mb-3 font-mono">{error}</p>}
          <button
            onClick={() => load(secret)}
            disabled={loading || !secret}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white py-3 rounded-md font-medium text-sm transition-colors cursor-pointer"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const conversionPct = stats.total_users > 0
    ? Math.round((stats.pack_purchases / stats.total_users) * 100)
    : 0;

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC] px-6 py-10">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <BrandLogo href="" className="h-8 w-auto" />
              <span className="font-mono font-bold text-xl text-[#94A3B8]">admin</span>
              {filterBadge > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#A5B4FC] border border-[#6366F1]/30">
                  {filterBadge} filter{filterBadge === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#475569] mt-0.5 font-mono">
              Growth engine · auto-refreshes every 30s
              {loading ? " · updating…" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs font-mono border border-[#1E293B] hover:border-[#334155] text-[#475569] hover:text-[#94A3B8] px-3 py-1.5 rounded-md transition-all cursor-pointer"
            >
              Reset filters
            </button>
            <button
              onClick={() => load(secret, filters)}
              className="text-xs font-mono border border-[#1E293B] hover:border-[#334155] text-[#475569] hover:text-[#94A3B8] px-3 py-1.5 rounded-md transition-all cursor-pointer"
            >
              Refresh now
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-[#EF4444] mb-4 font-mono">{error}</p>
        )}

        {/* Filters */}
        <Section title="Filters">
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-4 space-y-4">
            <div>
              <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-2">Date range</p>
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setFilter("range", r.key)}
                    className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                      filters.range === r.key
                        ? "bg-[#6366F1]/20 border-[#6366F1]/50 text-[#C7D2FE]"
                        : "border-[#1E293B] text-[#64748B] hover:border-[#334155] hover:text-[#94A3B8]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {filters.range === "custom" && (
                <div className="flex flex-wrap gap-3 mt-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[#475569] uppercase">From</span>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(e) => setFilter("from", e.target.value)}
                      className="bg-[#020617] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#E2E8F0] text-xs font-mono rounded-md px-2.5 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[#475569] uppercase">To</span>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(e) => setFilter("to", e.target.value)}
                      className="bg-[#020617] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#E2E8F0] text-xs font-mono rounded-md px-2.5 py-2"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <SelectFilter
                label="Source"
                value={filters.source}
                options={options?.sources ?? []}
                onChange={(v) => setFilter("source", v)}
              />
              <SelectFilter
                label="Referral"
                value={filters.referral}
                options={options?.referrers ?? []}
                onChange={(v) => setFilter("referral", v)}
              />
              <SelectFilter
                label="Country"
                value={filters.country}
                options={options?.countries ?? []}
                onChange={(v) => setFilter("country", v)}
              />
              <SelectFilter
                label="Device"
                value={filters.device}
                options={options?.devices ?? []}
                onChange={(v) => setFilter("device", v)}
              />
              <SelectFilter
                label="Browser"
                value={filters.browser}
                options={options?.browsers ?? []}
                onChange={(v) => setFilter("browser", v)}
              />
              <SelectFilter
                label="OS"
                value={filters.os}
                options={options?.operating_systems ?? []}
                onChange={(v) => setFilter("os", v)}
              />
              <SelectFilter
                label="Scan type"
                value={filters.scan_type}
                options={options?.scan_types ?? ["growth", "pain"]}
                onChange={(v) => setFilter("scan_type", v)}
              />
            </div>
          </div>
        </Section>

        {/* Period snapshot (respects filters) */}
        <Section title="Selected period">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Scans" value={stats.filtered_scans} sub={`${stats.filtered_unique_ips} unique IPs`} />
            <StatCard label="Signups" value={stats.filtered_signups} />
            <StatCard label="Purchases" value={stats.filtered_purchases} />
            <StatCard label="Revenue" value={`$${stats.filtered_revenue_usd.toFixed(0)}`} sub="in period" />
            <StatCard
              label="Saturation scores"
              value={stats.saturation_in_period ?? 0}
              sub={`${stats.saturation_unique_emails ?? 0} unique emails`}
            />
            <StatCard label="Cache hit" value={`${stats.cache_hit_rate_pct}%`} sub="lifetime" />
          </div>
        </Section>

        {/* Saturation Score */}
        <Section title="Saturation Score (email leads)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard
              label="Total scores"
              value={stats.saturation_total ?? 0}
              sub={`+${stats.saturation_today ?? 0} today · +${stats.saturation_this_week ?? 0} week`}
            />
            <StatCard
              label="In period"
              value={stats.saturation_in_period ?? 0}
              sub={`${stats.saturation_unique_emails ?? 0} unique emails`}
            />
            <StatCard
              label="Avg score"
              value={stats.saturation_avg_score ?? 0}
              sub="lower = less saturated"
            />
            <StatCard
              label="Waitlist"
              value={stats.waitlist_total}
              sub="pre-signup emails"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Panel title="Decisions in period">
              {(stats.saturation_by_decision ?? []).length === 0 ? (
                <p className="px-5 py-4 text-xs text-[#475569] font-mono">No saturation scores yet</p>
              ) : (
                <BarList items={stats.saturation_by_decision} />
              )}
            </Panel>
            <Panel title="Top ideas scored (period)">
              {(stats.saturation_top_ideas ?? []).length === 0 ? (
                <p className="px-5 py-4 text-xs text-[#475569] font-mono">No ideas yet</p>
              ) : (
                <BarList items={stats.saturation_top_ideas} />
              )}
            </Panel>
          </div>

          <Panel title={`Recent saturation leads (period · ${(stats.recent_saturation_leads ?? []).length})`}>
            {(stats.recent_saturation_leads ?? []).length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">
                No saturation leads in this range — scores appear after email unlock on /saturation
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B]">
                      {["Email", "Idea", "Score", "Decision", "Mode", "When"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-mono text-[#475569] uppercase tracking-widest px-4 py-2"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1120]">
                    {(stats.recent_saturation_leads ?? []).map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#0D1120]">
                        <td className="px-4 py-2 text-xs font-mono text-[#CBD5E1] whitespace-nowrap">
                          {lead.email}
                        </td>
                        <td
                          className="px-4 py-2 text-xs font-mono text-[#94A3B8] max-w-[220px] truncate"
                          title={lead.idea}
                        >
                          {lead.idea}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-[#F8FAFC] text-center tabular-nums">
                          {lead.score ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${decisionBadge(lead.decision)}`}
                          >
                            {decisionLabel(lead.decision)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[10px] font-mono text-[#475569] text-center">
                          {lead.data_mode ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-[#475569] whitespace-nowrap">
                          {timeAgo(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Section>

        {/* Daily trend */}
        <Section title="Daily trend">
          <Panel title="Scans by day">
            <DayChart days={stats.by_day} />
          </Panel>
        </Section>

        {/* Attribution breakdowns */}
        <Section title="Acquisition & tech">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Panel title="By source (UTM / channel)">
              <BarList
                items={stats.by_source}
                active={filters.source}
                onSelect={(n) => toggleNamed("source", n)}
              />
            </Panel>
            <Panel title="By referral domain">
              <BarList
                items={stats.by_referral}
                active={filters.referral}
                onSelect={(n) => toggleNamed("referral", n)}
              />
            </Panel>
            <Panel title="By country">
              <BarList
                items={stats.by_country}
                active={filters.country}
                onSelect={(n) => toggleNamed("country", n)}
              />
            </Panel>
            <Panel title="By device">
              <BarList
                items={stats.by_device}
                active={filters.device}
                onSelect={(n) => toggleNamed("device", n)}
              />
            </Panel>
            <Panel title="By browser">
              <BarList
                items={stats.by_browser}
                active={filters.browser}
                onSelect={(n) => toggleNamed("browser", n)}
              />
            </Panel>
            <Panel title="By OS">
              <BarList
                items={stats.by_os}
                active={filters.os}
                onSelect={(n) => toggleNamed("os", n)}
              />
            </Panel>
          </div>
        </Section>

        {/* Lifetime overview */}
        <Section title="Lifetime (all time)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total scans" value={stats.total_scans} sub={`${stats.growth_scans} growth · ${stats.pain_scans} legacy`} />
            <StatCard label="Today" value={stats.scans_today} />
            <StatCard label="This week" value={stats.scans_this_week} />
            <StatCard label="Unique IPs" value={stats.total_unique_ips} sub="scan requests" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total users" value={stats.total_users} sub={`+${stats.signups_today} today · +${stats.signups_this_week} week`} />
            <StatCard label="Users who scanned" value={stats.users_with_scans} />
            <StatCard label="Launch packs sold" value={stats.pack_purchases} sub={`${conversionPct}% of users`} />
            <StatCard label="Revenue" value={`$${stats.pack_revenue_usd.toFixed(0)}`} sub="PayPal one-time" />
          </div>
        </Section>

        {/* Tier breakdown */}
        <Section title="Scan tiers">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Free tier" value={stats.tier_breakdown.free ?? 0} />
            <StatCard label="Full tier" value={stats.tier_breakdown.full ?? 0} />
            <StatCard label="Saturation (all time)" value={stats.saturation_total ?? 0} sub="email-gated scores" />
            <StatCard label="Waitlist" value={stats.waitlist_total} sub="pre-signup emails" />
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Panel title="Acquisition sources (waitlist)">
            {stats.waitlist_sources.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">No waitlist data yet</p>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {stats.waitlist_sources.map((s) => (
                  <div key={s.source} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-sm text-[#CBD5E1] font-mono">{s.source}</span>
                    <span className="text-xs font-mono text-[#475569]">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Top scanned sites (period)">
            {stats.top_urls.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">No growth scans in period</p>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {stats.top_urls.map((u, i) => (
                  <div key={u.url} className="flex items-center justify-between px-5 py-2.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-[#334155] shrink-0">#{i + 1}</span>
                      <span className="text-sm text-[#CBD5E1] truncate font-mono" title={u.url}>
                        {displayUrl(u.url)}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#475569] shrink-0">{u.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Tech health */}
        <Section title="Tech health">
          <Panel title={`Database: ${stats.tech.database}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1E293B]">
              {stats.tech.checks.map((check) => (
                <div key={check.name} className="px-5 py-3 flex items-start gap-3">
                  <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${check.ok ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-[#CBD5E1] font-mono">{check.name}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5 truncate" title={check.detail}>{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Panel title="Recent users">
            {stats.recent_users.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">No users yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B]">
                      {["Email", "Joined", "Scans", "Credits", "Paid"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-mono text-[#475569] uppercase tracking-widest px-4 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1120]">
                    {stats.recent_users.map((u) => (
                      <tr key={u.clerk_id} className="hover:bg-[#0D1120]">
                        <td className="px-4 py-2 text-xs font-mono text-[#CBD5E1]">{u.email}</td>
                        <td className="px-4 py-2 text-xs font-mono text-[#475569] whitespace-nowrap">{timeAgo(u.created_at)}</td>
                        <td className="px-4 py-2 text-xs font-mono text-[#475569] text-center">{u.growth_scans}</td>
                        <td className="px-4 py-2 text-xs font-mono text-[#475569] text-center">{u.scan_credits}</td>
                        <td className="px-4 py-2 text-center">
                          {u.purchased ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25">yes</span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#334155]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Recent purchases">
            {stats.recent_purchases.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">No purchases yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B]">
                      {["When", "Amount", "Credits", "User"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-mono text-[#475569] uppercase tracking-widest px-4 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1120]">
                    {stats.recent_purchases.map((p) => (
                      <tr key={p.order_id} className="hover:bg-[#0D1120]">
                        <td className="px-4 py-2 text-xs font-mono text-[#475569] whitespace-nowrap">{timeAgo(p.created_at)}</td>
                        <td className="px-4 py-2 text-xs font-mono text-[#CBD5E1]">{p.currency} {p.amount}</td>
                        <td className="px-4 py-2 text-xs font-mono text-[#475569] text-center">+{p.credits_granted}</td>
                        <td className="px-4 py-2 text-xs font-mono text-[#475569]">{p.clerk_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Activity feed */}
        <Section title="Recent activity">
          <Panel title={`Last 50 scans (filtered · ${stats.recent_scans.length})`}>
            {stats.recent_scans.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">No scans match filters</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B]">
                      {["Time", "Site / query", "User", "Source", "Ref", "Geo", "Tech", "Type", "Status"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-mono text-[#475569] uppercase tracking-widest px-3 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1120]">
                    {stats.recent_scans.map((s) => (
                      <tr key={s.id} className="hover:bg-[#0D1120] transition-colors">
                        <td className="px-3 py-2.5 text-xs font-mono text-[#475569] whitespace-nowrap">{timeAgo(s.created_at)}</td>
                        <td className="px-3 py-2.5 text-xs text-[#CBD5E1] font-mono max-w-[120px] truncate" title={s.query}>
                          {s.scan_type === "growth" ? displayUrl(s.query) : s.query}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-[#475569] max-w-[90px] truncate">
                          {s.user_email ?? maskIp(s.ip)}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-[#A5B4FC] max-w-[80px] truncate" title={s.campaign || s.medium}>
                          {s.source}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-[#64748B] max-w-[80px] truncate" title={s.referrer}>
                          {s.referrer}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-[#64748B]">{s.country}</td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-[#64748B] whitespace-nowrap" title={`${s.device} · ${s.browser} · ${s.os}`}>
                          {s.device}/{s.browser}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-[#818CF8] uppercase">{s.scan_type}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            s.status === "done"
                              ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25"
                              : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25"
                          }`}>
                            {s.status}
                          </span>
                          {s.from_cache && (
                            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded border bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/25">
                              cached
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Section>

      </div>
    </div>
  );
}
