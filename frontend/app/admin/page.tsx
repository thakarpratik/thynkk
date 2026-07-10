"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "../_components/BrandLogo";

const API =
  typeof window !== "undefined"
    ? "/api/backend"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

interface ScanLogEntry {
  id: number;
  ip: string;
  query: string;
  from_cache: boolean;
  status: string;
  themes_count: number;
  created_at: string;
}

interface AdminStats {
  total_scans: number;
  scans_today: number;
  scans_this_week: number;
  cache_hit_rate_pct: number;
  total_unique_ips: number;
  free_users: number;
  paid_users: number;
  quota_exhausted_free: number;
  top_queries: { query: string; count: number }[];
  recent_scans: ScanLogEntry[];
}

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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg px-5 py-4">
      <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-1">{label}</p>
      <p className="font-mono font-bold text-2xl text-[#F8FAFC]">{value}</p>
      {sub && <p className="text-xs text-[#475569] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(s: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${s}` },
      });
      if (res.status === 401) { setError("Wrong secret."); return; }
      if (res.status === 503) { setError("Backend is down or restarting — check Railway logs."); return; }
      if (!res.ok) { setError(`Backend returned ${res.status}`); return; }
      setStats(await res.json());
      setAuthed(true);
    } catch (e) {
      setError(`Could not reach API at ${API} — check CORS_ORIGINS and that Railway is running.`);
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh every 30s when authed
  useEffect(() => {
    if (!authed || !secret) return;
    const id = setInterval(() => load(secret), 30000);
    return () => clearInterval(id);
  }, [authed, secret]);

  if (!authed) {
    return (
      <div className="min-h-dvh bg-[#020617] text-[#F8FAFC] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <BrandLogo href="" className="h-7 w-auto" />
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

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC] px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <BrandLogo href="" className="h-7 w-auto" />
              <span className="font-mono font-bold text-xl text-[#94A3B8]">admin</span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5 font-mono">Auto-refreshes every 30s</p>
          </div>
          <button
            onClick={() => load(secret)}
            className="text-xs font-mono border border-[#1E293B] hover:border-[#334155] text-[#475569] hover:text-[#94A3B8] px-3 py-1.5 rounded-md transition-all cursor-pointer"
          >
            Refresh now
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total scans" value={stats.total_scans} />
          <StatCard label="Today" value={stats.scans_today} />
          <StatCard label="This week" value={stats.scans_this_week} />
          <StatCard label="Cache hit rate" value={`${stats.cache_hit_rate_pct}%`} sub="scans served from cache" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Unique visitors" value={stats.total_unique_ips} sub="by IP" />
          <StatCard label="Free users" value={stats.free_users} />
          <StatCard label="Paid users" value={stats.paid_users} />
          <StatCard label="Free quota used" value={stats.quota_exhausted_free} sub="hit the 1-scan limit" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Top queries */}
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1E293B]">
              <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest">Top queries</p>
            </div>
            {stats.top_queries.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#475569] font-mono">No data yet</p>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {stats.top_queries.map((q, i) => (
                  <div key={q.query} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-[#334155] shrink-0">#{i + 1}</span>
                      <span className="text-sm text-[#CBD5E1] truncate font-mono">{q.query}</span>
                    </div>
                    <span className="text-xs font-mono text-[#475569] shrink-0 ml-3">{q.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quota conversion funnel */}
          <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg p-5">
            <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-4">Conversion funnel</p>
            <div className="space-y-3">
              {[
                { label: "Unique visitors", value: stats.total_unique_ips, color: "bg-[#6366F1]" },
                { label: "Ran a scan", value: stats.free_users, color: "bg-[#818CF8]" },
                { label: "Hit free limit", value: stats.quota_exhausted_free, color: "bg-[#F59E0B]" },
                { label: "Paid subscribers", value: stats.paid_users, color: "bg-[#22C55E]" },
              ].map((row) => {
                const pct = stats.total_unique_ips > 0
                  ? Math.round((row.value / stats.total_unique_ips) * 100)
                  : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-[#94A3B8]">{row.label}</span>
                      <span className="text-[#475569]">{row.value} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-[#0E1223] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1E293B]">
            <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest">Recent activity (last 50)</p>
          </div>
          {stats.recent_scans.length === 0 ? (
            <p className="px-5 py-4 text-xs text-[#475569] font-mono">No scans logged yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E293B]">
                    {["Time", "Query", "IP", "Status", "Themes", "Cache"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-mono text-[#475569] uppercase tracking-widest px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D1120]">
                  {stats.recent_scans.map((s) => (
                    <tr key={s.id} className="hover:bg-[#0D1120] transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-[#475569] whitespace-nowrap">{timeAgo(s.created_at)}</td>
                      <td className="px-4 py-2.5 text-xs text-[#CBD5E1] font-mono max-w-[160px] truncate">{s.query}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-[#475569]">{maskIp(s.ip)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          s.status === "done"
                            ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25"
                            : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-[#475569] text-center">{s.themes_count}</td>
                      <td className="px-4 py-2.5">
                        {s.from_cache && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/25">
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
        </div>

      </div>
    </div>
  );
}
