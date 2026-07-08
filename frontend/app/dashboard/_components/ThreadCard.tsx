"use client";

import { useState } from "react";
import type { GrowthThread } from "../_types";

interface ThreadCardProps {
  thread: GrowthThread;
  index: number;
  isPro: boolean;
  onUpgrade?: () => void;
}

function riskColor(risk: string) {
  if (risk === "low") return "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10";
  if (risk === "medium") return "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10";
  return "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10";
}

export function ThreadCard({ thread, index, isPro, onUpgrade }: ThreadCardProps) {
  const [copied, setCopied] = useState(false);
  const locked = thread.locked && !isPro;

  const handleCopy = async () => {
    if (locked) {
      onUpgrade?.();
      return;
    }
    await navigator.clipboard.writeText(thread.suggestedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0E1223] border border-[#1E293B] hover:border-[#6366F1]/40 rounded-lg p-5 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-mono text-[#475569]">#{index + 1}</span>
            <span className="text-[10px] font-mono uppercase text-[#6366F1]">{thread.source}</span>
            <span className="text-[10px] font-mono text-[#475569]">{thread.intentType}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${riskColor(thread.promoRisk)}`}>
              {thread.promoRisk} promo risk
            </span>
          </div>
          <a
            href={thread.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-[#F8FAFC] hover:text-[#818CF8] transition-colors line-clamp-2"
          >
            {thread.title}
          </a>
        </div>
        <span className="text-xs font-mono text-[#6366F1] shrink-0">{thread.relevanceScore}</span>
      </div>

      <p className="text-xs text-[#94A3B8] mb-3">{thread.matchReason}</p>
      {thread.snippet && (
        <p className="text-xs text-[#475569] italic mb-4 line-clamp-2">&ldquo;{thread.snippet}&rdquo;</p>
      )}

      <div className={`bg-[#1A1E2F] rounded-md p-4 ${locked ? "relative overflow-hidden" : ""}`}>
        {locked && (
          <div className="absolute inset-0 bg-[#0E1223]/80 backdrop-blur-[2px] flex items-center justify-center z-10">
            <button type="button" onClick={onUpgrade} className="text-xs font-mono text-[#6366F1] hover:underline cursor-pointer">
              Upgrade for full reply draft
            </button>
          </div>
        )}
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-2">Suggested reply</p>
        <p className="text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">{thread.suggestedReply}</p>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-mono px-3 py-1.5 rounded border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
        >
          {copied ? "Copied!" : locked ? "Unlock copy" : "Copy reply"}
        </button>
        <a
          href={thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono px-3 py-1.5 rounded border border-[#1E293B] hover:border-[#6366F1] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          Open thread
        </a>
      </div>
    </div>
  );
}