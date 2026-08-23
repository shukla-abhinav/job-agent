"""
Rate limiter — MongoDB-backed rolling window.

Limit: settings.rate_limit_calls per settings.rate_limit_window_hours.
Applies to: any route that performs LLM, DB, or SerpAPI work.

TTL index on rate_limit_events.created_at (set in mongo.py) auto-cleans
expired events — no manual purge needed.
"""

import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

LIMIT = settings.rate_limit_calls
WINDOW_HOURS = settings.rate_limit_window_hours


def _window_start() -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=WINDOW_HOURS)


def _as_utc(value: datetime) -> datetime:
    """Normalize BSON datetimes, which PyMongo commonly returns as naive UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


async def check_rate_limit(db: AsyncIOMotorDatabase, user_id: str) -> None:
    """
    Raise HTTP 429 if the user has reached the rate limit for the current window.

    Does NOT record an event — call record_event() separately after the
    actual work succeeds.

    Args:
        db:      MongoDB database instance.
        user_id: String user ID (from JWT payload).
    """
    count = await db.rate_limit_events.count_documents({
        "user_id": ObjectId(user_id),
        "created_at": {"$gte": _window_start()},
    })

    if count >= LIMIT:
        # Find the oldest event in the window to calculate reset time
        oldest = await db.rate_limit_events.find_one(
            {
                "user_id": ObjectId(user_id),
                "created_at": {"$gte": _window_start()},
            },
            sort=[("created_at", 1)],
        )
        resets_at = (
            _as_utc(oldest["created_at"]) + timedelta(hours=WINDOW_HOURS)
            if oldest
            else datetime.now(timezone.utc) + timedelta(hours=WINDOW_HOURS)
        )
        minutes_left = max(1, int((resets_at - datetime.now(timezone.utc)).total_seconds() / 60))

        raise HTTPException(
            status_code=429,
            detail={
                "message": f"Rate limit reached: {count}/{LIMIT} requests used. Resets in {minutes_left} minutes.",
                "used": count,
                "limit": LIMIT,
                "resets_in_minutes": minutes_left,
            },
        )


async def record_event(
    db: AsyncIOMotorDatabase,
    user_id: str,
    event_type: str,
) -> None:
    """
    Record a rate-limit event for the user.
    The TTL index on created_at handles auto-expiry after 1 hour.
    """
    await db.rate_limit_events.insert_one({
        "user_id": ObjectId(user_id),
        "event_type": event_type,
        "created_at": datetime.now(timezone.utc),
    })
    logger.debug("Rate event recorded: user=%s type=%s", user_id, event_type)


async def get_usage(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    """
    Return the current usage stats for the user within the rolling window.

    Returns:
        { used, limit, remaining, resets_in_minutes }
    """
    count = await db.rate_limit_events.count_documents({
        "user_id": ObjectId(user_id),
        "created_at": {"$gte": _window_start()},
    })

    resets_in = 60  # default when no events
    if count > 0:
        oldest = await db.rate_limit_events.find_one(
            {
                "user_id": ObjectId(user_id),
                "created_at": {"$gte": _window_start()},
            },
            sort=[("created_at", 1)],
        )
        if oldest:
            resets_at = _as_utc(oldest["created_at"]) + timedelta(hours=WINDOW_HOURS)
            resets_in = max(1, int((resets_at - datetime.now(timezone.utc)).total_seconds() / 60))

    return {
        "used": count,
        "limit": LIMIT,
        "remaining": max(0, LIMIT - count),
        "resets_in_minutes": resets_in,
    }
