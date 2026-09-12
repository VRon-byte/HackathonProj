"""Auth0 access-token validation.

The browser signs in with Auth0 and sends:
    Authorization: Bearer <access token>

This file verifies the token's signature, issuer, audience, and expiry.
Auth0 remains responsible for passwords.  The local users table stores only
application data and the stable Auth0 subject identifier.
"""

from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection

from app.config import settings
from app.db import get_db

bearer = HTTPBearer()


@lru_cache(maxsize=1)
def jwks_client() -> jwt.PyJWKClient:
    """Create the Auth0 signing-key client once per process."""
    return jwt.PyJWKClient(f"https://{settings.auth0_domain}/.well-known/jwks.json")


def validate_token(token: str) -> dict[str, Any]:
    """Validate a raw JWT and return its claims.

    HTTP routes receive the token through the Authorization header.  The
    WebSocket route receives it through its connection setup, so both paths
    use this one validation function.
    """
    try:
        signing_key = jwks_client().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=settings.auth0_issuer,
        )
    except (jwt.PyJWTError, ValueError) as error:
        raise ValueError("Invalid Auth0 access token") from error


def token_subject(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> str:
    """Validate a bearer token and return Auth0's unique `sub` claim."""
    try:
        subject = validate_token(credentials.credentials).get("sub")
        if not isinstance(subject, str) or not subject:
            raise ValueError("missing subject")
        return subject
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Auth0 access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error


def current_user(
    subject: str = Depends(token_subject),
    db: Connection = Depends(get_db),
) -> dict:
    """Find or create the local user associated with an Auth0 subject."""
    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO users (auth0_subject)
            VALUES (%s)
            ON CONFLICT (auth0_subject) DO NOTHING
            """,
            (subject,),
        )
        cursor.execute(
            "SELECT id, auth0_subject, email, display_name, preferences "
            "FROM users WHERE auth0_subject = %s",
            (subject,),
        )
        user = cursor.fetchone()
    db.commit()
    if user is None:
        raise HTTPException(status_code=404, detail="Application user not found")
    return {
        "id": user[0],
        "auth0_subject": user[1],
        "email": user[2],
        "display_name": user[3],
        "preferences": user[4],
    }
