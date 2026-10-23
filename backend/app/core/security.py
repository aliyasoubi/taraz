"""Single-user authentication.

There is one user and one password, stored only as an argon2 hash in the
environment. A successful login sets a signed, HttpOnly, SameSite=Strict
session cookie; the SPA is same-origin, so nothing else is needed for CSRF
beyond refusing state-changing requests that lack our custom header (a
cross-site form cannot set one).
"""

import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import Settings

COOKIE_NAME = "taraz_session"
CSRF_HEADER = "x-requested-with"
_ALGORITHM = "HS256"
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, settings: Settings) -> bool:
    if not settings.auth_password_hash:
        return False
    try:
        return _hasher.verify(settings.auth_password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def issue_session(settings: Settings) -> tuple[str, int]:
    max_age = settings.session_days * 86400
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": "owner",
            "iat": now,
            "exp": now + timedelta(seconds=max_age),
            "jti": secrets.token_urlsafe(8),
            # Changing the password hash signs everyone out.
            "pwd": settings.auth_password_hash[-12:],
        },
        settings.secret_key,
        algorithm=_ALGORITHM,
    )
    return token, max_age


def session_valid(token: str, settings: Settings) -> bool:
    try:
        claims = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return False
    return claims.get("sub") == "owner" and claims.get("pwd") == settings.auth_password_hash[-12:]


class LoginThrottle:
    """At most `limit` failed attempts per client per `window` seconds."""

    def __init__(self, limit: int = 5, window: float = 300) -> None:
        self.limit = limit
        self.window = window
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        q = self._failures[key]
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def retry_after(self, key: str) -> int:
        with self._lock:
            now = time.monotonic()
            q = self._prune(key, now)
            if len(q) < self.limit:
                return 0
            return int(self.window - (now - q[0])) + 1

    def fail(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


login_throttle = LoginThrottle()
