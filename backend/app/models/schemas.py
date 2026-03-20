from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
import uuid


class LabelOut(BaseModel):
    id: int
    name: str


class RecipeBase(BaseModel):
    name: str
    prep_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    ingredients: str
    instructions: str
    variations: Optional[str] = None
    source_url: Optional[str] = None
    image_url: Optional[str] = None


class RecipeCreate(RecipeBase):
    label_ids: list[int] = []


class RecipeUpdate(RecipeBase):
    label_ids: list[int] = []


class RecipeOut(RecipeBase):
    id: uuid.UUID
    rating: Optional[float] = None
    rating_count: int
    labels: list[LabelOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecipeListItem(BaseModel):
    id: uuid.UUID
    name: str
    prep_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    rating_count: int
    labels: list[LabelOut] = []
    created_at: datetime
    updated_at: datetime


class RatingIn(BaseModel):
    rating: float  # 1-5
    previous_rating: Optional[float] = None  # if set, replace instead of add


class LabelCreate(BaseModel):
    name: str
