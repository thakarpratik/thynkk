# CLAUDE.md — Thynkk (SaaS)

> **"Think before you build."**
> Market intelligence from Reddit, instantly.
> Live at: thynkk.co

## Product Overview

Thynkk is a two-mode market intelligence SaaS that turns Reddit into a product discovery engine. Target users: indie hackers, founders, marketers, and sales teams doing product validation and market research.

### Mode 1: Pain Point Scanner
User enters a niche keyword or subreddit → AI surfaces what people are struggling with, asking for, and willing to pay for → ranked themes with quotes and demand scores.
**Use case:** validate a specific idea you already have.

### Mode 2: Trend Radar
No input needed (or broad category) → AI detects niches gaining momentum on Reddit right now → "this topic blew up in the last 7 days" signal.
**Use case:** find your next idea before your competitors do.

---

**Business model:** Freemium SaaS. Free users see top 3 themes per scan + top 3 trending niches; paid subscribers ($19/mo via Stripe) get full reports, exports, saved searches, weekly Pain Point digests, and weekly Trend Radar digests. Both digest emails are the retention hooks — one-time scans get users in the door, ongoing signals keep them subscribed.

**Competitive context:** GummySearch is the main incumbent. Our wedge: two-mode intelligence (validate + discover), better AI clustering, lower price point. Start lean, validate insight quality before polishing UI.

---

## Current Stage

Greenfield. Build order:
1. **Mode 1 core pipeline first** (steps 1–5 below) as a runnable Python script — validate insight quality on a real subreddit before any web code
2. **Mode 2 Trend Radar pipeline** — subreddit velocity + topic spike detection
3. Then wrap both with API + frontend
4. Then auth, Stripe, monitoring/digest emails

---

## Architecture / Data Flow

### Mode 1: Pain Point Scanner

```
User input (niche keyword or subreddit)
  → 1. SUBREDDIT DISCOVERY: Reddit search API finds relevant subreddits
  → 2. HARVEST: pull top/new/hot posts + comments via PRAW → store raw in Postgres (cache aggressively, never re-fetch same data)
  → 3. FILTER: cheap regex/keyword pass for pain-point language before any AI call
  → 4. AI ANALYSIS: batch filtered posts → Claude API clusters into themes, extracts representative quotes, scores severity, writes opportunity summaries
  → 5. SCORE & RANK: demand score = mentions × engagement (upvotes + comments) × recency weight
  → 6. PRESENT: dashboard, CSV/PDF export, saved searches
  → 7. MONITOR: cron re-scans saved niches daily/weekly → email digest of new pain points
```

### Mode 2: Trend Radar

```
Scheduled job (daily)
  → 1. SUBREDDIT PULSE: pull subscriber counts + post volume across tracked subreddits → detect velocity spikes (new subs/day, post rate vs. 30-day avg)
  → 2. TOPIC CLUSTERING: across fast-growing subreddits, cluster post titles + top comments by topic → find emerging theme clusters not seen last week
  → 3. SIGNAL SCORING: trend score = growth_velocity × engagement_rate × novelty (inverse of how long topic has existed in our DB)
  → 4. SURFACE: "Trending this week" feed — ranked niches with sample posts, momentum chart, earliest signal date
  → 5. ALERT: weekly Trend Radar email digest → top 5 emerging niches with evidence
```

### Pain-point filter phrases (Mode 1, step 3)
Match posts/comments containing (case-insensitive) phrases like:
- "is there a tool", "is there an app", "does anyone know a"
- "I wish there was", "I wish I could"
- "frustrated with", "hate that", "so annoying"
- "how do you handle", "how do you guys", "how do I"
- "willing to pay", "I'd pay for", "shut up and take my money"
- "alternative to", "looking for something like"
- "biggest pain", "struggle with", "waste so much time"

Keep this list in a config file, not hardcoded — it will be tuned constantly.

---

## Tech Stack

- **Backend:** Python 3.11+, FastAPI
- **Reddit access:** Public JSON endpoints (no credentials needed, read-only). PRAW via OAuth once Reddit approves the developer application. Abstract behind `SourceProvider` so the switch is seamless.
- **AI:** Anthropic Claude API (claude-sonnet for clustering; haiku for cheap pre-classification)
- **Database:** Supabase (Postgres + SQLAlchemy + Alembic for migrations)
- **Queue/jobs:** Start with simple background tasks or cron; Celery + Redis only when needed
- **Frontend:** Next.js on Vercel
- **Auth:** Clerk (JWT verified on FastAPI side via Clerk public key)
- **Payments:** Stripe Checkout + customer portal
- **Email:** Resend or Postmark for report-ready and digest emails
- **Backend hosting:** Railway

### Reddit API Status (as of June 2026)
Reddit closed self-service API access in November 2025. OAuth credentials now require manual approval (2–4 week review). **Current approach: public JSON endpoints** — append `.json` to any Reddit URL, no credentials needed.
- `https://www.reddit.com/r/smallbusiness/top.json?t=month&limit=100`
- `https://www.reddit.com/search.json?q=bookkeeping`
- Rate limit: ~10–60 req/min unauthenticated — cache aggressively
- Commercial use: requires separate written approval from Reddit
- Developer application submitted: pending approval

---

## Key Engineering Principles

1. **Filter before AI.** Never send raw post dumps to the LLM. The keyword filter should cut ~90% of posts so AI cost stays sane. Track AI token spend per scan.
2. **Cache everything.** Reddit data is stored by (subreddit, post_id) with fetch timestamps. If a subreddit was scanned within the last N days, reuse it. This protects the free API quota and makes repeat scans instant.
3. **Async scans.** Scans take 1–3 minutes. Queue the job, poll status via GET /scans/{id}/status every 3s, email when ready. Never block a request handler on a scan.
4. **Abstract the data source.** Wrap Reddit access behind a `SourceProvider` interface. Reddit's commercial API terms are a structural risk — design so public JSON endpoints or other platforms (HN, Twitter/X, forums) can be swapped in later.
5. **Respect rate limits.** PRAW handles this mostly, but add backoff/retry. Never hammer Reddit; we depend on staying in good standing.
6. **Structured AI output.** Prompt Claude to return strict JSON (themes, quotes with post URLs, severity scores, opportunity summaries). Validate with Pydantic; retry once on parse failure.
7. **Trend Radar runs on schedule, not on demand.** Pulse jobs run daily via cron. Users see pre-computed trend data instantly — no waiting for a scan.

---

## Data Model

- `users` — id, clerk_id, email, stripe_customer_id, plan, created_at
- `scans` — id, user_id, mode (scanner|radar), query, status (queued/running/done/failed), created_at
- `subreddits` — name, subscribers, subscriber_delta_7d, post_rate_7d, post_rate_30d_avg, last_fetched_at
- `posts` — reddit_id, subreddit, title, body, score, num_comments, created_utc, permalink, fetched_at, matched_filter (bool)
- `themes` — scan_id, name, summary, opportunity, demand_score, mention_count
- `theme_quotes` — theme_id, post_id, excerpt
- `trend_snapshots` — id, subreddit, topic_cluster, trend_score, novelty_score, first_seen_at, snapshot_date
- `saved_searches` — user_id, query, mode, frequency (daily/weekly), last_run_at

---

## Scoring

### Mode 1 — Demand Score
```
demand_score = mention_count × log(1 + total_upvotes + total_comments) × recency_weight
recency_weight = decay over 12 months (recent pain > old pain)
```

### Mode 2 — Trend Score
```
trend_score = growth_velocity × engagement_rate × novelty_score
growth_velocity = (subscribers_now - subscribers_7d_ago) / subscribers_7d_ago
novelty_score = 1 / log(1 + days_since_first_seen)  # newer topics score higher
```

---

## Monetization

| Feature | Free | Paid ($19/mo) |
|---|---|---|
| Pain Point Scanner | Top 3 themes | Full report |
| Trend Radar | Top 3 trending niches | Full feed |
| Exports (CSV/PDF) | No | Yes |
| Saved searches | No | Yes |
| Weekly Pain Point digest | No | Yes |
| Weekly Trend Radar digest | No | Yes |

---

## Distribution Strategy

- **Reddit itself** — post scan results in r/entrepreneur, r/SaaS, r/indiehackers; the output IS the marketing content
- **Indie Hackers / Product Hunt** — exact audience for launch
- **Twitter/X** — weekly "Reddit Pain Point" threads using our own tool's output (dogfooding = distribution)
- **SEO** — public scan result pages indexed as "what are [niche] customers struggling with"
- **Word of mouth** — shareable report links; free tier results are public by default

---

## Constraints & Gotchas

- **Reddit free API is for non-commercial use.** Fine for building/testing. Before charging customers at scale, plan for commercial API terms (~$0.24/1k calls) or alternative data strategies.
- **Never store or display content that violates Reddit's content policy.** Always link quotes back to the original post.
- **AI cost per scan is a core unit-economics metric.** Log tokens per scan from day one.
- **No scraping HTML.** API/JSON endpoints only.
- **Clerk user IDs are the foreign key.** Create a `users` row on first Clerk sign-in via webhook; map to Stripe customer ID on subscription.

---

## Environment Variables

```
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=thynkk/0.1 by <reddit_username>
ANTHROPIC_API_KEY=
DATABASE_URL=postgresql://...  # Supabase connection string
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EMAIL_API_KEY=
```

Use a `.env` file locally (never commit it); `python-dotenv` for loading.

---

## Project Structure (target)

```
/app
  /scanner              # Mode 1: pain point pipeline
    discovery.py
    harvest.py
    filters.py          # pain-point phrase config + matching
    analyze.py          # Claude API clustering
    scoring.py
  /radar                # Mode 2: trend discovery pipeline
    pulse.py            # subreddit velocity tracking
    spike_detector.py   # topic cluster emergence detection
    trend_scorer.py     # novelty + growth scoring
  /api                  # FastAPI routes
  /models               # SQLAlchemy models
  /jobs                 # scan queue, cron jobs (radar daily run)
  /emails               # templates + sending
  /scanner/prompts/     # versioned Claude prompt files
  /radar/prompts/
/config
  pain_phrases.yaml
/tests
/scripts
  run_scan.py           # CLI: python scripts/run_scan.py r/smallbusiness
  run_radar.py          # CLI: python scripts/run_radar.py --category saas
```

---

## Conventions

- Python: type hints everywhere, ruff for lint/format, pytest for tests
- Commit early and often; conventional commit messages (feat:, fix:, chore:)
- Every scanner/radar module should be runnable/testable standalone via CLI before being wired into the API
- Keep Claude prompts in versioned files (`/app/scanner/prompts/`, `/app/radar/prompts/`) — they will be iterated heavily

---

## MVP Definition of Done (v1)

**Mode 1:**
- [ ] CLI scan of a single subreddit produces a ranked JSON/markdown report of pain-point themes with quotes and links
- [ ] Results cached in Supabase Postgres; second run of same subreddit is near-instant
- [ ] FastAPI endpoint: submit scan → poll status → fetch report
- [ ] Minimal web page: input box → results view (top 3 themes free, rest gated)
- [ ] Stripe checkout for paid tier
- [ ] Saved search + weekly Pain Point email digest

**Mode 2:**
- [ ] Daily cron job runs pulse check across tracked subreddits, stores velocity snapshots
- [ ] Spike detector identifies emerging topic clusters week-over-week
- [ ] Trend Radar feed page shows top trending niches with momentum indicators
- [ ] Weekly Trend Radar email digest (paid tier)
