"""
Sync local recipes → production database.
- Recipes in local but not prod  → INSERT
- Recipes in both, local newer   → UPDATE
- Recipes in prod but not local  → DELETE
Labels are synced by name (IDs may differ between envs).
"""

import asyncpg
import logging
from app.config import settings

logger = logging.getLogger(__name__)


async def get_diff() -> dict:
    """Returns diff between local and production."""
    if not settings.prod_database_url:
        return {"to_add": [], "to_update": [], "to_delete": []}
    local = await asyncpg.connect(settings.database_url)
    prod  = await asyncpg.connect(settings.prod_database_url)
    try:
        local_rows = await local.fetch("SELECT id, name, updated_at FROM recipes")
        prod_rows  = await prod.fetch("SELECT id, name, updated_at FROM recipes")
        local_map = {str(r["id"]): r for r in local_rows}
        prod_map  = {str(r["id"]): r for r in prod_rows}
        return {
            "to_add":    [{"id": rid, "name": r["name"]} for rid, r in local_map.items() if rid not in prod_map],
            "to_update": [{"id": rid, "name": r["name"]} for rid, r in local_map.items() if rid in prod_map and r["updated_at"] > prod_map[rid]["updated_at"]],
            "to_delete": [{"id": rid, "name": r["name"]} for rid, r in prod_map.items() if rid not in local_map],
        }
    finally:
        await local.close()
        await prod.close()


async def sync_selected(add: list[str], update: list[str], delete: list[str]) -> None:
    """Sync only selected recipe IDs to production."""
    if not settings.prod_database_url:
        return
    local = await asyncpg.connect(settings.database_url)
    prod  = await asyncpg.connect(settings.prod_database_url)
    try:
        label_map = await _sync_labels(local, prod)
        for rid in delete:
            await prod.execute("DELETE FROM recipes WHERE id = $1::uuid", rid)
        all_ids = add + update
        if all_ids:
            rows = await local.fetch("SELECT * FROM recipes WHERE id = ANY($1::uuid[])", all_ids)
            for r in rows:
                rid = str(r["id"])
                if rid in add:
                    await _insert_recipe(local, prod, r, label_map)
                else:
                    await _update_recipe(local, prod, r, label_map)
    finally:
        await local.close()
        await prod.close()


async def sync_to_production() -> None:
    if not settings.prod_database_url:
        return

    try:
        local = await asyncpg.connect(settings.database_url)
        prod  = await asyncpg.connect(settings.prod_database_url)
        try:
            label_map = await _sync_labels(local, prod)
            await _sync_recipes(local, prod, label_map)
            logger.info("Sync to production completed successfully")
        finally:
            await local.close()
            await prod.close()
    except Exception as e:
        logger.error(f"Sync to production failed: {e}")


async def _sync_labels(local: asyncpg.Connection, prod: asyncpg.Connection) -> dict[int, int]:
    """Upsert all local labels into prod. Returns {local_id: prod_id}."""
    rows = await local.fetch("SELECT id, name FROM labels")
    id_map: dict[int, int] = {}
    for row in rows:
        prod_row = await prod.fetchrow(
            """
            INSERT INTO labels (name) VALUES ($1)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            row["name"],
        )
        id_map[row["id"]] = prod_row["id"]
    return id_map


async def _sync_recipes(
    local: asyncpg.Connection,
    prod: asyncpg.Connection,
    label_map: dict[int, int],
) -> None:
    local_rows = await local.fetch("SELECT * FROM recipes")
    local_map  = {str(r["id"]): r for r in local_rows}

    prod_rows = await prod.fetch("SELECT id, updated_at FROM recipes")
    prod_map  = {str(r["id"]): r["updated_at"] for r in prod_rows}

    # Delete from prod what no longer exists locally
    for rid in set(prod_map) - set(local_map):
        await prod.execute("DELETE FROM recipes WHERE id = $1::uuid", rid)
        logger.info(f"Deleted recipe {rid} from prod")

    # Insert or update
    for rid, r in local_map.items():
        if rid not in prod_map:
            await _insert_recipe(local, prod, r, label_map)
            logger.info(f"Inserted recipe {rid} into prod")
        elif r["updated_at"] > prod_map[rid]:
            await _update_recipe(local, prod, r, label_map)
            logger.info(f"Updated recipe {rid} in prod")


async def _insert_recipe(
    local: asyncpg.Connection,
    prod: asyncpg.Connection,
    r: asyncpg.Record,
    label_map: dict[int, int],
) -> None:
    async with prod.transaction():
        await prod.execute(
            """
            INSERT INTO recipes (
                id, name, prep_time_minutes, servings, ingredients,
                instructions, variations, source_url, image_url,
                rating, rating_count, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            """,
            r["id"], r["name"], r["prep_time_minutes"], r["servings"],
            r["ingredients"], r["instructions"], r["variations"],
            r["source_url"], r["image_url"], r["rating"], r["rating_count"],
            r["created_at"], r["updated_at"],
        )
        await _sync_labels_for_recipe(local, prod, r["id"], label_map)


async def _update_recipe(
    local: asyncpg.Connection,
    prod: asyncpg.Connection,
    r: asyncpg.Record,
    label_map: dict[int, int],
) -> None:
    async with prod.transaction():
        await prod.execute(
            """
            UPDATE recipes SET
                name=$1, prep_time_minutes=$2, servings=$3,
                ingredients=$4, instructions=$5, variations=$6,
                source_url=$7, image_url=$8, rating=$9,
                rating_count=$10, updated_at=$11
            WHERE id = $12
            """,
            r["name"], r["prep_time_minutes"], r["servings"],
            r["ingredients"], r["instructions"], r["variations"],
            r["source_url"], r["image_url"], r["rating"],
            r["rating_count"], r["updated_at"], r["id"],
        )
        await _sync_labels_for_recipe(local, prod, r["id"], label_map)


async def _sync_labels_for_recipe(
    local: asyncpg.Connection,
    prod: asyncpg.Connection,
    recipe_id,
    label_map: dict[int, int],
) -> None:
    local_labels = await local.fetch(
        "SELECT label_id FROM recipe_labels WHERE recipe_id = $1", recipe_id
    )
    await prod.execute("DELETE FROM recipe_labels WHERE recipe_id = $1", recipe_id)
    for row in local_labels:
        prod_label_id = label_map.get(row["label_id"])
        if prod_label_id:
            await prod.execute(
                "INSERT INTO recipe_labels (recipe_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                recipe_id, prod_label_id,
            )
