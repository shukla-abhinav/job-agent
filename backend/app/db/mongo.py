"""
MongoDB connection management using Motor (async driver).

Usage:
    - Call connect_mongo(app) during FastAPI startup (lifespan).
    - Use `get_db` as a FastAPI dependency in route handlers.
    - Indexes are created automatically on first connection.
"""

import logging
import certifi
from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


async def connect_mongo(app) -> None:
    """
    Connect to MongoDB Atlas and store the client + db on app.state.
    Also initialises all required indexes.
    Called from the FastAPI lifespan startup.
    """
    from app.config import settings

    logger.info("Connecting to MongoDB…")
    client = AsyncIOMotorClient(
        settings.mongo_uri,
        tlsCAFile=certifi.where(),  # Fix for macOS SSL certificate verification
    )
    db: AsyncIOMotorDatabase = client[settings.mongo_db_name]

    # Verify connection
    await client.admin.command("ping")
    logger.info("MongoDB connected — database: %s", settings.mongo_db_name)

    app.state.mongo_client = client
    app.state.db = db

    await _init_indexes(db)


async def close_mongo(app) -> None:
    """Close the Motor client — called from FastAPI lifespan shutdown."""
    client: AsyncIOMotorClient | None = getattr(app.state, "mongo_client", None)
    if client:
        client.close()
        logger.info("MongoDB connection closed")


async def _init_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create all required indexes (idempotent — safe to run on every startup)."""
    from pymongo import ASCENDING, DESCENDING

    # users.email — unique
    await db.users.create_index("email", unique=True)

    # resume_cache — unique per (user_id, resume_hash)
    await db.resume_cache.create_index(
        [("user_id", ASCENDING), ("resume_hash", ASCENDING)],
        unique=True,
    )

    # user_preferences — unique per user_id
    await db.user_preferences.create_index("user_id", unique=True)

    # rate_limit_events — TTL: auto-delete events older than 1 hour
    await db.rate_limit_events.create_index(
        "created_at",
        expireAfterSeconds=3600,
    )
    # Also index user_id + created_at for fast range queries
    await db.rate_limit_events.create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
    )

    logger.info("MongoDB indexes initialised")


async def get_db(request: Request) -> AsyncIOMotorDatabase:
    """
    FastAPI dependency — returns the active MongoDB database instance.
    Raises 503 if the database is not yet connected (should never happen
    after a clean startup).
    """
    db: AsyncIOMotorDatabase | None = getattr(request.app.state, "db", None)
    if db is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not available")
    return db
