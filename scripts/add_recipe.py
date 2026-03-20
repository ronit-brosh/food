#!/usr/bin/env python3
"""
add_recipe.py — סקריפט לוקאלי להזנת מתכונים

שימוש:
  python add_recipe.py                    # מצב אינטראקטיבי
  python add_recipe.py --file recipe.json # הזנה מקובץ JSON
  python add_recipe.py --list             # הצגת כל המתכונים
  python add_recipe.py --labels           # הצגת כל התויות
  python add_recipe.py --add-label "טבעוני"  # הוספת תווית
"""

import argparse
import json
import os
import sys
import textwrap
from datetime import datetime

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("❌  DATABASE_URL לא מוגדר ב-.env")
    sys.exit(1)


def get_conn():
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)


# ─────────────────────────────────────────
# Labels helpers
# ─────────────────────────────────────────

def list_labels(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM labels ORDER BY name")
        return cur.fetchall()


def get_or_create_label(conn, name: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO labels (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
            (name.strip(),),
        )
        return cur.fetchone()["id"]


def add_label(name: str):
    with get_conn() as conn:
        lid = get_or_create_label(conn, name)
        conn.commit()
        print(f"✅  תווית '{name}' נוצרה/קיימת עם id={lid}")


# ─────────────────────────────────────────
# Recipe helpers
# ─────────────────────────────────────────

def list_recipes(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, created_at FROM recipes ORDER BY name")
        return cur.fetchall()


def insert_recipe(conn, data: dict) -> str:
    """Insert recipe + labels, return new recipe id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO recipes
              (name, prep_time_minutes, servings, ingredients, instructions,
               variations, source_url, image_url)
            VALUES (%(name)s, %(prep_time_minutes)s, %(servings)s, %(ingredients)s,
                    %(instructions)s, %(variations)s, %(source_url)s, %(image_url)s)
            RETURNING id
            """,
            {
                "name": data["name"],
                "prep_time_minutes": data.get("prep_time_minutes"),
                "servings": data.get("servings"),
                "ingredients": data["ingredients"],
                "instructions": data["instructions"],
                "variations": data.get("variations"),
                "source_url": data.get("source_url"),
                "image_url": data.get("image_url"),
            },
        )
        recipe_id = str(cur.fetchone()["id"])

    # Handle labels
    label_names: list[str] = data.get("labels", [])
    for lname in label_names:
        lid = get_or_create_label(conn, lname)
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO recipe_labels (recipe_id, label_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (recipe_id, lid),
            )

    return recipe_id


# ─────────────────────────────────────────
# Interactive mode
# ─────────────────────────────────────────

def multiline_input(prompt: str) -> str:
    """Read multiline text; end with a line containing only '###'."""
    print(f"{prompt}")
    print("  (סיים עם שורה המכילה ### בלבד)")
    lines = []
    while True:
        line = input()
        if line.strip() == "###":
            break
        lines.append(line)
    return "\n".join(lines)


def optional_int(prompt: str) -> int | None:
    val = input(prompt).strip()
    if not val:
        return None
    try:
        return int(val)
    except ValueError:
        print("  ⚠️  ערך לא תקין, משאיר ריק")
        return None


def interactive_add():
    print("\n" + "═" * 50)
    print("   הוספת מתכון חדש")
    print("═" * 50 + "\n")

    name = input("שם המתכון: ").strip()
    if not name:
        print("❌  שם חובה")
        return

    prep_time = optional_int("זמן הכנה (דקות, אופציונלי): ")
    servings = optional_int("כמות מנות (אופציונלי): ")
    source_url = input("לינק מקור (אופציונלי): ").strip() or None
    image_url = input("URL תמונה (אופציונלי): ").strip() or None

    print()
    ingredients = multiline_input("מצרכים:")
    print()
    instructions = multiline_input("הוראות הכנה:")
    print()
    variations_raw = input("וריאציות (שורה אחת, אופציונלי): ").strip()
    variations = variations_raw or None

    # Labels
    with get_conn() as conn:
        existing = list_labels(conn)

    if existing:
        print("\nתוויות קיימות:")
        for l in existing:
            print(f"  [{l['id']}] {l['name']}")

    labels_input = input("\nתויות למתכון זה (שמות מופרדים בפסיק): ").strip()
    label_names = [l.strip() for l in labels_input.split(",") if l.strip()] if labels_input else []

    data = {
        "name": name,
        "prep_time_minutes": prep_time,
        "servings": servings,
        "ingredients": ingredients,
        "instructions": instructions,
        "variations": variations,
        "source_url": source_url,
        "image_url": image_url,
        "labels": label_names,
    }

    print("\n" + "─" * 40)
    print(f"  שם: {name}")
    print(f"  זמן: {prep_time or '—'} | מנות: {servings or '—'}")
    print(f"  תויות: {', '.join(label_names) or '—'}")
    confirm = input("\nלהוסיף? (y/n): ").strip().lower()
    if confirm != "y":
        print("בוטל.")
        return

    with get_conn() as conn:
        recipe_id = insert_recipe(conn, data)
        conn.commit()

    print(f"\n✅  המתכון '{name}' נוסף בהצלחה! id={recipe_id}\n")


# ─────────────────────────────────────────
# JSON file mode
# ─────────────────────────────────────────

def add_from_file(path: str):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    # Support both single recipe or list
    recipes = data if isinstance(data, list) else [data]

    with get_conn() as conn:
        for recipe in recipes:
            recipe_id = insert_recipe(conn, recipe)
            print(f"✅  '{recipe['name']}' → {recipe_id}")
        conn.commit()

    print(f"\nסה״כ {len(recipes)} מתכונים נוספו.")


# ─────────────────────────────────────────
# CLI
# ─────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="הזנת מתכונים לוקאלית")
    parser.add_argument("--file", help="נתיב לקובץ JSON עם מתכון/ים")
    parser.add_argument("--list", action="store_true", help="הצג כל המתכונים")
    parser.add_argument("--labels", action="store_true", help="הצג כל התוויות")
    parser.add_argument("--add-label", metavar="NAME", help="הוסף תווית")
    args = parser.parse_args()

    if args.list:
        with get_conn() as conn:
            recipes = list_recipes(conn)
        if not recipes:
            print("אין מתכונים.")
        for r in recipes:
            dt = r["created_at"].strftime("%d/%m/%Y") if r["created_at"] else ""
            print(f"  {r['id']}  {r['name']:<40} {dt}")
        return

    if args.labels:
        with get_conn() as conn:
            labels = list_labels(conn)
        if not labels:
            print("אין תוויות.")
        for l in labels:
            print(f"  [{l['id']}] {l['name']}")
        return

    if args.add_label:
        add_label(args.add_label)
        return

    if args.file:
        add_from_file(args.file)
        return

    # Default: interactive
    interactive_add()


if __name__ == "__main__":
    main()
