"""
Best-effort outbound notifications. Currently: email a summary to the shop
owner when a new lead arrives.

Configuration is entirely via environment variables. If SMTP is not configured
the functions no-op silently, so this is safe to call unconditionally and never
blocks or breaks a customer request.

Env vars:
  SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASSWORD
  SMTP_FROM     - From address (defaults to SMTP_USER)
  NOTIFY_EMAIL  - recipient for lead notifications (the shop owner)
  SMTP_STARTTLS - "true" (default) to use STARTTLS
"""
import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("NOTIFY_EMAIL"))


def send_email(subject: str, body: str) -> None:
    """Send a plain-text email to NOTIFY_EMAIL. No-op if SMTP unconfigured."""
    if not _smtp_configured():
        logger.debug("notify.send_email skipped — SMTP not configured")
        return
    try:
        host = os.environ["SMTP_HOST"]
        port = int(os.environ.get("SMTP_PORT", "587"))
        user = os.environ.get("SMTP_USER")
        password = os.environ.get("SMTP_PASSWORD")
        sender = os.environ.get("SMTP_FROM") or user or "noreply@store"
        recipient = os.environ["NOTIFY_EMAIL"]

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = recipient
        msg.set_content(body)

        with smtplib.SMTP(host, port, timeout=10) as smtp:
            if os.environ.get("SMTP_STARTTLS", "true").lower() == "true":
                smtp.starttls()
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
        logger.info("Lead notification email sent to %s", recipient)
    except Exception:
        logger.warning("notify.send_email failed — swallowing", exc_info=True)


def notify_new_lead(lead) -> None:
    """Email the shop owner a summary of a new lead. Best-effort."""
    lines = [
        "פנייה חדשה התקבלה באתר:",
        "",
        f"שם: {lead.name}",
        f"טלפון: {lead.phone}",
    ]
    if lead.email:
        lines.append(f"אימייל: {lead.email}")
    if lead.address:
        lines.append(f"כתובת: {lead.address}")
    if lead.notes:
        lines.append("")
        lines.append("הערות:")
        lines.append(lead.notes)
    from helpers import parse_cart
    cart = parse_cart(lead.cart_snapshot)
    if cart:
        lines.append("")
        lines.append(f"פריטים בעגלה: {len(cart)}")
        for it in cart:
            name = it.get("name") if isinstance(it, dict) else None
            lines.append(f"  • {name or 'ארון'}")
    send_email(f"פנייה חדשה — {lead.name}", "\n".join(lines))
