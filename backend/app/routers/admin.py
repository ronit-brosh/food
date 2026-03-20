from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import anthropic
import base64
import json
from app.config import settings

router = APIRouter()


class ParseRequest(BaseModel):
    url: Optional[str] = None
    image_base64: Optional[str] = None
    media_type: Optional[str] = "image/jpeg"
    text: Optional[str] = None


class ParsedRecipe(BaseModel):
    name: str
    prep_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    ingredients: str
    instructions: str
    variations: Optional[str] = None
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    suggested_labels: list[str] = []


KNOWN_LABELS = [
    "טבעוני", "טבעונישי", "כרוב", "מלפוף מחשי", "ממולאים",
    "צמחוני", "צמחונישי", "צמחונישי - סירים",
]

PARSE_PROMPT = f"""Extract the recipe from the content below. Return ONLY valid JSON with these exact fields:
{{
  "name": "recipe name",
  "prep_time_minutes": null or integer (total prep+cook time in minutes),
  "servings": null or integer,
  "ingredients": "all ingredients as plain text, one per line",
  "instructions": "all preparation steps as plain text",
  "variations": null or "any tips, substitutions, or variations",
  "source_url": null or "source URL if known",
  "image_url": null or "main image URL if present in the content",
  "suggested_labels": ["exact label strings from the known list below"]
}}

For suggested_labels: scan the content for an explicit "תגיות" / tags section and include ALL labels listed there that appear in the known list. Also include any additional labels from the known list that clearly apply to this recipe.
Use the EXACT spelling from the known list:
{json.dumps(KNOWN_LABELS, ensure_ascii=False)}

No markdown, no explanation — JSON only."""


@router.post("/parse", response_model=ParsedRecipe)
async def parse_recipe(req: ParseRequest):
    api_key = settings.anthropic_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)

    if req.url:
        # Use Jina Reader to get clean text (handles JS-rendered pages, paywalls, etc.)
        jina_url = f"https://r.jina.ai/{req.url}"
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as http:
                resp = await http.get(jina_url, headers={"Accept": "text/plain"})
                content = resp.text[:40000]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

        messages = [{
            "role": "user",
            "content": f"{PARSE_PROMPT}\n\nSource URL: {req.url}\n\nPage content:\n{content}"
        }]

    elif req.image_base64:
        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": req.media_type or "image/jpeg",
                        "data": req.image_base64,
                    }
                },
                {"type": "text", "text": PARSE_PROMPT}
            ]
        }]

    elif req.text:
        messages = [{
            "role": "user",
            "content": f"{PARSE_PROMPT}\n\nRecipe text:\n{req.text[:40000]}"
        }]

    else:
        raise HTTPException(status_code=400, detail="Provide url, image_base64, or text")

    try:
        msg = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            messages=messages,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")

    text = msg.content[0].text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")

    # Coerce types safely
    for int_field in ("prep_time_minutes", "servings"):
        v = data.get(int_field)
        if v is not None:
            try:
                data[int_field] = int(v)
            except (ValueError, TypeError):
                data[int_field] = None

    # Required string fields — if LLM returned null the page was likely blocked
    if not data.get("ingredients") or not data.get("instructions"):
        raise HTTPException(
            status_code=422,
            detail="לא הצלחתי לחלץ את המתכון מהדף. ייתכן שהדף חסום או מוגן. נסי להעתיק את הטקסט ידנית."
        )

    return ParsedRecipe(**data)
