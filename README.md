# Weapon Fitness

A multi-surface gym platform: one codebase and one database serving the
**mobile app** (iOS/Android via Expo), the **web app** (`react-native-web`),
the staff/management surfaces (Owner, Admin, Trainer, Receptionist), and the
member experience (Trainee) — with a public website + standalone consumer app
on the roadmap.

> **Start here:** `docs/ROADMAP.md` (the plan) · `docs/AUDIT.md` (ground truth)
> · `docs/SECURITY.md` (hardening + **required owner actions**) ·
> `docs/DECISIONS.md` (why) · `docs/HANDOVER.md` (mission & quality bar)

## Architecture

```
Expo RN app (mobile + web) ──reads (RLS)──► Supabase (Postgres · Auth · Storage · Edge Fn)
        │                                        ▲
        └────────── REST (JWT) ──► FastAPI core API (business rules, schedulers)
Node/Express email service ──► Brevo  (x-api-key protected)
```

- **Frontend:** Expo SDK 54, React Navigation 7, design system in `theme/` +
  `components/ui/` (see the living gallery — run the app and open `/gallery`).
- **API:** FastAPI + SQLAlchemy + Alembic (`backend/`), Supabase-JWT auth on
  every business route (`backend/app/core/auth.py`).
- **Email:** `server/` (Express + Brevo), API-key gated.

## Running locally

Copy the env templates and fill them in (never commit real `.env` files):

```bash
cp .env.example .env                  # app:    SUPABASE_URL / ANON_KEY / EXPO_PUBLIC_API_URL
cp backend/.env.example backend/.env  # api:    DATABASE_URL / SUPABASE_URL / ALLOWED_ORIGINS
cp server/.env.example server/.env    # email:  SMTP + BREVO + EMAIL_API_KEY
```

```bash
# App (mobile + web)
npm install
npx expo start            # press w for web, a for Android

# API
cd backend
python -m venv .venv && .venv/Scripts/activate    # Windows
pip install -r requirements.txt                   # + requirements-vision.txt for food scanning
uvicorn main:app --reload --port 8000

# Email service
cd server && npm install && node index.js
```

**Design system gallery:** with the dev server running, open
`http://localhost:8081/gallery` — every primitive, every state, both themes.

**UI verification harness:** `node docs/design/capture-gallery.mjs` /
`capture-auth.mjs` (Playwright + system Edge) screenshot the app headlessly;
output lands in `docs/design/`.

## Deploying

**Web app → Vercel** (`vercel.json` is committed: static `expo export`, SPA
rewrites, immutable caching of hashed bundles). In the Vercel project settings
set these **build-time** environment variables — without them the deployed app
can't reach Supabase or the API:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | your project URL |
| `SUPABASE_ANON_KEY` | the anon key |
| `EXPO_PUBLIC_API_URL` | the deployed FastAPI base URL (required — the web fallback assumes `:8000` on the same host, which is wrong on Vercel) |

**FastAPI + email service → a persistent host** (Railway / Render / Fly — NOT
Vercel serverless: both run in-process schedulers that die between serverless
invocations). Point `ALLOWED_ORIGINS` at the Vercel domain.

**Mobile → EAS Build** (`eas.json` profiles exist): `eas build --platform android`.

## Repository map

| Path | What it is |
|------|------------|
| `theme/`, `components/ui/`, `components/brand/` | Design tokens, primitives, logo system |
| `screens/`, `navigation/`, `services/`, `config/` | App screens, role navigators, API clients |
| `backend/` | FastAPI core API (routers in `app/api/`, auth in `app/core/auth.py`) |
| `server/` | Email microservice (Brevo) |
| `supabase/functions/` | Role-gated edge function (admin actions) |
| `docs/` | Audit, roadmap, security, decisions, design captures |
| `_archive/` | Quarantined legacy scripts/dumps — see its README; safe to delete after review |

## Status (2026-06-10)

The original Supabase projects are dead — **the platform needs a fresh
Supabase project + full credential rotation before anything works
end-to-end.** The checklist is at the top of `docs/SECURITY.md`; the
resurrection plan is Milestone 0 in `docs/ROADMAP.md`.
