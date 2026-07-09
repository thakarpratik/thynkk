"use client";

import { useEffect, useState } from "react";
import { fetchWaitlistStats, joinWaitlist, type WaitlistJoinResult, type WaitlistStats } from "../_lib/waitlist";

interface WaitlistFormProps {
  source?: string;
  variant?: "hero" | "footer";
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function WaitlistForm({ source = "homepage", variant = "hero" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [result, setResult] = useState<WaitlistJoinResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWaitlistStats().then(setStats);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await joinWaitlist(email.trim(), source);
      setResult(data);
      setStats((prev) =>
        prev && !data.already_joined
          ? { ...prev, display_count: data.display_count, signups: prev.signups + 1 }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join waitlist. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div
        className={`w-full max-w-xl mx-auto text-left rounded-xl border border-[#6366F1]/40 bg-[#0E1223] p-6 ${
          variant === "footer" ? "text-center" : ""
        }`}
        style={{ boxShadow: "0 0 24px rgba(99,102,241,0.15)" }}
      >
        <p className="text-xs font-mono text-[#22C55E] uppercase tracking-widest mb-2">You&apos;re on the list</p>
        <p className="font-mono text-lg font-bold text-[#F8FAFC] mb-2">
          #{formatCount(result.position)} in line
        </p>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">{result.message}</p>
        <p className="text-xs text-[#64748B] font-mono">
          We&apos;ll email <span className="text-[#CBD5E1]">{result.email}</span> when your invite is ready.
        </p>
      </div>
    );
  }

  const isHero = variant === "hero";

  return (
    <div className="w-full max-w-xl mx-auto">
      {stats && isHero && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-mono text-[#94A3B8] mb-4">
          <span>
            <span className="text-[#F8FAFC] font-semibold tabular-nums">{formatCount(stats.display_count)}</span>
            {" "}on waitlist
          </span>
          <span className="text-[#475569] hidden sm:inline">·</span>
          <span>
            <span className="text-[#6366F1] font-semibold tabular-nums">{formatCount(stats.invites_sent_this_week)}</span>
            {" "}invites sent this week
          </span>
          <span className="text-[#475569] hidden sm:inline">·</span>
          <span>Next batch {stats.next_batch_label}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="flex-1 bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3.5 rounded-lg text-sm transition-colors text-left"
          aria-label="Email for waitlist"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-lg font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
          style={isHero ? { boxShadow: "0 0 24px rgba(99,102,241,0.35)" } : undefined}
        >
          {loading ? "Joining…" : "Join waitlist"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-[#EF4444] mt-2 text-left">{error}</p>
      )}

      {isHero && (
        <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
          Rolling invites weekly. We&apos;ll email you when it&apos;s your turn — usually within 48 hours.
        </p>
      )}
    </div>
  );
}