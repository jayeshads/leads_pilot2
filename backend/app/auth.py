"""Supabase session authentication and application-role authorization."""
import os
from functools import lru_cache
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel

from app import config
from app.db.base import get_conn

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

# bug #1 fix: the token only ever carries an id; the role is looked up
# here — server-side, never trusted from the client — which is exactly
# what the old code got wrong (any token starting with "permanent-access-
# token", or any decode error at all, used to fall through to a hardcoded
# admin identity regardless of who — or what — presented it).
# Keep this in sync with frontend/src/lib/permanentAccounts.ts.
_PERMANENT_ACCOUNTS: dict[str, str] = {
    "permanent-admin-uuid-0001": "admin",
    "permanent-client-uuid-0002": "client",
    "permanent-admin-uuid-0003": "admin",
}
_PERMANENT_TOKEN_PREFIX = "permanent-access-token:"


class CurrentUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "client"


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    """Return a cached verifier for Supabase's current asymmetric signing keys."""
    if not SUPABASE_URL:
        raise HTTPException(500, "Server misconfigured: SUPABASE_URL is not set.")
    return jwt.PyJWKClient(f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json")


def _decode_token(token: str) -> dict:
    """Verify a Supabase access token using its declared signing algorithm.
    Every failure path here raises HTTPException(401) — there is no
    fallback identity. A token that doesn't verify means "not logged in",
    never "logged in as admin"."""
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")

        if algorithm == "ES256":
            # Modern Supabase projects publish public keys through JWKS. The
            # token's `kid` selects the correct key, enabling safe key rotation.
            signing_key = _jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
                issuer=f"{SUPABASE_URL.rstrip('/')}/auth/v1",
            )

        if algorithm == "HS256":
            # Backward-compatible support for legacy Supabase JWT secrets.
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(
                    500,
                    "Server received a legacy HS256 token but SUPABASE_JWT_SECRET is not set.",
                )
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )

        raise HTTPException(401, f"Unsupported Supabase JWT signing algorithm: {algorithm!r}.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired. Please sign in again.")
    except HTTPException:
        raise
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or tampered auth token.")


def _lookup_profile_role(user_id: str) -> str:
    """Read the application role from the shared Supabase Postgres database."""
    with get_conn() as conn:
        row = conn.execute("SELECT role FROM profiles WHERE id = ?", (user_id,)).fetchone()
    return row["role"] if row and row.get("role") else "client"


def get_current_user(request: Request) -> CurrentUser:
    """Extract and verify the signed-in user's identity. No token, an
    unrecognized permanent-account token, or a token that fails
    verification all result in 401 — none of them ever grant access,
    admin or otherwise (bug #1)."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""

    if not token:
        raise HTTPException(401, "Missing auth token. Please sign in.")

    if token.startswith(_PERMANENT_TOKEN_PREFIX):
        if not config.ALLOW_PERMANENT_ACCOUNTS:
            raise HTTPException(401, "Permanent/demo accounts are disabled in this environment.")
        account_id = token[len(_PERMANENT_TOKEN_PREFIX):]
        role = _PERMANENT_ACCOUNTS.get(account_id)
        if role is None:
            raise HTTPException(401, "Unrecognized permanent-account token.")
        return CurrentUser(id=account_id, email=None, role=role)

    claims = _decode_token(token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(401, "Token is missing its subject claim.")
    return CurrentUser(
        id=user_id,
        email=claims.get("email"),
        role=_lookup_profile_role(user_id),
    )


def require_business_access(business_id: str, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Permit clients to access only their business; admins can access all."""
    assert_business_access(business_id, user)
    return user


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Restrict Admin CRM routes to profiles.role == 'admin'."""
    if user.role != "admin":
        raise HTTPException(403, "Admin access required.")
    return user


def assert_business_access(business_id: str, user: CurrentUser) -> None:
    if user.role != "admin" and business_id != user.id:
        raise HTTPException(403, "You may only access your own business account.")
