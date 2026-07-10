"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { waitlistSource } from "../_lib/attribution";
import {
  admitWaitlist,
  fetchWaitlistStats,
  joinWaitlist,
  storeWaitlistEmail,
  type WaitlistJoinResult,
  type WaitlistStats,
} from "../_lib/waitlist";

interface WaitlistFormProps {
  source?: string;
  variant?: "hero" | "footer";
}

type Phase = "form" | "entering" | "slot" | "admitted";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimum time on "entering" before showing the slot message */
const ENTERING_MS = 2_500;
/** Full waitlist theater must run at least this long before "You're in" */
const MIN_FLOW_MS = 5_000;

export function WaitlistForm({ source = "homepage", variant = "hero" }: WaitlistFormProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignUp } = useClerk();

  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [result, setResult] = useState<WaitlistJoinResult | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchWaitlistStats().then((s) => {
        if (!cancelled && s) setStats(s);
      });
    };
    load();
    // Refresh often enough that social-proof numbers feel live
    const id = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (phase !== "admitted" || !isLoaded) return;
    storeWaitlistEmail(result?.email ?? email);
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [phase, isLoaded, isSignedIn, result, email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || phase !== "form") return;

    setError("");
    setPhase("entering");

    const flowStart = Date.now();
    const apiPromise = joinWaitlist(trimmed, waitlistSource(source));

    await delay(ENTERING_MS);
    setPhase("slot");

    try {
      const data = await apiPromise;
      const elapsed = Date.now() - flowStart;
      await delay(Math.max(0, MIN_FLOW_MS - elapsed));

      setResult(data);
      setStats((prev) =>
        prev && !data.already_joined
          ? { ...prev, display_count: data.display_count, signups: prev.signups + 1 }
          : prev,
      );
      await admitWaitlist(data.email);
      setPhase("admitted");
    } catch (err) {
      setPhase("form");
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  const handleContinue = () => {
    storeWaitlistEmail(result?.email ?? email);
    if (isSignedIn) {
      router.push("/dashboard");
      return;
    }
    openSignUp({
      forceRedirectUrl: "/dashboard",
      signInForceRedirectUrl: "/dashboard",
    });
  };

  const isHero = variant === "hero";

  if (phase === "entering" || phase === "slot") {
    return (
      <div
        className="w-full max-w-xl mx-auto rounded-xl border border-[#1E293B] bg-[#0E1223] p-8 text-center"
        aria-live="polite"
      >
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin mb-5" />
        {phase === "entering" ? (
          <>
            <p className="font-mono text-sm font-semibold text-[#F8FAFC] mb-2">Entering waitlist…</p>
            <p className="text-xs text-[#64748B]">Finding your place in line</p>
          </>
        ) : (
          <>
            <p className="font-mono text-sm font-semibold text-[#F59E0B] mb-2">Oh wait — a slot just opened up</p>
            <p className="text-xs text-[#94A3B8]">Trying to get you in…</p>
          </>
        )}
      </div>
    );
  }

  if (phase === "admitted") {
    return (
      <div
        className="w-full max-w-xl mx-auto rounded-xl border border-[#22C55E]/40 bg-[#0E1223] p-8 text-center"
        style={{ boxShadow: "0 0 24px rgba(34,197,94,0.12)" }}
        aria-live="polite"
      >
        <p className="text-xs font-mono text-[#22C55E] uppercase tracking-widest mb-2">You&apos;re in</p>
        <p className="font-mono text-xl font-bold text-[#F8FAFC] mb-2">Welcome to Thynkk</p>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
          A spot opened up for <span className="text-[#CBD5E1]">{result?.email ?? email}</span>.
          Create your account and run your first growth scan.
        </p>
        <button
          type="button"
          onClick={handleContinue}
          className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
        >
          {isSignedIn ? "Go to dashboard" : "Create account & start scanning"}
        </button>
        <p className="text-xs text-[#64748B] mt-4">1 free scan included · No credit card</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {stats && isHero && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-mono text-[#94A3B8] mb-4">
          <span>
            <span className="text-[#F8FAFC] font-semibold tabular-nums transition-all duration-500">
              {formatCount(stats.display_count)}
            </span>
            {" "}on waitlist
          </span>
          <span className="text-[#475569] hidden sm:inline">·</span>
          <span>
            <span className="text-[#6366F1] font-semibold tabular-nums transition-all duration-500">
              {formatCount(stats.invites_sent_this_week)}
            </span>
            {" "}let in this week
          </span>
          <span className="text-[#475569] hidden sm:inline">·</span>
          <span>
            <span className="text-[#F59E0B] font-semibold tabular-nums transition-all duration-500">
              {formatCount(stats.spots_left_today ?? 0)}
            </span>
            {" "}spots left today
          </span>
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
          disabled={!email.trim()}
          className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-lg font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
          style={isHero ? { boxShadow: "0 0 24px rgba(99,102,241,0.35)" } : undefined}
        >
          Join waitlist
        </button>
      </form>

      {error && <p className="text-xs text-[#EF4444] mt-2 text-left">{error}</p>}

      {isHero && (
        <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
          Enter your email to request access. Spots open daily — most people get in within a minute.
        </p>
      )}
    </div>
  );
}