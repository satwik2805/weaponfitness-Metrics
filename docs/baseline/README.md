# Phase 0 — Baseline (captured 2026-06-09)

Ground-truth screenshots of the app **before any redesign work**, taken on Expo web
(`npx expo start --web`, Metro on :8081), driven headless via Playwright + system Edge
(`capture*.mjs` in this folder — kept so the capture is reproducible).

## Screens

| File | What it shows |
|------|---------------|
| `01-welcome.png` | Welcome screen. Renders fine. Ships a **"Test Backend Connection"** debug link to production users. |
| `02-login.png` | Login screen. Renders fine. |
| `03-login-error-state.png` | After submitting bad credentials: **no visible error state at all** — the screen is pixel-identical to `02`. Failure is silent (error only in console). |
| `04-trainee-home-no-session.png` | TraineeTabs rendered with no session/backend (captured by temporarily setting `initialRouteName`, reverted). Zeroed gamification data, "Welcome back, User", a **"Simulate Check-in (Dev)"** button in the live tree, and **broken icon glyphs (`󰙌`)** in the tab bar on web (vector-icon font not loaded). |

## What runs / what doesn't (verified, not assumed)

**Runs:**
- Expo web boots clean: `Web Bundled … (1170 modules)`, zero console errors on first paint of Welcome.
- Navigation Welcome → Login works.
- Screens render structurally without a backend (no crashes — components default to zeros).

**Dead — nothing data-driven can work today:**
- **All three Supabase hosts referenced by this repo are NXDOMAIN** (verified against 8.8.8.8, not just local DNS):
  - the host in `server/.env` / root `.env` (frontend auth + data),
  - `sdgrkwbofvxloglbumzy.supabase.co` (backend `database.py` + many debug scripts),
  - `vazxmixjsiawhamofees.supabase.co` (`components/WorkoutAvatar.js` storage asset).
  The Supabase projects are paused or deleted. **Login cannot succeed on any platform.** Owner action needed: restore or recreate a Supabase project.
- **The hardcoded ngrok tunnel** (`config/api.js`) returns 404 from the ngrok edge — tunnel offline. All mobile API traffic is pointed at a dead URL.
- **FastAPI backend**: no `requirements.txt`/`pyproject.toml` exists; its default `DATABASE_URL` fallback points at the dead Supabase host **with a committed password** (see SECURITY.md S8). Not bootable as-is.
- **Docker**: CLI installed, daemon not running.

## Environment notes
- Root `.env` did not exist; created locally (untracked, verified git-ignored) from the values in the tracked `server/.env` so the app could boot. No secret values were copied anywhere else or printed.
- Node 22.20.0, Python 3.14.0, Windows 11.
