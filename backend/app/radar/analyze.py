"""AI trend clustering — group post titles into emerging niches using Claude."""

import json
import os
from dataclasses import dataclass
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError

from app.radar.pulse import PulsedPost, WINDOW_DAYS

load_dotenv()

_PROMPT_PATH = Path(__file__).parent / "prompts" / "cluster_trends.txt"
_MODEL = "claude-haiku-4-5-20251001"  # cheap — titles only, no long bodies
_MAX_TITLES = 300


class NicheResult(BaseModel):
    niche: str
    description: str
    tag: str  # HOT | RISING | NEW
    growth: str  # e.g. "+180%"
    mention_count: int
    top_subreddit: str


class TrendAnalysis(BaseModel):
    niches: list[NicheResult]


@dataclass
class TokenUsage:
    input_tokens: int
    output_tokens: int


def _build_prompt(posts: list[PulsedPost]) -> str:
    template = _PROMPT_PATH.read_text()

    subreddits = sorted({p.subreddit for p in posts})
    titles = "\n".join(
        f"[r/{p.subreddit}] {p.title}"
        for p in posts[:_MAX_TITLES]
    )

    return (
        template
        .replace("{{subreddits}}", ", ".join(f"r/{s}" for s in subreddits))
        .replace("{{post_count}}", str(min(len(posts), _MAX_TITLES)))
        .replace("{{window_days}}", str(WINDOW_DAYS))
        .replace("{{titles}}", titles)
    )


def analyze_trends(
    posts: list[PulsedPost],
    client: anthropic.Anthropic | None = None,
) -> tuple[TrendAnalysis, TokenUsage]:
    if not posts:
        return TrendAnalysis(niches=[]), TokenUsage(0, 0)

    if client is None:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = _build_prompt(posts)

    response = client.messages.create(
        model=_MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    usage = TokenUsage(
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
        result = TrendAnalysis(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\n\nRaw:\n{raw[:500]}")

    return result, usage
