"""CLI smoke test for the Trend Radar pipeline.

Usage:
    python scripts/run_radar.py
    python scripts/run_radar.py --subs indiehackers SaaS entrepreneur
"""

import argparse
import sys
from pathlib import Path

# Allow running from repo root or scripts/
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.radar.pulse import collect_titles, TRACKED_SUBREDDITS
from app.radar.analyze import analyze_trends
from app.radar.scoring import score_niches


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--subs", nargs="+", default=None, help="Subreddits to scan (no r/ prefix)")
    parser.add_argument("--limit", type=int, default=25, help="Posts per subreddit (default 25)")
    args = parser.parse_args()

    subs = args.subs or TRACKED_SUBREDDITS
    print(f"Scanning {len(subs)} subreddits: {', '.join(f'r/{s}' for s in subs)}\n")

    posts = collect_titles(subreddits=subs, limit_per_sub=args.limit)
    print(f"Collected {len(posts)} post titles\n")

    if not posts:
        print("ERROR: No posts collected. Reddit may be rate-limiting or blocking this IP.")
        sys.exit(1)

    print("Sending to Claude...\n")
    result, usage = analyze_trends(posts)
    print(f"Token usage: {usage.input_tokens} in / {usage.output_tokens} out\n")

    if not result.niches:
        print("WARNING: Claude returned 0 niches. Check the prompt or raw response.")
        sys.exit(1)

    niches = score_niches(result.niches)
    print(f"{'#':<3} {'Niche':<35} {'Tag':<8} {'Growth':<8} {'Posts':<6} {'Subreddit'}")
    print("-" * 80)
    for i, n in enumerate(niches, 1):
        print(f"{i:<3} {n['niche'][:34]:<35} {n['tag']:<8} {n['growth']:<8} {n['posts']:<6} {n['subreddit']}")
        print(f"    {n['description'][:80]}")
        print()


if __name__ == "__main__":
    main()
