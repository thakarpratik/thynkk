"use client";

interface GrowthIdleStateProps {
  onScan: (url: string) => void;
}

const EXAMPLES = [
  { url: "https://monstareel.com", label: "Monstareel", desc: "AI reel tool" },
  { url: "https://linear.app", label: "Linear", desc: "Issue tracking" },
  { url: "https://cal.com", label: "Cal.com", desc: "Scheduling SaaS" },
];

export function GrowthIdleState({ onScan }: GrowthIdleStateProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Paste your site above and hit <span className="text-foreground font-medium">Start scan</span>.
          Thynkk reads your product, finds relevant discussions, and drafts replies you can paste into Reddit.
        </p>
      </div>

      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
          Or try an example
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              onClick={() => onScan(ex.url)}
              className="text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-4 py-3.5 transition-all group cursor-pointer"
            >
              <p className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
                {ex.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{ex.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-mono text-primary uppercase tracking-widest">What you&apos;ll get</p>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              label: "Reply to threads",
              text: "Existing Reddit discussions + copy-ready comment drafts.",
            },
            {
              label: "Create new posts",
              text: "Original post titles & bodies to publish as your own threads.",
            },
            {
              label: "Communities",
              text: "Subreddits where your audience already hangs out.",
            },
          ].map((row) => (
            <div key={row.label} className="px-5 py-4 flex gap-4">
              <span className="text-primary shrink-0 mt-0.5">→</span>
              <div>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{row.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}