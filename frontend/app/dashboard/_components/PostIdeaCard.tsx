import type { PostIdea } from "../_types";

interface PostIdeaCardProps {
  idea: PostIdea;
  index: number;
  isPro: boolean;
  onUpgrade?: () => void;
}

export function PostIdeaCard({ idea, index, isPro, onUpgrade }: PostIdeaCardProps) {
  const locked = idea.locked && !isPro;

  return (
    <article className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground">
          Post idea {index + 1}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent">
          {idea.targetCommunity}
        </span>
      </div>

      <h3 className="font-mono text-base font-semibold text-foreground mb-2">{idea.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        <span className="text-primary font-medium">Hook: </span>
        {idea.hook}
      </p>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
          Outline
        </p>
        <ol className="space-y-2">
          {idea.outline.map((line, i) => (
            <li key={line} className="flex gap-3 text-sm text-foreground/90">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{line}</span>
            </li>
          ))}
        </ol>
        {locked && (
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-4 text-sm font-medium text-primary hover:underline cursor-pointer"
          >
            Upgrade for full outline + more ideas
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground font-mono mt-4">
        Inspired by: {idea.basedOnTrend}
      </p>
    </article>
  );
}