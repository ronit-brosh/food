# 🍳 אתר המתכונים

אתר מתכונים אישי — Next.js frontend + FastAPI backend + PostgreSQL.

---

## מבנה הפרויקט

```
recipes-app/
├── schema.sql          # הגדרת טבלאות DB
├── backend/            # FastAPI (Python)
├── frontend/           # Next.js (TypeScript + Tailwind)
└── scripts/            # סקריפטים לוקאליים להזנה
```

---

## הגדרה לוקאלית

### 1. PostgreSQL

```bash
createdb recipes_db
psql recipes_db < schema.sql
```

### 2. Backend (FastAPI)

```bash
cd backend
cp .env.example .env
# ערוך .env והגדר DATABASE_URL

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

הדוק יהיה זמין ב: http://localhost:8000/docs

### 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
# ודא NEXT_PUBLIC_API_URL=http://localhost:8000

npm install
npm run dev
```

האתר יהיה זמין ב: http://localhost:3000

---

## הזנת מתכונים

```bash
cd scripts
pip install -r requirements.txt

# קובץ .env עם DATABASE_URL (אפשר לשתף עם backend/.env)
cp ../backend/.env.example .env

# מצב אינטראקטיבי
python add_recipe.py

# הזנה מקובץ JSON
python add_recipe.py --file example_recipe.json

# הצגת כל המתכונים
python add_recipe.py --list

# ניהול תוויות
python add_recipe.py --labels
python add_recipe.py --add-label "טבעוני"
```

### פורמט JSON למתכון

```json
{
  "name": "שם המתכון",
  "prep_time_minutes": 30,
  "servings": 4,
  "ingredients": "מצרכים בטקסט חופשי",
  "instructions": "הוראות הכנה בטקסט חופשי",
  "variations": "וריאציות (אופציונלי)",
  "source_url": "https://...",
  "image_url": "https://...",
  "labels": ["ארוחת ערב", "טבעוני"]
}
```

---

## דיפלוי ל-Render

### Backend

1. צור **Web Service** חדש ב-Render
2. Root Directory: `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables:
   - `DATABASE_URL` — מה-PostgreSQL שתצרף
   - `ALLOWED_ORIGINS` — URL של ה-frontend (לאחר deploy)

### Database

1. צור **PostgreSQL** ב-Render
2. חבר ל-Web Service
3. הרץ את `schema.sql` דרך ה-Shell של Render:
   ```bash
   psql $DATABASE_URL < schema.sql
   ```

### Frontend

1. צור **Static Site** או **Web Service** חדש
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`  (לWeb Service)
5. Environment Variables:
   - `NEXT_PUBLIC_API_URL` — URL של ה-backend

---

## API Endpoints

| Method | Path | תיאור |
|--------|------|-------|
| GET | /api/recipes | רשימת מתכונים (sort, label_ids) |
| GET | /api/recipes/{id} | מתכון מלא |
| POST | /api/recipes | יצירת מתכון |
| PUT | /api/recipes/{id} | עדכון מתכון |
| DELETE | /api/recipes/{id} | מחיקת מתכון |
| POST | /api/recipes/{id}/rate | דירוג מתכון |
| GET | /api/labels | רשימת תוויות |
| POST | /api/labels | יצירת תווית |
| DELETE | /api/labels/{id} | מחיקת תווית |

---

## עתיד — חישובי קלוריות

הארכיטקטורה מוכנה לזה — רק להוסיף ל-FastAPI:
- טבלת `nutrition` עם פירוט תזונתי למתכון
- endpoint `/api/recipes/{id}/nutrition`
- אינטגרציה עם USDA FoodData API לזיהוי רכיבים
# food
