"""Pain-point phrase matching against post/comment text."""

from pathlib import Path
import re
import yaml


_PHRASES_PATH = Path(__file__).parent.parent.parent / "config" / "pain_phrases.yaml"


def load_phrases() -> dict[str, list[str]]:
    with open(_PHRASES_PATH) as f:
        return yaml.safe_load(f)


def _build_pattern(phrases: dict[str, list[str]]) -> re.Pattern:
    all_phrases = [p for group in phrases.values() for p in group]
    escaped = [re.escape(p) for p in all_phrases]
    return re.compile("|".join(escaped), re.IGNORECASE)


_PHRASES = load_phrases()
_PATTERN = _build_pattern(_PHRASES)


def matches_pain_point(text: str) -> bool:
    """Return True if text contains any pain-point phrase."""
    return bool(_PATTERN.search(text))


def matched_phrases(text: str) -> list[str]:
    """Return all pain-point phrases found in text (for debugging/logging)."""
    return [m.group() for m in _PATTERN.finditer(text)]


if __name__ == "__main__":
    samples = [
        "I wish there was a tool to automate this",
        "How do you guys handle invoicing?",
        "Just a normal post about my weekend",
        "I'd pay for something that does this automatically",
        "frustrated with how long this takes",
    ]
    for s in samples:
        hit = matches_pain_point(s)
        phrases = matched_phrases(s) if hit else []
        print(f"{'HIT ' if hit else 'miss'} | {phrases} | {s}")
