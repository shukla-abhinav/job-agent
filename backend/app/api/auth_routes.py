"""
Authentication routes: /api/auth/signup, /api/auth/login, /api/auth/me
"""

import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.auth import create_jwt, get_current_user, hash_password, verify_password
from app.db.mongo import get_db
from app.models.job import AuthResponse, LoginRequest, SignupRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth")


@router.post("/signup", response_model=AuthResponse)
async def signup(
    body: SignupRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AuthResponse:
    """
    Register a new account.

    Restrictions:
    - Email must be unique.
    - Password is bcrypt-hashed; plaintext is never stored.
    """
    email = body.email.strip().lower()

    # ── Basic email validation ────────────────────────────────────────────
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid email address.",
        )

    password = body.password
    if len(password) < 8:
        raise HTTPException(
            status_code=422,
            detail="Password must be at least 8 characters.",
        )

    # ── Duplicate check ───────────────────────────────────────────────────────
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    # ── Create user ───────────────────────────────────────────────────────────
    result = await db.users.insert_one({
        "email": email,
        "hashed_pw": hash_password(password),
        "created_at": datetime.now(timezone.utc),
    })

    user_id = str(result.inserted_id)
    token = create_jwt(user_id, email)

    logger.info("New user signed up: %s", email)
    return AuthResponse(token=token, email=email, user_id=user_id)


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AuthResponse:
    """
    Authenticate with email + password. Returns a JWT on success.
    """
    email = body.email.strip().lower()

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["hashed_pw"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    user_id = str(user["_id"])
    token = create_jwt(user_id, email)

    logger.info("User logged in: %s", email)
    return AuthResponse(token=token, email=email, user_id=user_id)


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)) -> dict:
    """Return info for the currently authenticated user."""
    return {
        "user_id": current_user["_id"],
        "email": current_user["email"],
        "created_at": current_user.get("created_at"),
    }
