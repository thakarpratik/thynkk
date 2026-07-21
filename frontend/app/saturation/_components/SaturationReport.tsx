"use client";

import Link from "next/link";
import type { SaturationReport as Report } from "../_lib/types";

function decisionStyles(decision: Report["decision"]) {
  if (decision === "go") {
    return {
      badge: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
      ring: "border-[#22C55E]/40",
      bar: "bg-[#22C55E]",
    };
  }
  if (decision === "caution") {
    return {
      badge: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
      ring: "border-[#F59E0B]/40",
      bar: "bg-[#F59E0B]",
    };
  }
  return {
    badge: "bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/30",
    ring: "border-[#EF4444]/40",
    bar: "bg-[#EF4444]",
  };
}

interface SaturationReportProps {
  report: Report;
  onReset: () => void;
}

export function SaturationReportView({ report, onReset }: SaturationReportProps) {
  const styles = decisionStyles(report.decision);
  const scoreColor =
    report.decision === "go"
      ? "text-[#22C55E]"
      : report.decision === "caution"
        ? "text-[#FBBF24]"
        : "text-[#FCA5A5]";

  return (
    <div className="mt-8 space-y-6">
      {/* Score hero */}
      <div className={`rounded-xl border bg-[#0E1223] p-6 sm:p-8 ${styles.ring}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest mb-2">
              Niche saturation
            </p>
            <h2 className="font-mono text-xl sm:text-2xl font-bold text-[#F8FAFC] mb-2">
              {report.normalized_input}
            </h2>
            {report.is_theme && (
              <p className="text-xs font-mono text-[#FBBF24] mb-3">
                Scored as demand theme — directional only
              </p>
            )}
            <span
              className={`inline-flex items-center text-xs font-mono font-semibold px-3 py-1 rounded-full border ${styles.badge}`}
            >
              {report.decision_label}
            </span>
          </div>
          <div className="text-center sm:text-right">
            <div className={`font-mono text-6xl font-bold tabular-nums ${scoreColor}`}>
              {report.score}
            </div>
            <div className="text-xs font-mono text-[#94A3B8] mt-1">/ 100 saturation</div>
            <p className="text-[10px] text-[#64748B] mt-2 font-mono">
              Lower = more opportunity
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-[#E2E8F0] leading-relaxed">{report.summary}</p>
        <p className="mt-3 text-sm text-[#94A3B8] leading-relaxed">{report.insight}</p>

        {report.data_mode === "heuristic" && (
          <p className="mt-4 text-xs text-[#FBBF24] font-mono">
            Live search unavailable — showing framework score (heuristic mode).
          </p>
        )}
      </div>

      {/* Factors */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0E1223] p-6">
        <h3 className="font-mono font-bold text-sm mb-1">Score breakdown</h3>
        <p className="text-xs text-[#64748B] mb-5">
          Weighted factors · higher bar = more saturation pressure
        </p>
        <div className="space-y-4">
          {report.factors.map((f) => (
            <div key={f.id}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-sm text-[#F8FAFC]">{f.label}</span>
                <span className="text-xs font-mono text-[#94A3B8]">
                  {f.score}/100 · {Math.round(f.weight * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full ${styles.bar} opacity-80`}
                  style={{ width: `${f.score}%` }}
                />
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Niche down */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0E1223] p-6">
        <h3 className="font-mono font-bold text-sm mb-3">Niche-down ideas</h3>
        <ul className="space-y-2">
          {report.niche_down.map((n) => (
            <li
              key={n}
              className="text-sm text-[#CBD5E1] flex gap-2 leading-relaxed"
            >
              <span className="text-[#22C55E] shrink-0">→</span>
              {n}
            </li>
          ))}
        </ul>
      </div>

      {/* Research samples */}
      {report.research?.sample_competitors && report.research.sample_competitors.length > 0 && (
        <div className="rounded-xl border border-[#1E293B] bg-[#0E1223] p-6">
          <h3 className="font-mono font-bold text-sm mb-1">Sample search signals</h3>
          <p className="text-xs text-[#64748B] mb-4">
            ~{report.research.competitor_count_est ?? 0} competitor-ish results ·{" "}
            {report.research.reddit_thread_count ?? 0} Reddit hits
            {report.research.named_tools && report.research.named_tools.length > 0 && (
              <> · tools seen: {report.research.named_tools.slice(0, 6).join(", ")}</>
            )}
          </p>
          <ul className="space-y-3">
            {report.research.sample_competitors.slice(0, 4).map((c) => (
              <li key={c.link} className="text-sm">
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#818CF8] hover:text-[#A5B4FC] font-medium"
                >
                  {c.title}
                </a>
                {c.snippet && (
                  <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{c.snippet}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Methodology */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0A0F1C] p-5">
        <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-2">
          Methodology
        </p>
        <p className="text-xs text-[#94A3B8] leading-relaxed">{report.methodology_note}</p>
        <p className="text-[10px] font-mono text-[#64748B] mt-3">
          Bands: Go {report.bands.go} · Caution {report.bands.caution} · No-go {report.bands.no_go}
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onReset}
          className="border border-[#1E293B] hover:border-[#6366F1] text-[#F8FAFC] px-6 py-3 rounded-lg font-medium text-sm transition-colors cursor-pointer"
        >
          Score another idea
        </button>
        {(report.decision === "go" || report.decision === "caution") && (
          <Link
            href="/#explore-reddit"
            className="text-center bg-[#6366F1] hover:bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
            style={{ boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}
          >
            When you ship — find Reddit threads
          </Link>
        )}
      </div>
    </div>
  );
}
