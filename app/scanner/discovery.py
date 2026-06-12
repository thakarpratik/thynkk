"""Subreddit discovery — find relevant subreddits for a niche keyword."""

from app.scanner.source_provider import RawSubreddit, SourceProvider
from app.scanner.providers.pullpush_provider import PullPushProvider


def discover_subreddits(
    keyword: str,
    provider: SourceProvider | None = None,
    limit: int = 10,
) -> list[RawSubreddit]:
    """Search for subreddits matching a niche keyword.

    If keyword starts with 'r/' it is treated as a direct subreddit name.
    """
    if provider is None:
        provider = PullPushProvider()

    if keyword.startswith("r/"):
        name = keyword[2:].strip("/")
        return [provider.get_subreddit(name)]

    return provider.search_subreddits(keyword, limit=limit)


if __name__ == "__main__":
    import sys

    keyword = sys.argv[1] if len(sys.argv) > 1 else "small business"
    print(f"Discovering subreddits for: {keyword}\n")
    subs = discover_subreddits(keyword)
    for s in subs:
        print(f"r/{s.name} — {s.subscribers:,} subscribers")
        print(f"  {s.description[:100]}\n")
