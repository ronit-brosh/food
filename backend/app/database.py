import asyncpg
from app.config import settings

_pool: asyncpg.Pool | None = None


async def init_db():
    global _pool
    _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)


async def close_db():
    if _pool:
        await _pool.close()


async def get_db() -> asyncpg.Connection:
    """Dependency: yields a connection from the pool."""
    async with _pool.acquire() as conn:
        yield conn
