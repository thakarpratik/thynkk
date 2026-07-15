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
  action: string;
  countKey: "threadCount" | "postCount" | "communityCount";
  hideIfEmpty?: boolean;
  activeRing: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  activeBadge: string;
  idleBorder: string;
  idleHover: string;
  icon: string;
}[] = [
  {
    id: "replies",
    label: "Reply to threads",
    action: "Comment on existing posts",
    countKey: "threadCount",
    activeRing: "ring-sky-500/50",
    activeBg: "bg-sky-500/15",
    activeBorder: "border-sky-500",
    activeText: "text-sky-300",
    activeBadge: "bg-sky-500 text-white",
    idleBorder: "border-sky-500/25",
    idleHover: "hover:border-sky-500/60 hover:bg-sky-500/10",
    icon: "💬",
  },
  {
    id: "posts",
    label: "Create new posts",
    action: "Start your own Reddit threads",
    countKey: "postCount",
    activeRing: "ring-emerald-500/50",
    activeBg: "bg-emerald-500/15",
    activeBorder: "border-emerald-500",
    activeText: "text-emerald-300",
    activeBadge: "bg-emerald-500 text-white",
    idleBorder: "border-emerald-500/25",
    idleHover: "hover:border-emerald-500/60 hover:bg-emerald-500/10",
    icon: "✍️",
  },
  {
    id: "communities",
    label: "Communities",
    action: "Where to post & reply",
    countKey: "communityCount",
    hideIfEmpty: true,
    activeRing: "ring-violet-500/50",
    activeBg: "bg-violet-500/15",
    activeBorder: "border-violet-500",
    activeText: "text-violet-300",
    activeBadge: "bg-violet-500 text-white",
    idleBorder: "border-violet-500/25",
    idleHover: "hover:border-violet-500/60 hover:bg-violet-500/10",
    icon: "🏘️",
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
  const cols =
    visible.length >= 3 ? "sm:grid-cols-3" : visible.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";

  return (
    <nav aria-label="Results type" className="mb-6">
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
        Choose what to do next
      </p>

      <div
        role="tablist"
        className={`grid grid-cols-1 ${cols} gap-3 sticky top-14 z-40`}
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
              className={[
                "w-full text-left rounded-xl border-2 px-4 py-4 transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? `${tab.activeBg} ${tab.activeBorder} ring-2 ${tab.activeRing} shadow-lg shadow-black/20`
                  : `bg-card ${tab.idleBorder} ${tab.idleHover} opacity-90 hover:opacity-100`,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base leading-none" aria-hidden>
                      {tab.icon}
                    </span>
                    <span
                      className={`text-sm font-semibold leading-snug ${
                        isActive ? tab.activeText : "text-foreground"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      isActive ? "text-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {tab.action}
                  </p>
                </div>
                <span
                  className={[
                    "shrink-0 font-mono text-sm font-bold min-w-8 h-8 px-2 rounded-lg flex items-center justify-center",
                    isActive
                      ? tab.activeBadge
                      : "bg-muted text-muted-foreground border border-border",
                  ].join(" ")}
                >
                  {count}
                </span>
              </div>
              {isActive ? (
                <p className={`mt-3 text-[10px] font-mono font-semibold uppercase tracking-wider ${tab.activeText}`}>
                  Selected · viewing below
                </p>
              ) : (
                <p className="mt-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Click to open →
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div
        className={`mt-4 rounded-xl border px-4 py-3 ${
          active === "replies"
            ? "border-sky-500/30 bg-sky-500/5"
            : active === "posts"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-violet-500/30 bg-violet-500/5"
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
            <span className="font-semibold text-violet-300">Where to show up — </span>
            Bookmark these communities. Use them for both replying to threads and creating new posts.
          </p>
        )}
      </div>
    </nav>
  );
}
