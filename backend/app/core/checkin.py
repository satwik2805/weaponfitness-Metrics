"""Rotating signed QR check-in tokens (audit WF-010).

Replaces the spoofable static check-in QR. The front-desk screen fetches a
short-lived HMAC token and renders it as a QR code; a trainee scans it and
POSTs it back to /attendance/checkin. Tokens rotate every WINDOW_SECONDS and
the previous window is still accepted (60s total grace), so a screenshotted
QR is useless minutes later.

Token format (stdlib only — hmac / hashlib / base64 / time):
    window    = int(unix_time / WINDOW_SECONDS)
    payload   = "wfqr1|<branch_id>|<window>"
    signature = hex(HMAC_SHA256(CHECKIN_SECRET, payload))
    token     = base64url(payload + "|" + signature)
"""

import base64
import hashlib
import hmac
import time

TOKEN_PREFIX = "wfqr1"
WINDOW_SECONDS = 30


def _signature(secret: str, branch_id: str, window: int) -> str:
    payload = f"{TOKEN_PREFIX}|{branch_id}|{window}"
    return hmac.new(
        secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def mint_token(secret: str, branch_id: str) -> tuple[str, int]:
    """Return (token, seconds_until_rotation) for the current window."""
    now = time.time()
    window = int(now / WINDOW_SECONDS)
    raw = f"{TOKEN_PREFIX}|{branch_id}|{window}|{_signature(secret, branch_id, window)}"
    token = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")
    expires_in = WINDOW_SECONDS - (int(now) % WINDOW_SECONDS)
    return token, expires_in


def verify_token(secret: str, token: str) -> str:
    """Validate a scanned token. Returns its branch_id, or raises ValueError.

    The HMAC is recomputed for the current window and the previous one
    (60s grace) and compared in constant time (hmac.compare_digest) — the
    window embedded in the payload only matters through the signature.
    """
    try:
        padded = token + "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("token is not valid base64url") from exc

    parts = raw.split("|")
    if len(parts) != 4 or parts[0] != TOKEN_PREFIX:
        raise ValueError("token payload is malformed")
    _, branch_id, _window, provided_sig = parts

    current = int(time.time() / WINDOW_SECONDS)
    for window in (current, current - 1):  # current + one window of grace
        if hmac.compare_digest(_signature(secret, branch_id, window), provided_sig):
            return branch_id
    raise ValueError("token is expired or its signature does not match")
