"use client";

import { useState } from "react";
import type { GrowthThread } from "../_types";

interface ThreadCardProps {
  thread: GrowthThread;
  index: number;
  isPro: boolean;
  onUpgrade?: () => void;
}

function riskLabel(risk: string) {
  if (risk === "low") return { text: "Safe to mention product", className: "text-accent border-accent/30 bg-accent/10" };
  if (risk === "medium") return { text: "Be subtle", className: "text-amber-400 border-amber-400/30 bg-amber-400/10" };
  return { text: "High promo risk", className: "text-destructive border-destructive/30 bg-destructive/10" };
}

export function ThreadCard({ thread, index, isPro, onUpgrade }: ThreadCardProps) {
  const [copied, setCopied] = useState(false);
  const locked = thread.locked && !isPro;
  const risk = riskLabel(thread.promoRisk);

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
    <article className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                Conversation {index + 1}
              </span>
              <span className="text-[10px] font-mono uppercase text-primary">{thread.source}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${risk.className}`}>
                {risk.text}
              </span>
            </div>
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm sm:text-base font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {thread.title}
            </a>
          </div>
          <div className="shrink-0 text-center">
            <p className="font-mono text-lg font-bold text-primary leading-none">{thread.relevanceScore}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">match</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{thread.matchReason}</p>
        {thread.snippet && (
          <p className="text-xs text-muted-foreground/80 italic mt-2 line-clamp-2">
            &ldquo;{thread.snippet}&rdquo;
          </p>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">
          Your reply draft
        </p>
        <div className={`rounded-lg bg-muted/40 p-4 ${locked ? "relative overflow-hidden" : ""}`}>
          {locked && (
            <div className="absolute inset-0 bg-card/85 backdrop-blur-[2px] flex items-center justify-center z-10">
              <button
                type="button"
                onClick={onUpgrade}
                className="text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                Upgrade to unlock full reply
              </button>
            </div>
          )}
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {thread.suggestedReply}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {copied ? "Copied!" : locked ? "Unlock & copy" : "Copy reply"}
          </button>
          <a
            href={thread.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-4 py-2 rounded-lg border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
          >
            Open thread →
          </a>
        </div>
      </div>
    </article>
  );
}