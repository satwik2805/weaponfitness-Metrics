# WEAPON FITNESS — Engineering & Design Handover

> **You are not "fixing a few things." You are taking an ambitious-but-broken codebase and forging it into the single best fitness software ever built — simultaneously the #1 gym-management platform on earth AND, when its consumer surface launches, the #1 standalone fitness app on earth.** Two products, one evolvable codebase. Read this entire document before you touch a single line. It is the contract for the work.

> **Extreme attention to detail is the standard, not the aspiration.** Every pixel, every state, every interaction, every query, every error path is deliberate. The owner expects work that reads as years of senior craft. Nothing ships half-considered.

> **This code is a starting point, not a cage. You are explicitly licensed to refactor, re-architect, and evolve any part of it** to reach that bar — provided you do not regress functionality that currently works (see §2). Don't preserve bad structure out of politeness; the previous team's code is raw material.

**Repo:** `Fortimark-co/weaponfitness` (private) · **Branch:** `main`
**Local working copy:** `C:\Users\vigne\Desktop\gymapp`
**Handover authored after:** a full structural recon pass + targeted line-level reads of config, auth, navigation, backend bootstrap, and the theme layer. Specific confirmed findings are cited with file paths below — they are real, not guesses.

---

## 0. How to use this handover

1. Read sections **1–3** to internalize the mission and the quality bar. If you only optimize for "make it run," you have failed.
2. Read sections **4–6** to understand what actually exists and what is broken. The findings in §6 are confirmed by reading the code; treat them as the starting backlog, not the full list.
3. Execute using the methodology in **§8**. Do the deep audit FIRST (§8 Phase 1) — do not trust this handover as a complete bug list; it is a primer. Verify everything yourself.
4. Hold every deliverable against the craft checklist in **§9** before calling anything "done."

---

## 1. The mission & the quality bar (non-negotiable)

**The product vision:** one platform that covers *every* software need a gym has, and every need the people in that gym have. It must work as:

- a **mobile app** (iOS + Android, React Native / Expo — already the codebase),
- a **web app** (same React Native codebase via `react-native-web`, already wired),
- a **web dashboard / portal** where gym owners, admins, trainers, and receptionists manage everything,
- a **public gym website** front-end where prospective members discover the gym, book, and pay for subscriptions,
- all on **one shared database** so mobile, web, dashboard, and website are always in sync.

**The dual north star — both must be true, neither compromises the other:**
1. **The best gym-management platform ever built.** Every software need a gym has — multi-branch ops, roles, attendance, memberships, payments, programming, retention — covered so completely and so elegantly that the most elite gyms in the world adopt it on sight.
2. **The best consumer fitness app ever built.** When the user-centric surface launches standalone, it must stand on its own against the best in the category (Whoop, Strava, Nike Training Club, Hevy, Fitbod) and win — not as a gym add-on, but as a destination product a person would choose with no gym attached.

These are two products served by **one evolvable codebase and one shared data backbone**. Architect every abstraction (domain models, API, design system, auth) so the consumer app is a *fork/new surface*, not a rewrite — and so the codebase can keep evolving toward both goals without painting itself into a corner.

There are two audiences, in two phases:
- **Phase A (now): gym-facing.** The customers are the *gyms*. Owners, branch admins, trainers, receptionists, and the gym's own members all use it under the gym's roof.
- **Phase B (later): a separate consumer/user-centric version.** Same data backbone, different surface, designed to be best-in-class on its own merits.

**The quality bar — read this twice:**

- **World-class, premium, human-crafted.** The output must look and feel like a team of senior product designers and engineers spent years on it. Not "clean." Not "fine." *Exceptional.* Custom assets, a real brand system, considered motion, pixel-honest spacing, states for everything (empty / loading / error / success), haptics where it matters.
- **No superficiality, anywhere.** No placeholder gradients passed off as design. No "TODO: handle error." No copy-pasted screens with the labels swapped. No dead buttons. If a thing is on screen, it works and it is beautiful.
- **Depth over breadth when they conflict.** A handful of screens that are genuinely flawless beats forty that are mediocre. But the *system* you build (design tokens, primitives, API layer, auth) must be complete enough that bringing the remaining screens to that bar is mechanical, not heroic.
- **Correctness is part of craft.** A gorgeous screen wired to an insecure, lying backend is not world-class. Security, data integrity, and honest states are design.

If you are ever about to ship something "good enough," stop. That is the exact failure mode this project is escaping from.

---

## 2. Working agreement (how the owner wants you to operate)

- **Autonomy is granted and expected.** The owner is asleep / away. Make the most qualified decision a principal engineer + design director would make, and proceed. Do not stall waiting for approval on things you can reason out. Document the decisions you made and *why* in `docs/DECISIONS.md`.
- **Do NOT push. Do NOT open PRs.** Work entirely locally on the working copy. The owner reviews before anything leaves the machine. Commits to a local branch are fine and encouraged (clean, atomic, well-messaged) — but `git push` is off-limits until the owner says so.
- **Refactor freely; regress nothing.** You may re-architect, restructure, rename, and rebuild any part of the codebase to hit the bar — that license is explicit. The one rule: **preserve (or improve) every feature/behavior that currently works.** Distinguish *structure* (yours to change at will) from *working functionality* (yours to protect). Before redesigning a screen, confirm what it currently does so you know what "no regression" means.
- **Verify, don't assume.** Run the app. Screenshot it. Read the actual response shapes. The previous team left confident-looking code that doesn't work; do not inherit their habit.
- **Leave a trail.** Every session: update the task list, append to `docs/DECISIONS.md`, and keep `docs/AUDIT.md` and `docs/ROADMAP.md` current. The owner must be able to wake up and understand exactly what changed and why.
- **Secrets discipline.** Live secrets are currently committed (see §6.1). Do not print them, do not copy them into new files, do not exfiltrate them. Your job is to get them *out* of the repo and flag them for rotation — not to spread them further.

---

## 3. What exists today (product surface)

This is **not** a toy. Reading the code, the app already attempts to cover a large surface across five roles:

| Role | Has dashboard | Notable surface |
|------|---------------|-----------------|
| **Owner** | `OwnerDashboard` + `OwnerTabs` | branches, trainers, receptionists, memberships, payments, broadcast email |
| **Admin** | `AdminDashboard` + `AdminTabs` | branch-level management |
| **Trainer** | `TrainerDashboard` + `TrainerTabs` | trainees, workout plans, diet plans, attendance, groups |
| **Receptionist** | `ReceptionistDashboard` + `ReceptionistTabs` | QR check-in, member registration, renewals, today's attendance |
| **Trainee/Member** | `TraineeHomeScreen` + `TraineeTabs` | workouts, diet, sleep, gamification, 3D anatomy, reminders |

**Feature areas already attempted (frontend + backend both exist):** profiles & auth, branches, trainers, trainees, memberships, payments, attendance (QR-based), trainer attendance, workout logs, workout reminders, workout schedules/plans, diet plans (create / template / weekly / monthly assignment), nutrition tracking + **camera food scanning (computer vision)**, sleep tracking + reminders, gamification (XP / levels / ranks / "trifecta" / consistency), groups, motivation, push + local notifications, broadcast email.

The ambition is real and most of the scaffolding is present. The execution quality is not. That gap is your job.

---

## 4. Architecture & tech stack (as-built)

**Frontend (mobile + web):**
- Expo SDK **54**, React **19.1**, React Native **0.81.5**, `react-native-web` 0.21 (web target works).
- Navigation: React Navigation v7 (native-stack + bottom-tabs).
- 3D: `three` + `@react-three/fiber` + `@react-three/drei` (anatomy viewer), `react-native-body-highlighter` (muscle map).
- Charts: `react-native-chart-kit`. QR: `react-native-qrcode-svg` + `expo-camera`. Video: `react-native-youtube-iframe`.
- Auth/session: `@supabase/supabase-js` directly from the client.
- Backend calls: a hand-rolled `fetch` wrapper (`config/apiClient.js`) → FastAPI.

**Backend (API):** Python **FastAPI** in `backend/`, SQLAlchemy models + **Alembic** migrations, `APScheduler` for reminder cron, a `vision_service` for food-image nutrition. Runs on **:8000**.

**Second backend (email):** a separate **Node/Express** service in `server/` (port **5000**) that sends mail via **Brevo**, plus a cron "absent reminder."

**Database:** **Supabase** Postgres. Accessed **two ways at once**: the frontend hits Supabase directly (auth, and likely some data), while FastAPI hits the *same* Postgres via SQLAlchemy/Alembic. (This dual data-plane is a real risk — see §6.2.)

**Infra:** `Dockerfile` + `docker-compose.yml`, `eas.json` (EAS build), native `android/` project (Kotlin), `supabase/functions` (an edge function).

```
Mobile/Web (Expo RN) ──auth & some data──► Supabase (Postgres + Auth)
        │                                         ▲
        └──REST (fetch)──► FastAPI :8000 ──SQLAlchemy──┘
                              │
                              └─ APScheduler (reminders, in-process, 1-min)
Node/Express :5000 ──Brevo──► email  (+ cron absent-reminder)
```

---

## 5. Repo map (annotated)

```
/                         Expo app root
  App.js, index.js        entry; App wires ErrorBoundary→SafeArea→ThemeProvider→AppNavigator
  app.config.js           Expo config; pulls secrets from env into expo.extra
  navigation/             AppNavigator (flat stack) + per-role *Tabs.js
  screens/                19 screens (dashboards, profiles, auth, attendance, payments)
  components/             48 components — ~30 are *Modal.js, plus 3D/anatomy/scanner/charts
  services/               17 client API service modules (mirror backend domains)
  config/                 api.js (BASE_URL), apiClient.js (fetch wrapper), supabase.js
  constants/              theme.js + colors.js (TWO competing palettes), api.js
  context/                ThemeContext.js (dark/light, AsyncStorage-persisted)
  utils/                  SecureStoreAdapter, rateLimiter
  assets/                 icons/splash (PNG) — generic, not a real brand system

  backend/                FastAPI service
    main.py               app bootstrap, CORS, routers, scheduler
    app/api/              18 routers (one per domain)
    app/services/         13 services incl. vision_service, schedulers
    app/db/models/        ~21 SQLAlchemy models
    app/schemas/          ~17 Pydantic schema modules
    app/core/             config.py (only DATABASE_URL), database.py
    alembic/              migrations

  server/                 Node/Express email service (Brevo) + cron  ⚠ commits .env
  supabase/functions/     edge function (rate-limit demo)

  >>> THE MESS (root + backend/) <<<
  check_*.js (20+), debug_*.js, probe_*.js, fix_*.py/.js, inspect_*.js,
  stash0_trainee.js / stash1_trainee.js / stash2_trainee.js  (~160 KB of dead WIP),
  TraineeHomeScreen_8f2bd0a.js (commit-hash dupe screen),
  *.log, *.txt dumps, *.json debug captures, TestScreen.js, app/test.js
```

---

## 6. Honest state of the codebase

The previous developers left working ambition wrapped around broken fundamentals. Below is what was **confirmed by reading the code**. The deep audit (§8 Phase 1) will extend this — treat it as the seed, not the harvest.

### 6.1 CRITICAL — Security (confirmed, fix before anything ships)

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| S1 | **Live secrets committed to git** | `server/.env` is tracked and contains a Supabase anon JWT, a **Brevo SMTP key**, and a **Brevo API key** | Anyone with repo (or history) access can send mail as the gym and read the project. **Must be rotated by the owner AND purged from history.** Do not reprint the values anywhere. |
| S2 | **Auth is opt-in and OFF by default** | `config/apiClient.js` only attaches the `Authorization: Bearer` header when `options.useAuth === true`; comment says it's omitted "to prevent CORS preflight" | The FastAPI API is effectively unauthenticated for most calls. The backend trusts client-supplied IDs. |
| S3 | **No server-side identity / ownership checks (IDOR)** | Follows from S2 + routers keyed on `trainee_id`/`branch_id` path params | Any caller can read or mutate any gym's members, payments, attendance by guessing IDs. Catastrophic for a multi-tenant gym product. |
| S4 | **CORS wildcard with credentials** | `backend/main.py`: `allow_origins=["*"]` **and** `allow_credentials=True` | Invalid per the CORS spec and signals zero origin policy. Lock to known origins. |
| S5 | **Full stack traces returned to clients** | `backend/main.py` global handler returns `{"detail": str(exc), "trace": traceback.format_exc()}` with 500 | Information disclosure: internal paths, code structure, possibly secret-bearing error text leak to any caller. |
| S6 | **Hardcoded ngrok tunnel as the production backend** | `config/api.js`: `NGROK_URL = "https://…ngrok-free.dev"` used for all mobile traffic | The whole mobile app depends on a free, ephemeral dev tunnel. It will break. Not production infra. |
| S7 | **Verbose logging of bodies/tokens** | `apiClient.js` `console.log`s full request bodies and responses | Leaks PII and tokens to logs; noisy; must be gated behind a dev flag. |

### 6.2 HIGH — Architecture & correctness risks

- **Dual data plane / schema drift.** Frontend talks to Supabase directly *and* FastAPI talks to the same Postgres via Alembic-managed models. Two sources of truth for schema and access rules. Decide the contract: either Supabase is the DB and FastAPI is the only writer (with RLS as defense-in-depth), or the frontend stops touching Supabase for data. This must be settled deliberately.
- **Config sprawl.** `config/api.js`, `config/apiClient.js`, `constants/api.js`, `config/supabase.js` overlap and re-export each other. Consolidate into one typed API layer.
- **Deprecated FastAPI lifecycle.** `@app.on_event("startup"/"shutdown")` is deprecated; move to lifespan handlers.
- **Fragile reminder scheduler.** `APScheduler` `BackgroundScheduler` runs in-process every 1 minute, no persistence, no leader election. Multiple workers → duplicate notifications; restart → missed reminders. Needs a durable job story.
- **No auth-gated navigation.** `navigation/AppNavigator.js` is a single flat stack with `initialRouteName="Welcome"`; every role's tabs are reachable screens. Routing by role is client-side only and trivially bypassable. Needs a session-driven auth split (unauthenticated stack vs. role-scoped stacks) sourced from the Supabase session.
- **No tests anywhere.** Zero automated coverage. At minimum, smoke tests for the API contract and auth.

### 6.3 Design / UI — the headline problem

The owner's words: *"the front-end UI is extremely bad."* Confirmed at the root:

- **Two competing color systems.** `constants/theme.js` (black + neon-red `#E50914`, glassmorphism, light+dark) vs. `constants/colors.js` (`colors2`, a different maroon set). Screens import inconsistently → incoherent surfaces.
- **Theme tokens are half-baked.** `typography` in `theme.js` hard-codes `color: colors.text` where `colors = darkColors`, so text color is *baked to dark mode* and light mode is broken. No font family (system default only). No radius scale, no elevation scale, no motion tokens, no z-index scale, no semantic color roles.
- **Context ships only `colors`.** `ThemeContext` exposes `{ colors, isDark, toggleTheme }`; spacing/typography are static imports baked dark. Theming is therefore inconsistent by construction.
- **No brand.** `assets/` holds generic Expo icons/splash and a maroon `#8B0000` splash background. There is no logo system, no iconography, no illustration language, no premium identity.
- **States are likely missing.** Expect missing empty/loading/error/skeleton states across screens (verify during the audit). World-class means every state is designed.

### 6.4 Repo hygiene — the swamp

~50+ junk files committed: `check_*.js`/`debug_*.js`/`probe_*.js`/`inspect_*.js`/`fix_*.{js,py}` one-off scripts, **`stash0/1/2_trainee.js` (~160 KB of dead WIP)**, `TraineeHomeScreen_8f2bd0a.js` (a duplicate screen named after a commit hash), `*.log`, `*.txt` dumps, `*.json` debug captures, `TestScreen.js`, `app/test.js`. None of it belongs in a shipped tree. **Quarantine (don't delete) into `/_archive/` with an index, so nothing is lost and history is reviewable.**

---

## 7. Design direction (the premium brand & system to build)

Build a single, cohesive design language — this is the #1 visible deliverable. Treat the following as the starting brief; refine it with taste, but do not regress below it.

- **Brand personality:** disciplined, elite, kinetic. "Weapon" = precision instrument, not gym-bro cliché. Think the restraint of Whoop / Oura crossed with the energy of Nike Training Club, executed at Linear/Vercel polish.
- **Color:** keep the black-and-energy-red DNA (`#E50914` family) but build *semantic* roles (surface, surface-raised, border, text, text-muted, accent, accent-pressed, success, warning, danger, info) for **both** dark (primary) and light. Add tonal ramps, not single values. Glass/elevation used with intent, not everywhere.
- **Type:** adopt a real typeface system (a strong geometric/grotesk display + a highly legible text face; e.g. a Satoshi/Clash/Inter-class pairing via `expo-font`). Define a true type scale (display, h1–h4, body, label, caption, mono-for-numbers) with line-height and tracking per step.
- **Tokens:** spacing scale, radius scale, elevation/shadow scale, motion (durations + easing curves), z-index scale, opacity steps. One source of truth, consumed through context for theme-awareness.
- **Primitives library:** Button (variants/sizes/loading/press states + haptics), Card/Surface, Input/Field (+ validation states), Select, Sheet/Modal shell, Badge, Chip, Avatar, Tag, ProgressRing, StatTile, Skeleton, EmptyState, Toast, ListItem, SegmentedControl, TabBar. Every screen is composed from these — no ad-hoc styling.
- **Custom assets:** a real logo/wordmark, an icon set (or a disciplined single icon family), illustration/empty-state art, achievement/rank badges for gamification, and considered use of the 3D anatomy as a hero moment.
- **Motion & feel:** purposeful transitions, list stagger, press feedback, skeleton→content fades, celebratory moments for streaks/level-ups. Subtle, fast, never gratuitous.
- **Accessibility:** AA contrast in both themes, hit targets ≥44pt, dynamic type tolerance, reduced-motion respect, screen-reader labels.

Deliver this as `theme/` (tokens) + `components/ui/` (primitives) + a **living component gallery screen** you can render on web and screenshot to prove the quality.

---

## 8. Execution methodology (the process — follow it in order)

> The owner asked for "line by line": audit deeply before you build, build the system before the screens, and verify by *running*, not by hoping. Use the **Workflow** tool (multi-agent) for the fan-out phases; do focused craft work solo.

**Phase 0 — Ground truth (verify before trusting anything).**
Confirm the app runs. `npm install` is already done. Bring up Expo web (`npx expo start --web`) and capture a baseline screenshot of the current UI so "before/after" is real. Locate the backend run path: check for `backend/requirements.txt` (or `pyproject`), the `DATABASE_URL` expectation in `app/core/config.py`, and whether `docker-compose.yml`/`run_project.py` is the intended boot. Note what you cannot run and why.

**Phase 1 — Deep audit (multi-agent, write to `docs/AUDIT.md`).**
Fan out specialist auditors, each reading EVERY line of its slice, returning structured findings (purpose / works? / bugs w/ file:line / security / quality / UI), then synthesize a severity-ranked master audit. Suggested slices: nav+auth+config · screens (auth/profile) · screens (dashboards) · components (modals A/B) · components (feature: 3D/scanner/charts) · client services · backend API routers · backend services+schedulers · backend models+schemas · backend core+migrations · node email + supabase fn + infra · **security & secrets sweep** · **UI/design quality sweep** · **repo hygiene inventory**. Adversarially verify every CRITICAL/HIGH finding before recording it (no false alarms). The findings in §6 are confirmed seeds — extend, don't repeat.

**Phase 2 — Design system (`theme/` + `components/ui/` + gallery).**
Build tokens + primitives per §7. Replace the two color files with one semantic token source consumed via an upgraded `ThemeContext`. Ship the component gallery and screenshot it on web. This is the foundation everything else stands on — make it genuinely beautiful.

**Phase 3 — Redesign the core screens.**
Rebuild the highest-traffic surfaces against the system: Welcome/auth, each role dashboard, Trainee home, profile. Real states for everything. Run on web, screenshot each, iterate until it clears the §9 bar. Keep behavior; replace only presentation + wiring quality.

**Phase 4 — Backend hardening (`docs/SECURITY.md` for the trail).**
Close S1–S7 and §6.2: real auth dependency on the API (verify Supabase JWT server-side), ownership/role checks, scoped CORS, no stack-trace leakage, env-based config (no hardcoded ngrok), durable scheduler story, lifespan handlers. Decide and document the single data-plane contract. Provide a migration to remove `server/.env` from tracking + a `.env.example`. Flag every secret for owner rotation.

**Phase 5 — Repo hygiene.**
Quarantine the swamp (§6.4) into `/_archive/` with `INDEX.md`. Fix `.gitignore` (env files, logs, build output, `.expo`). Remove duplicate/test screens from the live tree. Nothing deleted irreversibly; everything documented.

**Phase 6 — Roadmap & assets (`docs/ROADMAP.md`).**
The world-class plan: target architecture (mobile + web dashboard + gym public website + future member app on one DB), a feature-completeness matrix per persona, phased delivery, and the custom premium asset/brand direction. This is the morning-review centerpiece.

---

## 9. Definition of done — craft checklist (apply to every deliverable)

A screen/feature is **not done** until:

- [ ] It is composed entirely from design-system primitives + tokens (no orphan colors, no magic numbers).
- [ ] **Every state** is designed and wired: loading (skeleton), empty (with art + a clear next action), error (recoverable, human copy), success, and the populated happy path.
- [ ] It is correct in **both** dark and light themes, and respects safe areas + notches.
- [ ] It works on **web** (screenshotted) and is sound on mobile layout.
- [ ] Interactions have feedback (press/disabled/loading), motion is purposeful, transitions are smooth.
- [ ] Copy is real and human — no "Lorem", no leftover debug strings, no dead buttons.
- [ ] Data wiring is real: actual response shapes handled, errors surfaced honestly, no swallowed failures.
- [ ] Accessibility: contrast AA, ≥44pt targets, labels for assistive tech.
- [ ] No `console.log` of PII/tokens; no secrets; no commented-out graveyards.
- [ ] The decision log notes anything non-obvious you chose and why.

If you can't check all boxes, it stays in progress. "Looks done in a screenshot" is not done.

---

## 10. Guardrails & gotchas

- **Don't push. Don't open PRs.** Local only until the owner reviews.
- **Don't re-leak secrets.** Reference them by file + type; never reprint values. Get them out of tracking; let the owner rotate.
- **Don't nuke history or files.** Quarantine, don't `rm`. Use `git mv` into `/_archive/`.
- **Don't break working features for polish.** Characterize current behavior first.
- **Web target has native gaps.** `three`/`react-native-body-highlighter`/`expo-camera` have `.web.js` variants or may not render on web — that's why the food scanner/anatomy/avatar have `*.web.js` files. Don't assume every screen renders identically on web; screenshot to confirm and gracefully degrade.
- **The ngrok URL is dead weight.** Don't build new things on top of it; route through env config.
- **Supabase anon key vs. service role.** The committed key is the *anon* key (still must leave the repo). If you find a *service-role* key anywhere client-side, that's a sev-0 — flag loudly.
- **Windows dev host.** Paths are Windows; the owner runs Node 22 / npm 10.9 / Python 3.14. Python 3.14 may be ahead of some backend deps — verify before claiming the backend runs.

---

## 11. Environment & how to run

> Verify these in Phase 0 — some are inferred and must be confirmed before you rely on them.

**Frontend (Expo, mobile + web):**
```bash
npm install            # already done
npx expo start         # dev menu
npx expo start --web   # web target (use this to screenshot the UI)
```
Needs a **root `.env`** consumed by `app.config.js` (`dotenv/config`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SMTP_*`. (The repo currently leans on the committed `server/.env`; create a proper root `.env` from a new `.env.example` and keep it untracked.)

**Backend (FastAPI):** expected on **:8000** (the web client hardcodes `:8000`).
```bash
cd backend
# confirm requirements.txt / pyproject exists; create venv; install
uvicorn main:app --reload --port 8000
```
Needs `DATABASE_URL` (Postgres / Supabase connection string) per `app/core/config.py`. Alembic in `backend/alembic/`.

**Email service (Node):** `server/`, port **5000**, Brevo. `npm install && node index.js` (confirm).

**Docker:** `docker-compose.yml` + `Dockerfile` exist — verify what they actually orchestrate before relying on them.

---

## 12. Your first five moves

1. **Phase 0:** boot Expo web, screenshot the current state of 3–4 key screens, and save them to `docs/baseline/` so the transformation is measurable. Confirm what runs and what doesn't.
2. **Kick off the Phase 1 deep audit** (multi-agent) and let it write `docs/AUDIT.md`. Don't hand-wave — read every file.
3. **Stand up the design system** (`theme/` tokens + `components/ui/` primitives + gallery). Make the gallery genuinely beautiful and screenshot it.
4. **Redesign one hero screen end-to-end** (suggest the Trainee home or the Owner dashboard) to set the quality bar the rest will match. Get it to clear §9 fully.
5. **Open `docs/SECURITY.md`** and start closing S1–S7; at minimum get `server/.env` out of tracking with a `.env.example`, and flag every secret for rotation.

---

### Final word

This codebase is a diamond in the rough: the ambition and feature surface are genuinely impressive, but the fundamentals — security, design, hygiene — are broken in ways that would embarrass the team in front of a serious gym client. You are here to make it the thing the owner described: **something the most elite gyms in the world would go crazy over.** Hold the line on quality. When in doubt, go deeper, not faster.
