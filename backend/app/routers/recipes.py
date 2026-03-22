from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional
import asyncpg
from app.database import get_db
from app.models.schemas import RecipeCreate, RecipeUpdate, RecipeOut, RecipeListItem, RatingIn
from app.sync import sync_to_production

router = APIRouter()


async def fetch_labels_for_recipes(conn, recipe_ids: list) -> dict:
    if not recipe_ids:
        return {}
    rows = await conn.fetch(
        """
        SELECT rl.recipe_id, l.id, l.name
        FROM recipe_labels rl
        JOIN labels l ON l.id = rl.label_id
        WHERE rl.recipe_id = ANY($1::uuid[])
        """,
        recipe_ids,
    )
    result = {}
    for row in rows:
        rid = str(row["recipe_id"])
        result.setdefault(rid, []).append({"id": row["id"], "name": row["name"]})
    return result


@router.get("", response_model=list[RecipeListItem])
async def list_recipes(
    sort: str = Query("name", pattern="^(name|created_at)$"),
    label_ids: Optional[list[int]] = Query(None),
    conn: asyncpg.Connection = Depends(get_db),
):
    order = "r.name ASC" if sort == "name" else "r.created_at DESC"

    if label_ids:
        rows = await conn.fetch(
            f"""
            SELECT DISTINCT r.id, r.name, r.prep_time_minutes, r.servings,
                   r.image_url, r.rating, r.rating_count, r.created_at, r.updated_at
            FROM recipes r
            JOIN recipe_labels rl ON rl.recipe_id = r.id
            WHERE rl.label_id = ANY($1::int[])
            GROUP BY r.id
            HAVING COUNT(DISTINCT rl.label_id) = $2
            ORDER BY {order}
            """,
            label_ids,
            len(label_ids),
        )
    else:
        rows = await conn.fetch(
            f"""
            SELECT r.id, r.name, r.prep_time_minutes, r.servings,
                   r.image_url, r.rating, r.rating_count, r.created_at, r.updated_at
            FROM recipes r
            ORDER BY {order}
            """
        )

    recipe_ids = [row["id"] for row in rows]
    labels_map = await fetch_labels_for_recipes(conn, recipe_ids)

    return [
        {**dict(row), "labels": labels_map.get(str(row["id"]), [])}
        for row in rows
    ]


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(recipe_id: str, conn: asyncpg.Connection = Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM recipes WHERE id = $1::uuid", recipe_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Recipe not found")
    labels_map = await fetch_labels_for_recipes(conn, [row["id"]])
    return {**dict(row), "labels": labels_map.get(str(row["id"]), [])}


@router.post("", response_model=RecipeOut, status_code=201)
async def create_recipe(data: RecipeCreate, background_tasks: BackgroundTasks, auto_sync: bool = Query(True), conn: asyncpg.Connection = Depends(get_db)):
    async with conn.transaction():
        row = await conn.fetchrow(
            """
            INSERT INTO recipes (name, prep_time_minutes, servings, ingredients,
                                  instructions, variations, source_url, image_url)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            """,
            data.name, data.prep_time_minutes, data.servings,
            data.ingredients, data.instructions, data.variations,
            data.source_url, data.image_url,
        )
        if data.label_ids:
            await conn.executemany(
                "INSERT INTO recipe_labels (recipe_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [(row["id"], lid) for lid in data.label_ids],
            )
    labels_map = await fetch_labels_for_recipes(conn, [row["id"]])
    if auto_sync:
        background_tasks.add_task(sync_to_production)
    return {**dict(row), "labels": labels_map.get(str(row["id"]), [])}


@router.put("/{recipe_id}", response_model=RecipeOut)
async def update_recipe(recipe_id: str, data: RecipeUpdate, background_tasks: BackgroundTasks, auto_sync: bool = Query(True), conn: asyncpg.Connection = Depends(get_db)):
    async with conn.transaction():
        row = await conn.fetchrow(
            """
            UPDATE recipes SET name=$1, prep_time_minutes=$2, servings=$3,
              ingredients=$4, instructions=$5, variations=$6,
              source_url=$7, image_url=$8
            WHERE id=$9::uuid RETURNING *
            """,
            data.name, data.prep_time_minutes, data.servings,
            data.ingredients, data.instructions, data.variations,
            data.source_url, data.image_url, recipe_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Recipe not found")
        await conn.execute("DELETE FROM recipe_labels WHERE recipe_id=$1::uuid", recipe_id)
        if data.label_ids:
            await conn.executemany(
                "INSERT INTO recipe_labels (recipe_id, label_id) VALUES ($1, $2)",
                [(row["id"], lid) for lid in data.label_ids],
            )
    labels_map = await fetch_labels_for_recipes(conn, [row["id"]])
    if auto_sync:
        background_tasks.add_task(sync_to_production)
    return {**dict(row), "labels": labels_map.get(str(row["id"]), [])}


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: str, background_tasks: BackgroundTasks, auto_sync: bool = Query(True), conn: asyncpg.Connection = Depends(get_db)):
    result = await conn.execute("DELETE FROM recipes WHERE id=$1::uuid", recipe_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Recipe not found")
    if auto_sync:
        background_tasks.add_task(sync_to_production)


@router.post("/{recipe_id}/rate", response_model=RecipeOut)
async def rate_recipe(recipe_id: str, body: RatingIn, conn: asyncpg.Connection = Depends(get_db)):
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    if body.previous_rating is not None:
        # Replace existing rating — count stays the same
        row = await conn.fetchrow(
            """
            UPDATE recipes
            SET rating = ROUND(
                  (COALESCE(rating, 0) * rating_count - $1 + $2) / GREATEST(rating_count, 1)::numeric, 1
                )
            WHERE id = $3::uuid RETURNING *
            """,
            body.previous_rating, body.rating, recipe_id,
        )
    else:
        # New rating — increment count
        row = await conn.fetchrow(
            """
            UPDATE recipes
            SET rating = ROUND(
                  (COALESCE(rating, 0) * rating_count + $1) / (rating_count + 1)::numeric, 1
                ),
                rating_count = rating_count + 1
            WHERE id = $2::uuid RETURNING *
            """,
            body.rating, recipe_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Recipe not found")
    labels_map = await fetch_labels_for_recipes(conn, [row["id"]])
    return {**dict(row), "labels": labels_map.get(str(row["id"]), [])}
