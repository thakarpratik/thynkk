"""Transactional email via Brevo (Sendinblue) API."""

from __future__ import annotations

import logging
import os
import threading

import httpx

logger = logging.getLogger(__name__)

_BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _api_key() -> str | None:
    key = os.environ.get("BREVO_API_KEY", "").strip()
    return key or None


def _sender() -> dict[str, str]:
    return {
        "name": os.environ.get("BREVO_SENDER_NAME", "Thynkk").strip() or "Thynkk",
        "email": os.environ.get("BREVO_SENDER_EMAIL", "hello@thynkk.co").strip(),
    }


def _app_url() -> str:
    return os.environ.get("APP_URL", "https://thynkk.co").rstrip("/")


def _send_email(*, to_email: str, subject: str, html: str, text: str) -> bool:
    api_key = _api_key()
    if not api_key:
        logger.warning("BREVO_API_KEY not set — skipping email to %s", to_email)
        return False

    payload = {
        "sender": _sender(),
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
        "textContent": text,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(
                _BREVO_URL,
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                json=payload,
            )
        if res.status_code in (200, 201):
            logger.info("Brevo email sent to %s (%s)", to_email, subject)
            return True
        logger.error("Brevo failed %s for %s: %s", res.status_code, to_email, res.text[:500])
        return False
    except httpx.HTTPError as exc:
        logger.error("Brevo HTTP error for %s: %s", to_email, exc)
        return False


def _send_async(fn, *args, **kwargs) -> None:
    thread = threading.Thread(target=fn, args=args, kwargs=kwargs, daemon=True)
    thread.start()


def _wrap_html(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#020617;font-family:system-ui,sans-serif;color:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0E1223;border:1px solid #1E293B;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;font-family:monospace;font-size:12px;color:#6366F1;letter-spacing:0.08em;text-transform:uppercase;">Thynkk</p>
          {body_html}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#64748B;">thynkk.co · Reddit growth without the grind</p>
    </td></tr>
  </table>
</body>
</html>"""


def send_waitlist_joined(to_email: str, position: int) -> None:
    dashboard = _app_url()
    subject = "You're on the Thynkk waitlist"
    text = (
        f"Thanks for joining the Thynkk waitlist.\n\n"
        f"You're #{position} in line. We open spots daily — when one frees up, "
        f"we'll email you right away.\n\n"
        f"Thynkk finds Reddit conversations worth joining and drafts replies for you.\n\n"
        f"{dashboard}"
    )
    html = _wrap_html(
        subject,
        f"""
          <h1 style="margin:0 0 12px;font-family:monospace;font-size:22px;color:#F8FAFC;">You're on the list</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">
            Thanks for requesting access. You're <strong style="color:#F8FAFC;">#{position}</strong> in line.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94A3B8;">
            We let people in daily. When a spot opens, you'll get another email — then you can run your first growth scan in about 60 seconds.
          </p>
          <p style="margin:0;font-size:13px;color:#64748B;">No spam. One email when you're in.</p>
        """,
    )
    _send_email(to_email=to_email, subject=subject, html=html, text=text)


def send_waitlist_admitted(to_email: str) -> None:
    dashboard = f"{_app_url()}/dashboard"
    subject = "You're in — start your Thynkk scan"
    text = (
        "A spot just opened up — you're in!\n\n"
        "Create your account and paste your website. Thynkk will find Reddit threads "
        "worth joining and draft replies you can copy.\n\n"
        f"Start here: {dashboard}\n\n"
        "1 free scan included. No credit card."
    )
    html = _wrap_html(
        subject,
        f"""
          <h1 style="margin:0 0 12px;font-family:monospace;font-size:22px;color:#F8FAFC;">You're in</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">
            A spot opened up for <strong style="color:#F8FAFC;">{to_email}</strong>.
            Your access is ready.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94A3B8;">
            Paste your site, get ranked threads, and copy reply drafts — without hours of scrolling Reddit.
          </p>
          <a href="{dashboard}" style="display:inline-block;background:#6366F1;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;">
            Create account &amp; start scanning
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#64748B;">1 free scan · No credit card</p>
        """,
    )
    _send_email(to_email=to_email, subject=subject, html=html, text=text)


def send_waitlist_joined_async(to_email: str, position: int) -> None:
    _send_async(send_waitlist_joined, to_email, position)


def send_waitlist_admitted_async(to_email: str) -> None:
    _send_async(send_waitlist_admitted, to_email)


def send_scan_ready(
    to_email: str,
    *,
    url: str,
    success: bool,
    product_name: str = "",
    scan_id: str = "",
) -> bool:
    """Notify user that a growth scan finished (success or failure)."""
    dashboard = f"{_app_url()}/dashboard"
    label = (product_name or "").strip() or url
    if success:
        subject = f"Your Thynkk scan is ready — {label}"
        text = (
            f"Your growth scan for {url} is ready.\n\n"
            f"Open your dashboard to copy reply drafts and post ideas:\n{dashboard}\n"
        )
        if scan_id:
            text += f"\nScan id: {scan_id}\n"
        html = _wrap_html(
            subject,
            f"""
          <h1 style="margin:0 0 12px;font-family:monospace;font-size:22px;color:#F8FAFC;">Scan ready</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">
            We finished analyzing <strong style="color:#F8FAFC;">{url}</strong>
            {" for <strong style='color:#F8FAFC;'>" + product_name + "</strong>" if product_name else ""}.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94A3B8;">
            Ranked Reddit threads and copy-paste reply drafts are waiting in your dashboard.
          </p>
          <a href="{dashboard}" style="display:inline-block;background:#6366F1;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;">
            Open results
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#64748B;">You asked to be notified when this scan finished.</p>
        """,
        )
    else:
        subject = f"Thynkk scan didn’t finish — {label}"
        text = (
            f"Your growth scan for {url} didn’t complete successfully.\n\n"
            f"Open the dashboard to try again:\n{dashboard}\n"
        )
        html = _wrap_html(
            subject,
            f"""
          <h1 style="margin:0 0 12px;font-family:monospace;font-size:22px;color:#F8FAFC;">Scan didn’t finish</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">
            We couldn’t complete the scan for <strong style="color:#F8FAFC;">{url}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94A3B8;">
            Open your dashboard and try again — or use a site with a clearer product description.
          </p>
          <a href="{dashboard}" style="display:inline-block;background:#6366F1;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;">
            Back to dashboard
          </a>
        """,
        )
    return _send_email(to_email=to_email, subject=subject, html=html, text=text)


def send_scan_ready_async(
    to_email: str,
    *,
    url: str,
    success: bool,
    product_name: str = "",
    scan_id: str = "",
) -> None:
    _send_async(
        send_scan_ready,
        to_email,
        url=url,
        success=success,
        product_name=product_name,
        scan_id=scan_id,
    )