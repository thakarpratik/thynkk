"use client";

import { useState } from "react";
import type { PostIdea } from "../_types";

interface PostIdeaCardProps {
  idea: PostIdea;
  index: number;
  isPro: boolean;
  onUpgrade?: () => void;
}

export function PostIdeaCard({ idea, index, isPro, onUpgrade }: PostIdeaCardProps) {
  const locked = idea.locked && !isPro;
  const [copied, setCopied] = useState<"title" | "body" | "both" | null>(null);

  const flash = (kind: "title" | "body" | "both") => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyTitle = async () => {
    if (locked) {
      onUpgrade?.();
      return;
    }
    await navigator.clipboard.writeText(idea.title);
    flash("title");
  };

  const handleCopyBody = async () => {
    if (locked) {
      onUpgrade?.();
      return;
    }
    await navigator.clipboard.writeText(idea.body || idea.hook);
    flash("body");
  };

  const handleCopyBoth = async () => {
    if (locked) {
      onUpgrade?.();
      return;
    }
    const text = `${idea.title}\n\n${idea.body || idea.hook}`;
    await navigator.clipboard.writeText(text);
    flash("both");
  };

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground">
            Post idea {index + 1}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent">
            {idea.targetCommunity}
          </span>
        </div>

        <h3 className="font-mono text-base font-semibold text-foreground mb-2">{idea.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary font-medium">Hook: </span>
          {idea.hook}
        </p>
      </div>

      <div className="px-5 py-4">
        <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">
          Ready to post
        </p>
        <div className={`rounded-lg bg-muted/40 p-4 ${locked ? "relative overflow-hidden" : ""}`}>
          {locked && (
            <div className="absolute inset-0 bg-card/85 backdrop-blur-[2px] flex items-center justify-center z-10">
              <button
                type="button"
                onClick={onUpgrade}
                className="text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                Upgrade to unlock full post draft
              </button>
            </div>
          )}
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {idea.body || idea.hook}
          </p>
        </div>

        {idea.outline.length > 0 && (
          <details className="mt-4 rounded-lg border border-border/60 bg-muted/20">
            <summary className="cursor-pointer px-4 py-2.5 text-xs font-mono text-muted-foreground uppercase tracking-widest list-none flex items-center justify-between">
              <span>Outline</span>
              <span className="text-[10px] normal-case tracking-normal opacity-70">toggle</span>
            </summary>
            <ol className="space-y-2 px-4 pb-4">
              {idea.outline.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`} className="flex gap-3 text-sm text-foreground/90">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{line}</span>
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={handleCopyBoth}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {copied === "both" ? "Copied!" : locked ? "Unlock & copy" : "Copy title + body"}
          </button>
          <button
            type="button"
            onClick={handleCopyTitle}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {copied === "title" ? "Title copied!" : "Copy title"}
          </button>
          <button
            type="button"
            onClick={handleCopyBody}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {copied === "body" ? "Body copied!" : "Copy body"}
          </button>
        </div>

        <p className="text-xs text-muted-foreground font-mono mt-4">
          Inspired by: {idea.basedOnTrend}
        </p>
      </div>
    </article>
  );
}
