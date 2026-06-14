"""AI analysis — cluster pain-point posts into themes using Claude API."""

from dataclasses import dataclass
import json
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError

from app.scanner.harvest import HarvestedPost

load_dotenv()

_PROMPT_PATH = Path(__file__).parent / "prompts" / "cluster_themes.txt"
_MODEL = "claude-sonnet-4-6"
_MAX_POSTS_PER_BATCH = 50  # Keep context window sane + cost controlled


class Quote(BaseModel):
    excerpt: str
    post_id: str
    permalink: str


class Theme(BaseModel):
    name: str
    summary: str
    opportunity: str
    severity_score: int
    mention_count: int
    verdict: str = "Unknown"
    willingness_to_pay: str = "Unknown"
    willingness_reason: str = ""
    competition: str = ""
    next_step: str = ""
    quotes: list[Quote]


class AnalysisResult(BaseModel):
    themes: list[Theme]


@dataclass
class TokenUsage:
    input_tokens: int
    output_tokens: int

    @property
    def total(self) -> int:
        return self.input_tokens + self.output_tokens


def _load_prompt(subreddit: str, posts: list[HarvestedPost]) -> str:
    template = _PROMPT_PATH.read_text()

    post_blocks = []
    for p in posts:
        block = f"POST ID: {p.reddit_id}\nURL: https://reddit.com{p.permalink}\nTITLE: {p.title}\n"
        if p.body:
            block += f"BODY: {p.body[:800]}\n"
        if p.top_comments:
            block += "TOP COMMENTS:\n" + "\n".join(f"  - {c[:300]}" for c in p.top_comments)
        post_blocks.append(block)

    return (
        template
        .replace("{{subreddit}}", subreddit)
        .replace("{{post_count}}", str(len(posts)))
        .replace("{{posts}}", "\n---\n".join(post_blocks))
    )


def analyze(
    subreddit: str,
    posts: list[HarvestedPost],
    client: anthropic.Anthropic | None = None,
) -> tuple[AnalysisResult, TokenUsage]:
    """Cluster pain-point posts into themes. Returns result + token usage for cost tracking."""
    if not posts:
        return AnalysisResult(themes=[]), TokenUsage(0, 0)

    if client is None:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Batch to avoid oversized prompts
    batch = posts[:_MAX_POSTS_PER_BATCH]
    prompt = _load_prompt(subreddit, batch)

    response = client.messages.create(
        model=_MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    usage = TokenUsage(
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )

    raw = response.content[0].text.strip()

    # Retry once if JSON is wrapped in markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
        result = AnalysisResult(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\n\nRaw response:\n{raw[:500]}")

    return result, usage


if __name__ == "__main__":
    import sys
    from app.scanner.discovery import get_reddit_client
    from app.scanner.harvest import get_engine, harvest

    subreddit = sys.argv[1].lstrip("r/") if len(sys.argv) > 1 else "smallbusiness"
    print(f"Analyzing r/{subreddit}...\n")

    reddit = get_reddit_client()
    engine = get_engine()
    posts = harvest(subreddit, reddit, engine, post_limit=60)
    print(f"Harvested {len(posts)} pain-point posts. Sending to Claude...\n")

    result, usage = analyze(subreddit, posts)
    print(f"Token usage: {usage.input_tokens} in / {usage.output_tokens} out\n")

    for i, theme in enumerate(result.themes, 1):
        print(f"{i}. {theme.name} (severity: {theme.severity_score}/10, mentions: {theme.mention_count})")
        print(f"   {theme.summary}")
        print(f"   OPPORTUNITY: {theme.opportunity}")
        if theme.quotes:
            print(f"   QUOTE: \"{theme.quotes[0].excerpt[:120]}\"")
        print()
