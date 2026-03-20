from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.database import get_db
from app.models.schemas import LabelCreate, LabelOut

router = APIRouter()


@router.get("", response_model=list[LabelOut])
async def list_labels(conn: asyncpg.Connection = Depends(get_db)):
    rows = await conn.fetch("SELECT id, name FROM labels ORDER BY name")
    return [dict(r) for r in rows]


@router.post("", response_model=LabelOut, status_code=201)
async def create_label(data: LabelCreate, conn: asyncpg.Connection = Depends(get_db)):
    row = await conn.fetchrow(
        "INSERT INTO labels (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *",
        data.name.strip(),
    )
    return dict(row)


@router.delete("/{label_id}", status_code=204)
async def delete_label(label_id: int, conn: asyncpg.Connection = Depends(get_db)):
    result = await conn.execute("DELETE FROM labels WHERE id=$1", label_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Label not found")
