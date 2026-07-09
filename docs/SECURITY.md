# SECURITY — findings, fixes, and required owner actions

_Last updated: 2026-06-10. Companion to `docs/AUDIT.md` (full findings register)._

## 🔴 OWNER ACTIONS REQUIRED (cannot be done from code)

1. **Rotate every credential that was committed to git** — repo history still contains them even though they are now untracked:
   - Brevo API key + Brevo SMTP key/login (`server/.env`, commit history)
   - Supabase anon key + project URL (`server/.env`, `.env` history — "Delete .env" commit `c700158` means it was committed before)
   - **Supabase Postgres database password** — was hardcoded in `backend/app/core/database.py` and ~10 scripts (now removed/archived). Treat as fully compromised.
2. **Scrub git history** before the repo is ever shared: `git filter-repo` (or BFG) for `server/.env`, `.env`, and the archived scripts containing the DB password.
3. **Restore or recreate the Supabase project.** All three project hosts referenced in the repo are NXDOMAIN (paused/deleted). Nothing works until this exists. When recreating: enable RLS on **every** table (the frontend talks to PostgREST directly in 152 call sites), configure Google OAuth if wanted, and set the new values in untracked `.env` files (`.env.example` templates are provided at root, `backend/`, `server/`).
4. **Set `EMAIL_API_KEY`** wherever the email service deploys (a dev value was appended to the local untracked `server/.env`).

## What was found (severity-ordered, condensed)

| # | Finding | Status |
|---|---------|--------|
| S1 | `server/.env` committed with live Brevo/SMTP/Supabase secrets | ✅ Untracked + gitignored; **rotation = owner action** |
| S2 | Postgres password hardcoded as fallback in `database.py` + 10 scripts | ✅ Fallback removed (boot now requires env); scripts archived; **rotation = owner action** |
| S3 | Edge function: 15 service-role admin actions with zero authorization ("I will trust the payload") | ✅ Fixed: explicit `ACTION_ROLES` map, JWT-derived actor identity, per-action role gates, ownership checks on group actions, adversarially reviewed |
| S4 | FastAPI: all 82 routes unauthenticated (46 mutations), IDs trusted from path | ✅ Auth dependency on every router (Supabase JWT, JWKS + HS256 legacy); ownership/role exemplar in `profile.py`; **per-route ownership for the other 17 routers = follow-up** (see AUDIT fix order) |
| S5 | Email server: open mail relay (no auth, wide-open CORS) | ✅ Fixed: fail-closed `x-api-key` middleware (timing-safe compare), pinned CORS, recipient validation (max 500, format-checked), live-tested |
| S6 | SMTP credentials bundled into the client app via `expo.extra` | ✅ Removed; confirmed nothing client-side read them |
| S7 | Every trainer created with hardcoded password `trainer123` (and edge-function fallback `12345678`) | ✅ Fixed: CSPRNG 12-char temp password (expo-crypto, no modulo bias) shown once to the owner; edge function now 400s on missing/short password |
| S8 | CORS `allow_origins=["*"]` + `allow_credentials=True` on the API | ✅ Pinned to `ALLOWED_ORIGINS` env |
| S9 | Global handler returned full stack traces to clients | ✅ Generic envelope to clients; full trace to server logs |
| S10 | Hardcoded dead ngrok tunnel as the mobile backend URL | ✅ `EXPO_PUBLIC_API_URL` env-driven config |
| S11 | `create_group` could silently rewrite any user's role to "Trainer" from payload | ✅ Only Trainee→Trainer promotion allowed; anything else rejected |
| S12 | Privilege-escalation via profile update (anyone could grant roles) | ✅ Role changes restricted to Owner/Admin; Owner grant restricted to Owner |

## Known residual gaps (documented, prioritized in AUDIT/ROADMAP)

- **Per-resource ownership checks** beyond `profiles` (e.g. a Trainer can still assign a diet to any trainee, a Receptionist to any branch) — role gates exist; resource scoping is the next hardening pass.
- **RLS status unknown** — the dead Supabase project means Row-Level Security policies could not be inspected. The new project must treat RLS as the primary defense for the 152 direct PostgREST calls; the FastAPI/edge layers are defense-in-depth.
- **Email flow needs an authenticated path**: the client (ReceptionistDashboard broadcast) cannot hold the email API key. Route email through the authenticated FastAPI backend (server-to-server with the key) — roadmap item; until then broadcast email from the app is intentionally non-functional (it was an open relay before).
- **Scheduler duplication** if the API ever runs multi-worker (APScheduler is in-process; `coalesce`/`max_instances` set, but multi-instance deployments need a single-runner or DB-locked jobs).
- `verify_jwt` deployment flag for the edge function should be confirmed ON in the new Supabase project.

## Conventions going forward

- Secrets only in untracked `.env` files; `.env.example` templates are the contract. The root `.gitignore` now ignores `**/.env` (with `!**/.env.example`).
- The client bundle may contain ONLY public values (`SUPABASE_URL`, anon key, `EXPO_PUBLIC_*`).
- Every new API route ships with an auth dependency and an ownership/role check — `backend/app/api/profile.py` is the pattern.
- Client code never receives stack traces, secrets, or other users' data it didn't query through an authorized path.
