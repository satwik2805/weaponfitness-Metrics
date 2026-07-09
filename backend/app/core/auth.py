"""Authentication & authorization for the API.

Every request carries a Supabase-issued JWT (Authorization: Bearer <token>).
We verify the signature locally — asymmetric (JWKS) for current Supabase
projects, HS256 legacy secret as a fallback — then load the caller's profile
for role decisions. Nothing trusts client-supplied IDs.

Usage:
    user: AuthUser = Depends(get_current_user)            # any signed-in user
    user: AuthUser = Depends(require_roles("Owner"))      # role-gated
    assert_self_or_roles(user, resource_owner_id, "Owner", "Admin")
"""

import logging
from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.db.models.profile import Profile

logger = logging.getLogger("weaponfitness.auth")

ALGS_ASYMMETRIC = ["RS256", "ES256"]
ALG_LEGACY = "HS256"


@dataclass
class AuthUser:
    id: UUID
    email: str | None
    role: str | None          # UserRoleEnum value, None if no profile row yet
    profile: Profile | None


class AuthError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
        lifespan=3600,
    )


def _decode_token(token: str) -> dict:
    """Verify signature + expiry + audience and return the claim set."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise AuthError("Malformed token") from exc

    alg = header.get("alg")
    try:
        if alg in ALGS_ASYMMETRIC:
            if not settings.SUPABASE_URL:
                raise AuthError("Server auth is not configured (SUPABASE_URL missing)")
            key = _jwks_client().get_signing_key_from_jwt(token).key
            return jwt.decode(token, key, algorithms=ALGS_ASYMMETRIC, audience="authenticated")
        if alg == ALG_LEGACY:
            if not settings.SUPABASE_JWT_SECRET:
                raise AuthError("Server auth is not configured (SUPABASE_JWT_SECRET missing)")
            return jwt.decode(
                token, settings.SUPABASE_JWT_SECRET, algorithms=[ALG_LEGACY], audience="authenticated"
            )
        raise AuthError(f"Unsupported token algorithm: {alg}")
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid token") from exc


def get_current_user(request: Request, db: Session = Depends(get_db)) -> AuthUser:
    if settings.AUTH_DISABLED:
        # Local-dev escape hatch — loudly logged, never for production.
        logger.warning("AUTH_DISABLED is on: treating request as Owner (dev only)")
        return AuthUser(id=UUID(int=0), email="dev@local", role="Owner", profile=None)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise AuthError("Missing bearer token")

    claims = _decode_token(auth.removeprefix("Bearer ").strip())
    try:
        user_id = UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise AuthError("Token has no valid subject") from exc

    profile = db.query(Profile).filter(Profile.id == user_id).first()
    role = getattr(profile, "role", None)
    return AuthUser(
        id=user_id,
        email=claims.get("email"),
        role=role.value if hasattr(role, "value") else role,
        profile=profile,
    )


def require_roles(*roles: str):
    """Dependency factory: only callers whose profile role is in `roles` pass."""

    def _check(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to do that.",
            )
        return user

    return _check


def assert_self_or_roles(user: AuthUser, owner_id, *roles: str) -> None:
    """Allow the resource owner themselves, or any of the given staff roles."""
    if str(user.id) == str(owner_id):
        return
    if user.role in roles:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to access this resource.",
    )


STAFF_ROLES = ("Owner", "Admin", "Receptionist", "Trainer")
ADMIN_ROLES = ("Owner", "Admin")
