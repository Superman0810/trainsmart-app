# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

After completing any meaningful unit of work — a new feature, a bug fix, a refactor, or any non-trivial change — commit and push immediately:

```bash
git add <specific files>
git commit -m "type: short description"
git push
```

Commit message prefixes: `feat:` (new feature), `fix:` (bug fix), `refactor:` (restructure without behavior change), `docs:` (documentation), `style:` (CSS/UI only). Never batch unrelated changes into one commit. Never leave work uncommitted at the end of a session.

## Dev Commands

**Backend** (run from `backend/`):
```bash
pip install -r requirements.txt
cp .env.example .env          # then add ANTHROPIC_API_KEY
uvicorn main:app --reload     # API at http://localhost:8000
```

**Frontend** (run from `frontend/`):
```bash
npm install
npm run dev                   # UI at http://localhost:5173
npm run build
```

**API docs**: http://localhost:8000/docs (FastAPI auto-generated Swagger UI)

## Architecture

Two independent processes that must both run locally:

```
frontend (React/Vite :5173)  →  backend (FastAPI :8000)  →  Claude API
                                        ↓
                                   SQLite (training.db)
```

### Backend (`backend/`)

- `main.py` — FastAPI app entry point. Loads `.env`, creates all DB tables on startup, mounts three routers.
- `database.py` — SQLAlchemy engine + `SessionLocal` + `get_db()` dependency.
- `models.py` — ORM models: `User → Profile, Goal → Plan → Session → SessionLog`, `AdaptEvent`.
- `schemas.py` — Pydantic schemas for request/response validation.
- `routers/plans.py` — `POST /plans/generate` (onboarding → Claude → DB), `GET /plans/{id}`, `POST /plans/adapt`.
- `routers/sessions.py` — `POST /sessions/{id}/log`. Also triggers `_auto_tune()` every 7 logged sessions.
- `routers/export.py` — `GET /export/{id}/excel` and `/pdf` — streams file downloads.
- `services/claude_service.py` — All Claude API calls. Three functions: `generate_plan`, `adapt_plan`, `tune_from_feedback`. Model: `claude-sonnet-4-6`. System prompt is cached (`cache_control: ephemeral`). All three functions return raw parsed JSON matching the `Session` schema.
- `services/export_service.py` — `generate_excel()` returns bytes via openpyxl; `generate_pdf_html()` returns an HTML string that `routers/export.py` passes to WeasyPrint.

### Frontend (`frontend/src/`)

- `api.js` — Single source for all `fetch` calls to `http://localhost:8000`. Import `api` object everywhere.
- `App.jsx` — Three routes: `/` (Home), `/onboarding` (Onboarding), `/dashboard/:planId` (Dashboard).
- `pages/Onboarding.jsx` — 6-step form (goal type → race date → personal info → availability → equipment → injuries). On final submit calls `api.generatePlan()` and navigates to `/dashboard/:planId`.
- `pages/Dashboard.jsx` — Main view. Fetches plan via React Query, renders weekly calendar grid, phase overview bar, and export links. Opens `SessionCard` or `AdaptModal` as overlays.
- `components/SessionCard/` — Overlay for logging a session (RPE slider + notes + done/skipped).
- `components/AdaptModal/` — Overlay for reporting sick/travel/injury events; calls `api.adaptPlan()`.

### Data flow for plan generation

1. Frontend submits onboarding form → `POST /plans/generate`
2. Backend creates `User`, `Goal`, `Profile`, `Plan` in DB, calls `claude_service.generate_plan()`
3. Claude returns a JSON array of session objects (one per day for the full plan duration)
4. Backend upserts all sessions to DB, returns `PlanOut` with nested sessions
5. Frontend navigates to `/dashboard/:planId` and renders the calendar

### Plan adaptation flow

1. User opens AdaptModal, selects type + date range → `POST /plans/adapt`
2. Backend fetches all sessions from `start_date` onward, passes them to `claude_service.adapt_plan()`
3. Claude returns the same array with modified sessions; backend matches by `session.id` and upserts
4. Frontend invalidates the React Query cache, re-renders the calendar

## Key Constraints

- Claude always returns **plain JSON arrays** — no markdown fences. If Claude wraps output in backticks the `json.loads()` call will throw; handle this in `_call()` if it becomes an issue.
- The `adapt_plan` endpoint passes session `id` values inside the JSON sent to Claude so the backend can match returned sessions back to DB rows. Claude must preserve these `id` fields unchanged.
- Auto-tune (`_auto_tune`) fires in `routers/sessions.py` after every 7th logged session. It only touches sessions in the next 7 days and requires at least 2 recent logs with RPE values to act.
- CORS is locked to `http://localhost:5173`. Update `main.py` when deploying.
- SQLite file (`training.db`) is gitignored. Schema is auto-created from models on every `uvicorn` startup via `Base.metadata.create_all()`.
