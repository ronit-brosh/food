import asyncpg
from app.config import settings


async def get_db() -> asyncpg.Connection:
    """Dependency: yields a single connection per request (serverless-safe)."""
    conn = await asyncpg.connect(settings.database_url)
    try:
        yield conn
    finally:
        await conn.close()
