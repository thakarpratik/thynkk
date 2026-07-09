"""User records synced from Clerk webhooks."""

from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_users_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id                      TEXT PRIMARY KEY,
                clerk_id                TEXT NOT NULL UNIQUE,
                email                   TEXT NOT NULL,
                is_paid                 BOOLEAN NOT NULL DEFAULT FALSE,
                paypal_subscription_id  TEXT,
                subscription_status     TEXT,
                created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at              TIMESTAMPTZ
            )
        """))
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT
        """))
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT
        """))


def get_user_email(engine: Engine, clerk_id: str) -> str | None:
    ensure_users_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT email FROM users WHERE clerk_id = :clerk_id AND deleted_at IS NULL"),
            {"clerk_id": clerk_id},
        ).fetchone()
    return row[0] if row else None


def user_scan_credits(engine: Engine, clerk_id: str) -> int:
    from app.api.quota import get_quota

    quota = get_quota(f"clerk:{clerk_id}", engine)
    return int(quota["scan_credits"])


def user_is_paid(engine: Engine, clerk_id: str) -> bool:
    """True when user has paid scan credits (legacy name kept for gating helpers)."""
    return user_scan_credits(engine, clerk_id) > 0


def add_user_credits(engine: Engine, clerk_id: str, amount: int) -> int:
    from app.api.quota import add_credits

    return add_credits(f"clerk:{clerk_id}", amount, engine)


def set_user_paid(
    engine: Engine,
    clerk_id: str,
    *,
    is_paid: bool,
    subscription_id: str | None = None,
    status: str | None = None,
) -> None:
    ensure_users_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE users
                SET is_paid = :is_paid,
                    paypal_subscription_id = COALESCE(:subscription_id, paypal_subscription_id),
                    subscription_status = COALESCE(:status, subscription_status)
                WHERE clerk_id = :clerk_id
            """),
            {
                "clerk_id": clerk_id,
                "is_paid": is_paid,
                "subscription_id": subscription_id,
                "status": status,
            },
        )