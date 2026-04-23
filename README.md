# TrainSmart — Adaptive Training Plan App

A browser-based app that generates personalized training plans using Claude AI.
Supports running, triathlon, and any endurance goal. Adapts when life gets in the way.

## Setup

### 1. Get a Claude API Key
1. Go to https://console.anthropic.com
2. Sign up → API Keys → Create Key
3. Copy the key (starts with `sk-ant-…`)

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and paste your API key
uvicorn main:app --reload
```

API runs at http://localhost:8000

### 3. Frontend

Install Node.js first if needed: https://nodejs.org (LTS version)

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173 — open in your browser.

## Features

- **6-step onboarding**: goal, race date, profile, availability, equipment, injuries
- **AI-generated plan**: 4 phases (Initial → Progression → Taper → Recovery)
- **Weekly calendar**: color-coded by session type (run/bike/swim/strength/mobility/rest)
- **Session feedback**: mark done/skipped, log RPE (effort 1–10), add notes
- **Auto-adaptation**: plan adjusts automatically after 7+ logged sessions
- **Manual adaptation**: report sick / traveling / injured → Claude rewrites affected sessions
- **Export**: download as Excel (.xlsx) or PDF

## Tech Stack

- Frontend: React 18 + Vite + React Query
- Backend: Python + FastAPI + SQLite
- AI: Claude (claude-sonnet-4-6) via Anthropic API
- Export: openpyxl (Excel) + WeasyPrint (PDF)
