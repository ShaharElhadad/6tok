# 6TOK — למכור בביטחון

מערכת לניתוח שיחות מכירה:
**העלאת הקלטה → תמלול מדויק (WhisperX large-v3) → ניתוח AI של קירובים, הרחקות, שאלות, טון ורגש → הצמדה לכל רגע בשיחה.**

## Stack

- **Frontend/API:** Next.js 15 App Router (TypeScript, Tailwind, RTL עברית)
- **DB:** SQLite דרך `better-sqlite3` (קובץ ב־`./data/6tok.db`). המעבר ל־Postgres בהמשך = החלפת driver + התאמת `AUTOINCREMENT → SERIAL`.
- **אודיו:** אחסון לוקאלי ב־`./uploads/`, ניגון דרך `/api/recordings/[id]/audio` עם HTTP Range.
- **תמלול:** שרת Python נפרד (`whisper-server/`) — FastAPI + **WhisperX** (faster-whisper `large-v3` + wav2vec2 alignment).
- **ניתוח:** Claude API (Opus) עם prompt מכירות מותאם עברית.
- **נגן:** WaveSurfer.js — לחיצה על מילה קופצת לאודיו.

## הפעלה (לוקאלי)

### 1. התקנה
```bash
npm install
npm run db:init
cp .env.example .env.local
# ערוך .env.local: הכנס ANTHROPIC_API_KEY
```

### 2. הפעלת שרת ה־Whisper (חלון טרמינל נפרד)
```bash
cd whisper-server
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install torch  # GPU? ראה whisper-server/README.md
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8787
```

### 3. הפעלת האפליקציה
```bash
npm run dev
# http://localhost:3300
```

## זרימה

1. **Home** (`/`) — אזור העלאה + רשימת הקלטות.
2. העלאת קובץ → נשמר ב־`uploads/` → רשומה ב־DB → טריגר אוטומטי של `/api/recordings/:id/transcribe`.
3. שרת ה־Whisper מחזיר segments + word-level timestamps → נשמר ב־`transcript_segments`.
4. אוטומטית נקראת `/api/recordings/:id/analyze` → Claude מחזיר JSON עם ציון, חזקות/חולשות, findings מוצמדים לרגע בשיחה, השוואה לתסריט, המלצות.
5. **Recording View** (`/recordings/:id`) — נגן WaveSurfer + תמלול מסונכרן (מילה מודגשת, לחיצה קופצת) + Sidebar עם הניתוח, כולל filter של רגעי מפתח חיוביים/לשיפור.
6. **Scripts** (`/scripts`) — עריכה/ניהול תסריטים; התסריט הפעיל מוזרק אוטומטית לניתוח.

## מבנה

```
6tok/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Home
│   │   ├── scripts/page.tsx       # ניהול תסריטים
│   │   ├── recordings/[id]/page.tsx
│   │   └── api/
│   │       ├── upload/
│   │       ├── recordings/[id]/{route,audio,transcribe,analyze}
│   │       └── scripts/{route,[id]}
│   ├── components/                # Logo, UploadZone, AudioPlayer, RecordingView, ScriptsPage, ...
│   ├── lib/{whisper,analyze,cn}.ts
│   └── db/{schema.sql,index.ts,init.mjs}
├── whisper-server/                # FastAPI + WhisperX
│   ├── server.py
│   ├── requirements.txt
│   └── README.md
├── public/logo.png
├── uploads/                       # gitignored
├── data/                          # gitignored (SQLite)
└── package.json
```

## Deploy ל־Hostinger

1. **Node app:** הריצו `npm ci && npm run build && npm start` (port `3300`).
2. **Whisper server:** תהליך נפרד ב־Python venv, port `8787`. מומלץ systemd service.
3. ערכו `.env` עם `WHISPER_URL=http://127.0.0.1:8787` ו־`ANTHROPIC_API_KEY`.
4. אם יש GPU ב־VPS — התקינו torch עם CUDA. ללא GPU הכל עובד ב־CPU `int8` (איטי יותר אבל מדויק).
5. **Reverse proxy** (nginx) לאפליקציה בפורט 3300.

## עתיד (לא ב־MVP הזה)

- אימות משתמשים + תפקידים (`agent`/`admin`)
- דשבורד אדמין — מעקב אחר סוכנים, פידבק
- מעקב התקדמות אישי לאורך זמן (גרפים, ציון ממוצע, נושאים חוזרים)
- דיאריזציה מלאה (מי מדבר מתי) — כבר תמוכה בשרת Whisper, לא מחווטת ל־UI
- תגיות על שיחות / פילטרים / חיפוש
- ייצוא דוחות
