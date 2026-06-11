"""
CLI entry point for Mode 1: Pain Point Scanner.

Usage:
    python scripts/run_scan.py r/smallbusiness
    python scripts/run_scan.py "productivity apps"
    python scripts/run_scan.py r/freelance --limit 150 --output report.json
"""

import argparse
import json
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.scanner.analyze import analyze
from app.scanner.discovery import discover_subreddits, get_reddit_client
from app.scanner.harvest import get_engine, harvest
from app.scanner.scoring import score_themes


def run_scan(keyword: str, post_limit: int = 100) -> list[dict]:
    reddit = get_reddit_client()
    engine = get_engine()

    print(f"\n[1/4] Discovering subreddits for: {keyword}")
    subreddits = discover_subreddits(keyword, reddit=reddit, limit=5)

    if not subreddits:
        print("No subreddits found.")
        return []

    for s in subreddits:
        print(f"  → r/{s.name} ({s.subscribers:,} subscribers)")

    all_posts = []
    print(f"\n[2/4] Harvesting posts...")
    for sub in subreddits[:3]:  # Top 3 most relevant subreddits
        posts = harvest(sub.name, reddit, engine, post_limit=post_limit // len(subreddits[:3]))
        print(f"  r/{sub.name}: {len(posts)} pain-point posts matched")
        all_posts.extend(posts)

    if not all_posts:
        print("No pain-point posts found. Try a different keyword.")
        return []

    print(f"\n[3/4] Analyzing {len(all_posts)} posts with Claude...")
    # Use the primary subreddit name for context
    primary_subreddit = subreddits[0].name
    result, usage = analyze(primary_subreddit, all_posts)
    print(f"  Token usage: {usage.input_tokens:,} input / {usage.output_tokens:,} output")
    estimated_cost = (usage.input_tokens / 1_000_000 * 3.0) + (usage.output_tokens / 1_000_000 * 15.0)
    print(f"  Estimated cost: ${estimated_cost:.4f}")

    print(f"\n[4/4] Scoring and ranking {len(result.themes)} themes...")
    scored = score_themes(result, all_posts)

    return scored


def print_report(themes: list[dict], keyword: str) -> None:
    print(f"\n{'='*60}")
    print(f"THYNKK — Pain Point Report")
    print(f"Niche: {keyword}")
    print(f"{'='*60}\n")

    for i, theme in enumerate(themes, 1):
        print(f"#{i} {theme['name'].upper()}")
        print(f"    Demand Score:  {theme['demand_score']}")
        print(f"    Severity:      {theme['severity_score']}/10")
        print(f"    Mentions:      {theme['mention_count']}")
        print(f"    Summary:       {theme['summary']}")
        print(f"    Opportunity:   {theme['opportunity']}")
        if theme["quotes"]:
            q = theme["quotes"][0]
            print(f"    Top Quote:     \"{q['excerpt'][:120]}\"")
            print(f"    Source:        {q['permalink']}")
        print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Thynkk Pain Point Scanner")
    parser.add_argument("keyword", help="Niche keyword or subreddit (e.g. 'r/freelance' or 'productivity apps')")
    parser.add_argument("--limit", type=int, default=100, help="Max posts to harvest (default: 100)")
    parser.add_argument("--output", type=str, help="Save JSON report to file")
    args = parser.parse_args()

    themes = run_scan(args.keyword, post_limit=args.limit)

    if not themes:
        sys.exit(1)

    print_report(themes, args.keyword)

    if args.output:
        out = {
            "keyword": args.keyword,
            "theme_count": len(themes),
            "themes": themes,
        }
        Path(args.output).write_text(json.dumps(out, indent=2, default=str))
        print(f"Report saved to {args.output}")


if __name__ == "__main__":
    main()
