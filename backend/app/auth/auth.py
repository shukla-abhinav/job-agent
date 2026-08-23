"""
Authentication utilities: JWT creation/verification, password hashing,
and the FastAPI dependency `get_current_user`.
"""

import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.db.mongo import get_db

logger = logging.getLogger(__name__)

# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_jwt(user_id: str, email: str) -> str:
    """Create a signed JWT token that expires in settings.jwt_expire_hours."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str) -> dict:
    """
    Decode and validate a JWT token.
    Raises HTTP 401 on expiry or any validation failure.
    """
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired — please log in again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


# ── FastAPI dependency ────────────────────────────────────────────────────────

_security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    Dependency that validates the Bearer JWT and returns the authenticated
    user document from MongoDB.

    Returns a dict with all user fields; `_id` is converted to str for convenience.
    Raises HTTP 401 on any auth failure.
    """
    payload = decode_jwt(credentials.credentials)

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed token: missing subject")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed token: invalid user id")

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=401, detail="User account not found")

    # Convert ObjectId → str so callers don't have to handle BSON types
    user["_id"] = str(user["_id"])
    return user
