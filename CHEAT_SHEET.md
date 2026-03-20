python3 -m venv .venv   
source .venv/bin/activate  
deactivate


# Bakcend
docs: http://localhost:8000/docs
uvicorn app.main:app --reload --port 8000

# Frontend
http://localhost:3010
npm run dev -- --port 3010



# Requirements
pip install -r shared/requirements.txt
pip install -r apps/backend/requirements.txt
pip install -r apps/collectors/requirements.txt

# Backend
python -m uvicorn apps.backend.app.main:app --reload --reload-dir apps/backend --port 8001
curl -X POST "http://localhost:8000/agents/insights/trip_002?num_insights=5"

# Collectors
python -m apps.collectors.whatsapp.run

python -m apps.collectors.gmail.run
python -m uvicorn apps.collectors.gmail.run:run --reload --reload-dir apps/collectors --port 8002 

python -m scripts.test_parser hotels booking booking

# DB
python -m shared.persistence.create_tables
python -m shared.persistence.handle_tables create/drop/reset
python -m shared.persistence.seed_data
psql travel_companion
\dt

tree -L 3

pip install -r requirements.txt
uvicorn apps.backend.app.main:app --host 0.0.0.0 --port 8000


find . -name "gmail_credentials.json" -o -name "gmail_token.pickle"

http://localhost:8001/bookings.html

# Migrate DB
# 1. Export מה-local
# 1. ייצוא מהדאטהבייס המקומי
pg_dump postgresql://localhost/travel_companion > /tmp/travel_backup.sql

# 2. ייבוא לפרודקשן (Neon)
# איפוס + ייבוא
psql "[conn_str]" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
  && psql "[conn_str]" \
  < /tmp/travel_backup.sql



# 2. מחק והכל מחדש + import לפרודקשן
psql "[prod-conn-str]" -c "DROP SCHEMA public CASCADE; 
pg_dump postgresql://localhost/travel_companion > /tmp/travel_backup.sql

CREATE SCHEMA public;" && psql "[prod-conn-str]" < /tmp/backup.sql




**הקשר:**
- הקולקטור רץ כל יום
- בריצה ראשונה: 100 מיילים חדשים
- בריצות הבאות: בדרך כלל 0-5 חדשים, השאר כבר ב-DB
- יש deduplication check על message_id בטבלת emails

**הבעיה:**
- כרגע עושים 2 API calls למייל: get_metadata + get_message
- זה 202 calls עבור 101 מיילים
- **גם מיילים שכבר ב-DB** נשלפים מחדש

**מטרות:**
1. צמצום API calls (יקרים + rate limits)
2. לא לשלוף מיילים שכבר קיימים ב-DB
3. שמירה על פשטות הקוד

**שאלות:**
- האם כדאי לבדוק existence לפני fetching?
- איפה נכון לעשות את ה-deduplication check?
- מה trade-off בין מספר queries ל-DB vs מספר API calls?

**תן לי:**
1. קודם הסבר את הגישה שלך (2-3 אפשרויות אם יש)
2. אחר כך תממש את הנבחרת
