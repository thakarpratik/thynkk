"use client";

import { useEffect, useState } from "react";
import { PRO_FEATURE_LIST, PRO_PRICE_LABEL } from "../../_lib/pricing";
import { PayPalSubscribe } from "./PayPalSubscribe";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (subscriptionId: string) => Promise<void>;
  error?: string;
}

export function UpgradeModal({ open, onClose, onSuccess, error: externalError }: UpgradeModalProps) {
  const [localError, setLocalError] = useState("");
  const error = externalError || localError;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (open) setLocalError("");
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#020617]/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade to Pro"
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-[#0E1223] border border-[#6366F1]/40 rounded-lg p-6 shadow-2xl" style={{ boxShadow: "0 0 32px rgba(99,102,241,0.2)" }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-1">Pro</p>
              <h2 className="font-mono font-bold text-lg text-[#F8FAFC]">Unlock full growth reports</h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-[#94A3B8] mb-4 leading-relaxed">
            {PRO_PRICE_LABEL} — full Reddit growth reports with reply drafts, post ideas, and enough monthly scans for real launches (not scan spam).
          </p>

          <ul className="space-y-2 text-xs text-[#94A3B8] mb-5">
            {PRO_FEATURE_LIST.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-[#22C55E]">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-xs text-[#EF4444] font-mono mb-3">{error}</p>
          )}

          <PayPalSubscribe
            onSuccess={async (id) => {
              await onSuccess(id);
              onClose();
            }}
            onError={setLocalError}
          />

          <p className="text-[10px] text-[#475569] text-center mt-3">Cancel anytime via PayPal</p>
        </div>
      </div>
    </>
  );
}