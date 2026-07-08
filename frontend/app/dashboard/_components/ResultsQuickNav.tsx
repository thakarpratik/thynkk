interface ResultsQuickNavProps {
  threadCount: number;
  postCount: number;
  communityCount: number;
}

export function ResultsQuickNav({ threadCount, postCount, communityCount }: ResultsQuickNavProps) {
  const links = [
    { href: "#section-1", label: "Conversations", count: threadCount },
    { href: "#section-2", label: "Post ideas", count: postCount },
    ...(communityCount > 0 ? [{ href: "#section-3", label: "Communities", count: communityCount }] : []),
  ];

  return (
    <nav
      aria-label="Jump to results"
      className="sticky top-14 z-40 -mx-4 sm:-mx-0 mb-6 py-3 bg-background/90 backdrop-blur-sm border-b border-border sm:rounded-xl sm:border sm:px-2"
    >
      <div className="flex gap-1 overflow-x-auto px-4 sm:px-1 scrollbar-none">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="shrink-0 text-xs font-medium px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {link.label}
            <span className="ml-1.5 font-mono text-primary">{link.count}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}