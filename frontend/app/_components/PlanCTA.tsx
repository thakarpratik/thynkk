"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { fetchBillingStatus } from "../dashboard/_lib/api";

interface PlanCTAProps {
  plan: "free" | "pro";
}

const base =
  "block w-full text-center px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer";

export function PlanCTA({ plan }: PlanCTAProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { openSignUp } = useClerk();
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setIsPro(false);
      setReady(true);
      return;
    }

    let cancelled = false;
    fetchBillingStatus(getToken)
      .then((billing) => {
        if (!cancelled) setIsPro(billing.scan_credits > 0);
      })
      .catch(() => {
        if (!cancelled) setIsPro(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isLoaded, getToken]);

  if (!isLoaded || !ready) {
    return (
      <div
        className={`${base} ${
          plan === "pro"
            ? "bg-[#6366F1]/50 text-white/70"
            : "border border-[#1E293B] text-[#475569]"
        }`}
      >
        Loading…
      </div>
    );
  }

  if (plan === "free") {
    if (!isSignedIn) {
      return (
        <button
          type="button"
          onClick={() =>
            openSignUp({
              forceRedirectUrl: "/dashboard",
              signInForceRedirectUrl: "/dashboard",
            })
          }
          className={`${base} border border-[#1E293B] hover:border-[#6366F1] text-[#F8FAFC]`}
        >
          Start free scan
        </button>
      );
    }

    if (isPro) {
      return (
        <Link
          href="/dashboard"
          className={`${base} border border-[#1E293B] hover:border-[#6366F1] text-[#F8FAFC]`}
        >
          Go to Dashboard
        </Link>
      );
    }

    return (
      <Link
        href="/dashboard"
        className={`${base} border border-[#22C55E]/40 text-[#22C55E] bg-[#22C55E]/10`}
      >
        Current plan
      </Link>
    );
  }

  // Pro plan
  if (!isSignedIn) {
    return (
      <button
        type="button"
        onClick={() =>
          openSignUp({
            forceRedirectUrl: "/dashboard?upgrade=true",
            signInForceRedirectUrl: "/dashboard?upgrade=true",
          })
        }
        className={`${base} bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors`}
      >
        Sign up &amp; buy Launch Pack
      </button>
    );
  }

  if (isPro) {
    return (
      <Link
        href="/dashboard"
        className={`${base} bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E]`}
      >
        Launch Pack active — Go to Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard?upgrade=true"
      className={`${base} bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors`}
    >
      Buy Launch Pack — $19
    </Link>
  );
}