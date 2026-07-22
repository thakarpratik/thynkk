"use client";

import { useState } from "react";
import { isValidEmail } from "../_lib/email";

interface EmailGateProps {
  idea: string;
  initialEmail?: string;
  loading?: boolean;
  error?: string;
  onSubmit: (email: string) => void;
  onBack?: () => void;
}

export function EmailGate({
  idea,
  initialEmail = "",
  loading,
  error,
  onSubmit,
  onBack,
}: EmailGateProps) {
  const [email, setEmail] = useState(initialEmail);
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError("");
    onSubmit(trimmed);
  };

  const displayError = localError || error;

  return (
    <div className="mt-8 rounded-xl border border-[#22C55E]/30 bg-[#0E1223] p-6 sm:p-8">
      <p className="text-[10px] font-mono text-[#22C55E] uppercase tracking-widest mb-2">
        Almost there
      </p>
      <h3 className="font-mono font-bold text-xl text-[#F8FAFC] mb-2">
        Enter your email to unlock the score
      </h3>
      <p className="text-sm text-[#94A3B8] leading-relaxed mb-1">
        Free report for{" "}
        <span className="text-[#F8FAFC] font-mono">“{idea}”</span>
      </p>
      <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
        No account or password. We use your email to send product updates about Thynkk —
        unsubscribe anytime.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          disabled={loading}
          onChange={(e) => {
            setEmail(e.target.value);
            if (localError) setLocalError("");
          }}
          placeholder="you@company.com"
          className="w-full bg-[#020617] border border-[#1E293B] focus:border-[#22C55E] outline-none text-[#F8FAFC] placeholder:text-[#94A3B8]/50 px-4 py-3.5 rounded-lg text-sm font-mono transition-colors disabled:opacity-60"
          aria-label="Email address"
        />
        {displayError && (
          <p className="text-xs text-[#FCA5A5] font-mono">{displayError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed text-[#0F172A] px-6 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
            style={{ boxShadow: "0 0 20px rgba(34,197,94,0.25)" }}
          >
            {loading ? "Starting…" : "Unlock score — free"}
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="border border-[#1E293B] hover:border-[#64748B] text-[#94A3B8] hover:text-white px-6 py-3 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
