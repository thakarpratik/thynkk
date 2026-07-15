"use client";

export type ResultsTab = "replies" | "posts" | "communities";

interface ResultsQuickNavProps {
  active: ResultsTab;
  onChange: (tab: ResultsTab) => void;
  threadCount: number;
  postCount: number;
  communityCount: number;
}

const TABS: {
  id: ResultsTab;
  label: string;
  short: string;
  action: string;
  countKey: "threadCount" | "postCount" | "communityCount";
  hideIfEmpty?: boolean;
}[] = [
  {
    id: "replies",
    label: "Reply to threads",
    short: "Reply",
    action: "Join existing conversations",
    countKey: "threadCount",
  },
  {
    id: "posts",
    label: "Create new posts",
    short: "New posts",
    action: "Start threads on Reddit",
    countKey: "postCount",
  },
  {
    id: "communities",
    label: "Communities",
    short: "Communities",
    action: "Where to post & reply",
    countKey: "communityCount",
    hideIfEmpty: true,
  },
];

export function ResultsQuickNav({
  active,
  onChange,
  threadCount,
  postCount,
  communityCount,
}: ResultsQuickNavProps) {
  const counts = { threadCount, postCount, communityCount };

  const visible = TABS.filter((tab) => !(tab.hideIfEmpty && counts[tab.countKey] === 0));

  return (
    <nav aria-label="Results type" className="mb-6">
      <div className="sticky top-14 z-40 -mx-4 sm:-mx-0 py-3 bg-background/90 backdrop-blur-sm border-b border-border sm:rounded-xl sm:border sm:px-2 sm:py-2">
        <div
          role="tablist"
          className="flex gap-1 overflow-x-auto px-4 sm:px-1 scrollbar-none"
        >
          {visible.map((tab) => {
            const isActive = active === tab.id;
            const count = counts[tab.countKey];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={`shrink-0 flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
                  isActive
                    ? "bg-primary/15 border-primary/40 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isActive ? "text-primary" : ""}`}>
                    <span className="sm:hidden">{tab.short}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                      isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </span>
                <span className={`text-[10px] leading-tight ${isActive ? "text-primary/80" : "text-muted-foreground/80"}`}>
                  {tab.action}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action callout so the two modes never blur together */}
      <div
        className={`mt-4 rounded-xl border px-4 py-3 ${
          active === "replies"
            ? "border-sky-500/30 bg-sky-500/5"
            : active === "posts"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border bg-muted/30"
        }`}
      >
        {active === "replies" && (
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-semibold text-sky-400">Reply mode — </span>
            These are <span className="font-medium">existing Reddit threads</span>. Open the thread,
            paste your reply draft as a comment. Best for quick, high-intent traffic.
          </p>
        )}
        {active === "posts" && (
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-semibold text-emerald-400">Create mode — </span>
            These are <span className="font-medium">new posts you start</span> in a subreddit.
            Copy the title + body, create a post on Reddit — not a reply under someone else.
          </p>
        )}
        {active === "communities" && (
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-semibold text-primary">Where to show up — </span>
            Bookmark these communities. Use them for both replying to threads and creating new posts.
          </p>
        )}
      </div>
    </nav>
  );
}
