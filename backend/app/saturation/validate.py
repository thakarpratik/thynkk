"""Input validation for saturation scoring.

Rejects garbage, ultra-vague singles, and bare mega-categories before any
research APIs run. Themes like "work from home" are accepted with a warning.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

Status = Literal["reject", "needs_confirm", "accept"]
Code = Literal[
    "empty",
    "too_short",
    "too_long",
    "garbage",
    "injection",
    "url_not_allowed",
    "pii",
    "too_vague",
    "too_broad",
    "theme",
    "niche",
    "product_idea",
]

MAX_LEN = 120
MIN_LEN = 3

# Single-token / bare terms that are never specific enough
VAGUE: set[str] = {
    "ai",
    "app",
    "apps",
    "tool",
    "tools",
    "saas",
    "software",
    "platform",
    "system",
    "game",
    "games",
    "gaming",
    "website",
    "web",
    "business",
    "startup",
    "startups",
    "idea",
    "ideas",
    "product",
    "products",
    "service",
    "services",
    "online",
    "digital",
    "tech",
    "technology",
    "crypto",
    "nft",
    "nfts",
    "chatbot",
    "bot",
    "bots",
    "agency",
    "company",
    "companies",
    "solution",
    "solutions",
    "automation",
    "marketplace",
    "plugin",
    "plugins",
    "extension",
    "dashboard",
    "api",
    "ml",
    "llm",
    "gpt",
    "blockchain",
    "web3",
    "metaverse",
    "something",
    "anything",
    "stuff",
    "test",
    "testing",
    "demo",
    "sample",
    "example",
    "hello",
    "hi",
    "help",
    "best",
    "top",
    "new",
    "cool",
    "good",
}

# Whole industries / horizontal categories (need a wedge)
BROAD: set[str] = {
    "furniture",
    "healthcare",
    "health care",
    "health",
    "education",
    "fitness",
    "finance",
    "fintech",
    "banking",
    "insurance",
    "legal",
    "law",
    "real estate",
    "realestate",
    "property",
    "ecommerce",
    "e-commerce",
    "e commerce",
    "retail",
    "shopping",
    "food",
    "restaurant",
    "restaurants",
    "travel",
    "tourism",
    "fashion",
    "clothing",
    "beauty",
    "cosmetics",
    "marketing",
    "sales",
    "advertising",
    "seo",
    "crm",
    "erp",
    "hr",
    "human resources",
    "accounting",
    "bookkeeping",
    "logistics",
    "shipping",
    "construction",
    "manufacturing",
    "agriculture",
    "farming",
    "energy",
    "oil",
    "gas",
    "automotive",
    "cars",
    "music",
    "video",
    "photos",
    "photography",
    "media",
    "news",
    "social media",
    "dating",
    "jobs",
    "hiring",
    "recruiting",
    "recruitment",
    "project management",
    "task management",
    "email marketing",
    "content marketing",
    "digital marketing",
    "social media marketing",
    "customer support",
    "customer service",
    "analytics",
    "bi",
    "business intelligence",
    "productivity",
    "collaboration",
    "communication",
    "messaging",
    "chat",
    "calendar",
    "notes",
    "documents",
    "storage",
    "cloud",
    "security",
    "cybersecurity",
    "devops",
    "developer tools",
    "dev tools",
    "home",
    "interior design",
    "decor",
    "home decor",
    "pets",
    "parenting",
    "kids",
    "children",
    "sports",
    "gaming industry",
    "entertainment",
    "streaming",
    "podcast",
    "podcasts",
    "blogging",
    "writing",
    "design",
    "graphic design",
    "web design",
    "consulting",
    "coaching",
    "therapy",
    "mental health",
    "medicine",
    "dental",
    "dentist",
    "pharmacy",
    "logistics software",
    "inventory",
    "inventory management",
    "pos",
    "point of sale",
}

# Valid demand themes — scoreable but directional only
THEME: set[str] = {
    "work from home",
    "work-from-home",
    "wfh",
    "remote work",
    "remote working",
    "hybrid work",
    "side hustle",
    "side hustles",
    "passive income",
    "meal prep",
    "meal prepping",
    "personal finance",
    "no code",
    "nocode",
    "no-code",
    "low code",
    "bootstrapping",
    "indie hacking",
    "build in public",
    "solopreneur",
    "solopreneurs",
    "digital nomad",
    "digital nomads",
    "creator economy",
    "content creation",
    "freelance",
    "freelancing",
    "gig economy",
    "home office",
    "time management",
    "habit tracking",
    "habit tracker",
    "mental wellness",
    "burnout",
    "deep work",
}

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"you\s+are\s+(now\s+)?(a|an|chatgpt|claude|gpt)", re.I),
    re.compile(r"system\s*:\s*", re.I),
    re.compile(r"<\s*/?\s*script", re.I),
    re.compile(r"\{\{.*\}\}"),
]

URL_RE = re.compile(r"(https?://|www\.)", re.I)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[\d\s\-().]{10,}$")
HANDLE_RE = re.compile(r"^@[\w.]{2,}$")
LETTERS_RE = re.compile(r"[a-zA-Z]")
REPEAT_CHAR_RE = re.compile(r"(.)\1{3,}")
NON_ALNUM_HEAVY = re.compile(r"[^a-zA-Z0-9\s]")

# Wedge markers that signal niche specificity
AUDIENCE_RE = re.compile(
    r"\b(for|for\s+the|aimed\s+at|built\s+for|helping|help)\b",
    re.I,
)
USE_CASE_HINTS = {
    "scheduling",
    "invoicing",
    "invoice",
    "billing",
    "quoting",
    "inventory",
    "crm",
    "booking",
    "analytics",
    "reporting",
    "automation",
    "tracker",
    "tracking",
    "manager",
    "management",
    "generator",
    "builder",
    "editor",
    "assistant",
    "copilot",
    "monitor",
    "monitoring",
    "reminder",
    "reminders",
    "onboarding",
    "payroll",
    "accounting",
    "forecasting",
    "scraping",
    "outreach",
    "email",
    "newsletter",
    "landing",
    "checkout",
    "subscription",
    "waitlist",
    "feedback",
    "survey",
    "form",
    "forms",
    "chat",
    "support",
    "ticketing",
    "kanban",
    "pipeline",
    "lead",
    "leads",
    "seo",
    "content",
    "reel",
    "reels",
    "video",
    "transcription",
    "note",
    "notes",
    "meeting",
    "meetings",
    "standup",
    "async",
}


@dataclass
class ValidationResult:
    status: Status
    level: int  # 0–5
    code: Code
    message: str
    normalized_input: str = ""
    examples: list[str] = field(default_factory=list)
    suggested_rewrite: str | None = None
    is_theme: bool = False

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "level": self.level,
            "code": self.code,
            "message": self.message,
            "normalized_input": self.normalized_input,
            "examples": self.examples,
            "suggested_rewrite": self.suggested_rewrite,
            "is_theme": self.is_theme,
        }


def normalize_input(raw: str) -> str:
    text = (raw or "").strip()
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = re.sub(r"\s+", " ", text)
    return text[:MAX_LEN]


def _word_list(text: str) -> list[str]:
    return [w for w in re.split(r"[\s,/|+]+", text.lower()) if w]


def _is_garbage(text: str) -> bool:
    if not LETTERS_RE.search(text):
        return True
    if REPEAT_CHAR_RE.search(text.lower()):
        return True
    letters = re.findall(r"[a-zA-Z]", text)
    if letters and len(NON_ALNUM_HEAVY.findall(text)) / max(len(text), 1) > 0.4:
        return True
    # Keyboard smash / no vowels for single long token
    words = _word_list(text)
    if len(words) == 1:
        w = words[0]
        if len(w) >= 6 and not re.search(r"[aeiou]", w, re.I):
            return True
        if len(w) >= 8 and len(set(w.lower())) <= 3:
            return True
    return False


def _examples_for(code: Code, normalized: str) -> list[str]:
    seed = normalized.split()[0] if normalized.split() else "niche"
    seed = re.sub(r"[^a-zA-Z0-9\-]", "", seed)[:20] or "niche"
    if code in ("too_vague", "too_broad", "theme"):
        return [
            f"AI scheduling for freelance {seed}s" if seed != "niche" else "AI scheduling for freelance designers",
            f"{seed} inventory software for small workshops" if seed != "niche" else "inventory software for small workshops",
            "invoice reminders for solo freelancers",
        ]
    if code == "garbage":
        return [
            "invoice reminders for freelancers",
            "project management for construction crews",
            "CRM for independent insurance agents",
        ]
    return [
        "AI scheduling for freelance designers",
        "habit tracking game for remote teams",
        "custom furniture quoting for workshops",
    ]


def _suggested_rewrite(normalized: str, code: Code) -> str | None:
    words = _word_list(normalized)
    if not words:
        return None
    core = words[0]
    if code == "too_vague":
        return f"{core} tool for freelancers who need better workflows"
    if code == "too_broad":
        return f"{normalized} software for a specific customer segment (who + problem)"
    if code == "theme":
        return f"async standup tool for remote {core} teams"
    return None


def validate_saturation_input(
    raw: str,
    *,
    confirm_broad_theme: bool = False,
) -> ValidationResult:
    """Validate a saturation idea input.

    Returns reject | needs_confirm | accept. Scoring should only run on accept
    (or needs_confirm after user confirms a broad theme).
    """
    normalized = normalize_input(raw)
    lower = normalized.lower().strip(" .,!?:;")

    if not normalized:
        return ValidationResult(
            status="reject",
            level=0,
            code="empty",
            message="Enter an idea, niche, or product concept.",
            examples=_examples_for("garbage", ""),
        )

    # Known ultra-short vague tokens (e.g. "ai", "hr") before generic length check
    lower_early = normalized.lower().strip(" .,!?:;")
    if lower_early in VAGUE or lower_early in BROAD:
        code: Code = "too_vague" if lower_early in VAGUE else "too_broad"
        return ValidationResult(
            status="reject",
            level=1 if code == "too_vague" else 2,
            code=code,
            message=(
                f"“{normalized}” is too vague to score. Add who it’s for and what it does."
                if code == "too_vague"
                else f"“{normalized}” is a whole market, not a niche we can score fairly. Narrow it: who + problem."
            ),
            normalized_input=normalized,
            examples=_examples_for(code, normalized),
            suggested_rewrite=_suggested_rewrite(normalized, code),
        )

    if len(normalized) < MIN_LEN:
        return ValidationResult(
            status="reject",
            level=0,
            code="too_short",
            message="Too short — describe the niche in a few words.",
            normalized_input=normalized,
            examples=_examples_for("too_vague", normalized),
        )

    if len(normalized) > MAX_LEN:
        return ValidationResult(
            status="reject",
            level=0,
            code="too_long",
            message=f"Keep it under {MAX_LEN} characters.",
            normalized_input=normalized[:MAX_LEN],
        )

    if URL_RE.search(normalized) or lower.startswith("http"):
        return ValidationResult(
            status="reject",
            level=0,
            code="url_not_allowed",
            message=(
                "For a live site, use Find Reddit threads on the homepage. "
                "Saturation is for ideas described in words (no URL)."
            ),
            normalized_input=normalized,
        )

    if EMAIL_RE.match(normalized) or PHONE_RE.match(normalized) or HANDLE_RE.match(normalized):
        return ValidationResult(
            status="reject",
            level=0,
            code="pii",
            message="Enter a niche or product idea, not contact info.",
            normalized_input=normalized,
        )

    for pat in INJECTION_PATTERNS:
        if pat.search(normalized):
            return ValidationResult(
                status="reject",
                level=0,
                code="injection",
                message="Enter a product idea or niche only.",
                normalized_input=normalized,
            )

    if _is_garbage(normalized):
        return ValidationResult(
            status="reject",
            level=0,
            code="garbage",
            message="That doesn’t look like an idea. Describe a product or niche in plain words.",
            normalized_input=normalized,
            examples=_examples_for("garbage", normalized),
        )

    words = _word_list(normalized)
    word_count = len(words)

    # Exact theme match
    if lower in THEME or lower.replace("-", " ") in THEME:
        if confirm_broad_theme:
            return ValidationResult(
                status="accept",
                level=3,
                code="theme",
                message=(
                    "Scoring as a demand theme (not a product). "
                    "Results are directional — pick a wedge before treating this as a Go."
                ),
                normalized_input=normalized,
                is_theme=True,
                examples=_examples_for("theme", normalized),
                suggested_rewrite=_suggested_rewrite(normalized, "theme"),
            )
        return ValidationResult(
            status="needs_confirm",
            level=3,
            code="theme",
            message=(
                "We’ll score this as a demand theme (not a product). "
                "Results are directional — a Go still needs a specific wedge."
            ),
            normalized_input=normalized,
            is_theme=True,
            examples=_examples_for("theme", normalized),
            suggested_rewrite=_suggested_rewrite(normalized, "theme"),
        )

    # Exact vague / broad
    if lower in VAGUE or (word_count == 1 and words[0] in VAGUE):
        return ValidationResult(
            status="reject",
            level=1,
            code="too_vague",
            message=(
                f"“{normalized}” is too vague to score. "
                "Add who it’s for and what it does."
            ),
            normalized_input=normalized,
            examples=_examples_for("too_vague", normalized),
            suggested_rewrite=_suggested_rewrite(normalized, "too_vague"),
        )

    if lower in BROAD:
        return ValidationResult(
            status="reject",
            level=2,
            code="too_broad",
            message=(
                f"“{normalized}” is a whole market, not a niche we can score fairly. "
                "Narrow it: who + problem."
            ),
            normalized_input=normalized,
            examples=_examples_for("too_broad", normalized),
            suggested_rewrite=_suggested_rewrite(normalized, "too_broad"),
        )

    # Single token not in lists still too vague
    if word_count == 1:
        return ValidationResult(
            status="reject",
            level=1,
            code="too_vague",
            message=(
                f"“{normalized}” is too vague. "
                "Add who it’s for and what problem you solve."
            ),
            normalized_input=normalized,
            examples=_examples_for("too_vague", normalized),
            suggested_rewrite=_suggested_rewrite(normalized, "too_vague"),
        )

    # Two-word bare categories without audience
    has_audience = bool(AUDIENCE_RE.search(normalized))
    use_case_hits = sum(1 for w in words if w in USE_CASE_HINTS)
    # "project management", "email marketing" etc.
    if word_count == 2 and not has_audience and lower in BROAD:
        return ValidationResult(
            status="reject",
            level=2,
            code="too_broad",
            message=(
                f"“{normalized}” is still too broad. "
                "Add a customer segment (e.g. “… for dental clinics”)."
            ),
            normalized_input=normalized,
            examples=_examples_for("too_broad", normalized),
            suggested_rewrite=_suggested_rewrite(normalized, "too_broad"),
        )

    if word_count <= 2 and not has_audience and use_case_hits == 0:
        # e.g. "blue widgets" might be ok; "saas tools" not
        if all(w in VAGUE or w in BROAD for w in words):
            return ValidationResult(
                status="reject",
                level=2,
                code="too_broad",
                message="Too broad or vague. Add who it’s for and the specific problem.",
                normalized_input=normalized,
                examples=_examples_for("too_broad", normalized),
            )

    # Accept paths
    if has_audience or (word_count >= 3 and use_case_hits >= 1) or word_count >= 4:
        level = 5 if has_audience and (use_case_hits >= 1 or word_count >= 4) else 4
        code: Code = "product_idea" if level == 5 else "niche"
        return ValidationResult(
            status="accept",
            level=level,
            code=code,
            message="Looks specific enough to score.",
            normalized_input=normalized,
        )

    if word_count >= 3:
        # e.g. "work from home tools" if not in THEME
        return ValidationResult(
            status="accept",
            level=4,
            code="niche",
            message="Looks specific enough to score.",
            normalized_input=normalized,
        )

    return ValidationResult(
        status="reject",
        level=2,
        code="too_broad",
        message="Add more detail: who it’s for and what problem you solve.",
        normalized_input=normalized,
        examples=_examples_for("too_broad", normalized),
        suggested_rewrite=_suggested_rewrite(normalized, "too_broad"),
    )
