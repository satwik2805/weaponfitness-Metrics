# Decision Log

Append-only. Each entry: date, decision, why, and what it affects. The owner should be able
to reconstruct every non-obvious choice from this file alone.

---

## 2026-06-09 — Phase 0: Ground truth

### D-001: Created an untracked root `.env` from the values in the tracked `server/.env`
**Why:** `app.config.js` reads `SUPABASE_URL`/`SUPABASE_ANON_KEY` via `dotenv/config` from a root `.env` that did not exist — the app could not boot meaningfully without it. HANDOVER §11 prescribes exactly this. Verified `.env` is matched by `.gitignore` before writing. No secret values were printed or copied into any tracked file.
**Affects:** local dev only.

### D-002: Captured the no-session Trainee home by temporarily flipping `initialRouteName`
**Why:** Auth is impossible (Supabase dead — see D-003), but a baseline of the highest-traffic screen was needed for before/after honesty. Changed `navigation/AppNavigator.js` `initialRouteName` to `TraineeTabs`, screenshotted, **reverted immediately**. Working tree is back to original state.
**Affects:** nothing persistent; screenshot in `docs/baseline/04-*.png`.

### D-003 (FINDING, owner action required): Every backend dependency of this app is dead
- All three Supabase project hosts in the repo are **NXDOMAIN via public DNS** → projects paused or deleted. Login cannot work for any user on any platform. The frontend shows **no error** when this happens (silent failure — see baseline `03`).
- The hardcoded ngrok tunnel (`config/api.js`) is offline (404 at the edge) → all mobile API traffic dead.
- `backend/` has **no dependency manifest** (no `requirements.txt`/`pyproject.toml`) and its `database.py` falls back to a **hardcoded Postgres URL containing a password, committed to git** (logged as S8 in SECURITY.md; value not reprinted).
**Decision:** proceed with audit → design system → redesign → hardening using the web target and mock/disconnected states; treat "restore a Supabase project (or stand up a fresh one) + rotate every credential" as a top-line owner action in the morning review.

### D-004: Installed `playwright` with `--no-save` for headless screenshots
**Why:** No screenshot tooling existed; `chromium-cli` unavailable on this host. `--no-save` keeps `package.json`/lockfile untouched; uses system Edge (no browser download). Capture scripts live in `docs/baseline/` so the baseline is reproducible.
**Affects:** `node_modules` only (untracked).

---

## 2026-06-10 — Phases 2–6 (session resumed after overnight interruption)

### D-005: Continued the prior session's design system rather than restarting
**Why:** The interrupted session left `theme/` + 15 primitives + font wiring at 23:48 the night before — reviewed line-by-line and found at the bar. Completed the missing pieces (Toast — App.js imported it but it didn't exist, i.e. the app was broken mid-flight — plus Sheet, ListItem, SegmentedControl, TabBar, barrel exports) in the same idiom.
**Affects:** `components/ui/*`, App.js.

### D-006: Icon-font loading fixed at the root; Ionicons standardized for new UI
**Why:** Baseline 04 showed tofu glyphs on web — none of the 6 icon families' fonts were loaded. All are now loaded via `useFonts` so legacy screens render; the design system itself uses Ionicons only.
**Affects:** App.js, every screen with icons on web.

### D-007: Removed the fake Google login button and the "Test Backend Connection" link
**Why:** The Google handler was a stub showing a misleading alert ("already configured") — a lying dead button violates the craft bar. Google OAuth returns as real work when a live Supabase project exists (ROADMAP M1). The Welcome dev link shipped to production users.
**Affects:** LoginScreen, WelcomeScreen. Behavior preserved: email/password sign-in → `Loading` route untouched.

### D-008: Login errors are inline UI state, never `Alert.alert`
**Why:** `Alert.alert` is a no-op on react-native-web — the root cause of the baseline's silent login failure (and per the audit, 146 broken call sites app-wide; full sweep is ROADMAP M1). Mapped Supabase errors to human copy.
**Affects:** LoginScreen now; pattern for every screen later.

### D-009: Trainee mega-screen NOT rewritten this pass — custom TabBar shipped instead
**Why:** TraineeHomeScreen is 1,942 lines with its own data wiring against a dead backend; a blind rewrite couldn't be verified end-to-end and risks silent regressions ("refactor freely; regress nothing"). The shared TabBar transforms every role's chrome with bounded risk; the screen split is ROADMAP M2 with a live demo gym to verify against.
**Affects:** all 5 `navigation/*Tabs.js`, `components/ui/TabBar.js`.

### D-010: Backend boots only with env config; AUTH_DISABLED dev escape hatch added
**Why:** Removed the committed-password fallback (SECURITY S2). With every Supabase project dead, local dev needs a way to run the API before JWT secrets exist — `AUTH_DISABLED=true` (loud warning, default false) is the explicit, documented trade.
**Affects:** backend/app/core/{config,database,auth}.py, main.py.

### D-011: JWT verification supports both JWKS (RS256/ES256) and legacy HS256
**Why:** New Supabase projects issue asymmetric tokens; older ones HS256. The owner will create a fresh project (M0) — supporting both means the auth layer works regardless, keyed off the token's alg header (no silent fallthrough).
**Affects:** backend/app/core/auth.py.

### D-012: Broadcast email from the client is intentionally non-functional until M1
**Why:** The email service was an open relay; it now requires `x-api-key`, which a client bundle cannot hold safely. Correct path (ROADMAP M1): client → authenticated FastAPI → email service server-to-server. Closed beats open.
**Affects:** ReceptionistDashboard broadcast feature; server/.env (local) got a generated EMAIL_API_KEY so the service boots in dev.

## 2026-06-12 — Milestone 0: resurrection on the new Supabase project

### D-014: Database access goes through the Supavisor pooler (session mode, :5432)
**Why:** The direct host (`db.<ref>.supabase.co`) is IPv6-only and this network has no IPv6 route. The project lives in `ap-northeast-2`; the pooler hostname is IPv4. Session mode (not :6543 transaction mode) because Alembic and long-lived backend connections need session semantics.
**Affects:** backend/.env DATABASE_URL shape; deployment docs.

### D-015: Fresh squashed Alembic baseline; old contradicting migrations archived
**Why:** The audit showed the old two-migration chain was unbuildable and contradicted the models (no alembic.ini, payments table with only an id column). The models are canonical. Baseline autogenerated from them, with two hand-fixes: import of the custom GUID type, and the branches<->profiles circular FK broken by deferring branches.owner_id until after profiles exists. The ~12 ad-hoc script-created tables from the old DB are deliberately NOT recreated — features that relied on them get reconciled in M1.
**Affects:** backend/alembic.ini (new), alembic/env.py (URL from env), versions/20260612_*_baseline.py.

### D-016: RLS M0 stance — anon zero, profiles precise, rest authenticated-only
**Why:** With RLS off, the anon key exposed every table to the internet. M0 closes that: RLS enabled on all 28 tables; anon has no policies anywhere; profiles gets per-row rules (read own/staff, insert self, update own/admin, delete admin) plus a security-definer anti-escalation trigger so even direct PostgREST writes can't self-grant roles; remaining tables are authenticated-only with per-role tightening scheduled in M1 as each screen moves to the FastAPI path. Committed as supabase/policies.sql (re-runnable).
**Affects:** every PostgREST call; supabase/policies.sql is the source of truth.

### D-017: Owner bootstrap via signup API + direct DB confirm
**Why:** Email confirmation is ON in the new project and no SMTP is configured yet; the owner needed a working account immediately. Created via the public signup API (so the password is properly hashed by GoTrue), then `email_confirmed_at` set directly in the DB for this one bootstrap account. Owner advised to change the generated password. Seeded: Owner profile, "Weapon Fitness HQ" branch, 3 membership plans.
**Affects:** auth.users (1 row), profiles/branches/membership_plans seed. Verified end-to-end: API 401 without token, 200 with owner JWT; real login through the web UI lands on the Owner Dashboard with live data.

## 2026-06-12 — M1/M2/M3 execution wave

### D-018: The old dashboards were rebuilt, not restyled — their queries were unrunnable
**Why:** OwnerDashboard (and siblings) query `trainee_plan`, `payments.status/date/plan_id`, `attendance.branch_id` — artifacts of the script-mutated old DB that don't exist in the canonical schema. There was nothing to preserve at the data layer. Rebuilt on per-role services with schema-correct queries; management modal flows kept wired.
**Affects:** screens/OwnerDashboard.js (+ Trainer/Receptionist/Admin via the M2 wave), services/*DashboardService.js.

### D-019: trainee_plans, payments FK, and the classes domain are Alembic-canonical
**Why:** Membership assignment lived in a phantom table (WF-043); payments could be orphaned (WF-044); classes/booking is the new M3 domain. All three are now migrations with constraints that make bad states impossible (one-active-plan partial unique index, RESTRICT on payment-holder deletes, unique member-class-date booking).
**Affects:** backend/alembic/versions/20260612_*, supabase/policies.sql re-run for new tables.

### D-020: Demo staff/member auth users seeded directly in auth.users
**Why:** Supabase's built-in mailer rate-limits signups (free tier); demo accounts needed for live verification of every role surface. Inserted with bcrypt via pgcrypto + identities rows (+ the GoTrue NULL-token-columns quirk patched to empty strings). These are demo accounts in a demo gym — replace before production.
**Affects:** auth.users (3 rows: trainer/desk/member), demo data only.

### D-021: M3 scope shipped now = booking + retention radar + rotating QR; workout upgrades deferred
**Why:** Booking (full domain, 8-step E2E-tested), retention radar (owner dashboard), and the rotating-QR check-in loop are done and verified. Rest-timer/PR-detection belongs inside the workout logging flow, which is part of the trainee mega-screen split — doing it rushed inside the legacy screen would be churn. It's the first item of the next wave.
**Affects:** ROADMAP M4 ordering.

## 2026-06-12 — Cinematic UI + engineering hardening

### D-022: A cinematic motion/photography layer, not just clean cards
**Why:** The owner wanted Joby-Aviation / Mont-Fort immersion. Added four primitives — HeroBackdrop (full-bleed photography under layered scrims + Ken Burns + scroll-parallax), PhotoCard, CountUp (eased counting numerals), Reveal (staggered entrances) — plus hero type sizes, and licensed Unsplash photography. Applied to Welcome, Login, all 5 dashboards, Classes, Profile, member home. Over-photo text is pinned to literal whites (correct in both themes); this is the only sanctioned hardcoded-hex exception.
**Affects:** components/ui/{Cinematic,CountUp,Reveal}.js, assets/photos/, every hero surface.

### D-023: Member home extracted from the 1,942-line mega-screen (separation of concerns)
**Why:** The home tab's presentation was rebuilt as screens/trainee/TraineeHomeView.js — a pure presentational component (props in, no data/business logic). TraineeHomeScreen stays the data container and renders the view for the home tab; other tabs (workout/anatomy/reminders) get a clean minimal header. Net: the file dropped 1,529 → ~735 lines, ~700 lines of dead createStyles and 10 unused imports removed.
**Affects:** screens/TraineeHomeScreen.js, screens/trainee/TraineeHomeView.js.

### D-024: Five role profile screens unified into one
**Why:** Owner/Trainer/Receptionist/Admin/Trainee profile screens were near-identical (DRY violation) and all on the dead constants/theme + imgur hotlink. Replaced with one role-aware ProfileScreen (role read from the DB row); all tab navigators repoint to it; the four duplicates archived. Fixed a real bug (a Promise passed as a Text value).
**Affects:** screens/ProfileScreen.js, all *Tabs.js, _archive/screens/.

### D-025: "No vibe code" enforced to zero, adversarially verified
**Why:** Swept the whole codebase to zero on: Alert.alert/alert() (57→0, all via design-system toast/confirm), i.imgur hotlinks (13→0, via Avatar), backend print() (55→0, via module loggers with PII stripped and logger.exception in handlers), legacy constants/theme imports (12→0), plus frontend debug-console noise. Seven legacy-styled secondary screens migrated onto the design system. Orphaned legacy files (constants/theme.js, constants/colors.js, ThemeToggle, old ListItem, SectionHeader) archived. Three adversarial review agents confirmed each track with zero defects.
**Affects:** ~30 components/screens, backend/app/**, _archive/legacy-ui/.

### D-013: Hygiene = quarantine, never delete; history scrub left to the owner
**Why:** ~100 junk files moved to `_archive/` with `git mv` (reviewable, reversible); `server/.env`/`.expo`/CLI temp untracked but kept on disk. History rewriting (filter-repo) changes hashes for all collaborators — owner's call, documented in SECURITY.md.
**Affects:** repo root, backend/, .gitignore, _archive/README.md.

## 2026-06-14 — Anatomy explorer rebuild

### D-026: Body-anatomy rebuilt on the design system; broken 3D path retired
**Why:** Reported "body anatomy aint working." Root cause was a real integration bug: `react-native-body-highlighter@3` exposes `onBodyPartPress`, but the code passed `onMusclePress` — so every tap on the figure was dead — and the muscle slugs were wrong (`front-deltoids`/`latissimus_dorsi` don't exist; the valid slug is `deltoids`, back is `trapezius`/`upper-back`/`lower-back`), so shoulders and back never highlighted. This was also the app's last vibe-coded surface: a duplicated `AnatomyView.js`/`AnatomyView.web.js`, a "LIVE KINETIC FEED" 3D "glass-box mannequin" (`@react-three/fiber` web entry that crashes on native, behind an error boundary), legacy `colors.*` aliases, and raw RN primitives. Replaced with a single design-system surface: a one-source-of-truth muscle taxonomy (`components/anatomy/muscles.js`), a `MuscleFigure` (front+back, correct API, theme-driven highlight, charcoal resting figure that reads as a calm "scanner" in both themes), and an `AnatomyView` built from Surface/Chip/Text/Reveal with an inline form-video player (Platform-gated so the web bundle never pulls `react-native-webview`, which ships no web build). The 3D scene + web duplicate + `DetailedMuscleMap` were archived, not deleted. Verified on web at 1440px: rest, chip-select, and direct figure-tap all highlight the muscle, sync the chip, and load the targeted exercises.
**Affects:** components/AnatomyView.js, components/MuscleFigure.js, components/anatomy/muscles.js, screens/TraineeHomeScreen.js, _archive/legacy-ui/anatomy/.
**Note:** Kept the `three`/`@react-three/*`/`expo-gl` deps — `components/WorkoutAvatar.js` (FormLibraryModal) still uses them, and it has the same native-crash shape (`@react-three/fiber` web entry); flagged as separate follow-up, out of scope here. **Closed by D-027.**

## 2026-06-14 — WorkoutAvatar native-crash fix (the D-026 follow-up)

### D-027: WorkoutAvatar rebuilt as a 2D muscle map; the last three.js path retired
**Why:** `components/WorkoutAvatar.js` — the avatar in `FormLibraryModal` — imported `Canvas` from `@react-three/fiber` and helpers from `@react-three/drei`, i.e. their **web** entry points. On web Metro served the `WorkoutAvatar.web.js` stub ("3D Avatar Disabled for Checking"), so the breakage was invisible there; on a real device/Expo Go Metro resolves `WorkoutAvatar.js`, where `@react-three/fiber`'s web `Canvas` throws because native rendering needs `@react-three/fiber/native` + expo-gl's `GLView`. Exactly the bug class retired for the anatomy scene in D-026, and `WorkoutAvatar` was the app's **last** live `@react-three/*`/`three`/`expo-gl` consumer.
Took the preferred option (a 3D mannequin isn't essential — `FormLibraryModal` already shows a real form video below it): replaced both files with a **single** cross-platform `components/WorkoutAvatar.js`, a 2D "muscle map" on the design system. It maps a movement → the muscle groups it trains (keyword-matched, keyed to the one-source-of-truth `anatomy/muscles.js` taxonomy) and renders them on the shared `MuscleFigure` (front+back, react-native-svg) inside the same dark "scanner" panel the anatomy explorer uses; primary movers glow accent, a legend names primary/secondary groups. `MuscleFigure` gained an optional `highlightSlugs` prop (explicit multi-muscle highlight) — `AnatomyView`'s `selectedGroup` path is untouched. No `.web`/`.native` split, no error boundary, no GLView: the render path is identical to the already-shipped `AnatomyView`, so native safety is by construction. Tidied the now-inaccurate "3D" copy in `FormLibraryModal` (title, the "PRO 3D GUIDE" badge + `video-3d` icon) so the surface doesn't overpromise; removed the fixed-height wrapper since the avatar is self-paneled.
**Affects:** `components/WorkoutAvatar.js` (rewritten), `components/WorkoutAvatar.web.js` (removed), `components/MuscleFigure.js` (+`highlightSlugs`), `components/FormLibraryModal.js`, `_archive/legacy-ui/WorkoutAvatar*.js`.
**Verified:** all three changed files transform cleanly under `babel-preset-expo` (Metro's preset); the live source tree no longer imports `@react-three/*`/`three`/`expo-gl` anywhere; every slug the workout→muscle map emits is a valid `react-native-body-highlighter@3` slug. Could **not** click through in a running app: `FormLibraryModal` is currently orphaned — it is not imported or rendered by any screen/navigator (added in `730703c cv_3d`, migrated onto the design system in the review batch, never wired in). So the crash was not user-reachable today; this fixes the latent bug so the feature is safe to wire, and overlaps in purpose with the live `AnatomyView` — owner to decide whether to wire `FormLibraryModal` or fold it into the anatomy surface.
**Follow-up:** with the last consumer gone, `three`, `@react-three/fiber`, `@react-three/drei` and `expo-gl` are now unused and can be dropped from `package.json` (separate change — needs reinstall + a web/native bundle check).
