# WEAPON FITNESS — Master Transformation Roadmap

_2026-06-10. Companion docs: `AUDIT.md` (ground truth), `SECURITY.md` (hardening + owner actions), `DECISIONS.md` (why things were done), `docs/design/` (the new design system, screenshotted)._

---

## 1. The dual north star

Two products, one evolvable codebase, one shared database:

1. **The best gym-management platform ever built** — every software need of a gym (multi-branch ops, five staff/member roles, attendance, memberships, payments, programming, nutrition, retention, comms) covered so completely and elegantly that elite gyms adopt it on sight.
2. **The best consumer fitness app ever built** — when the member surface launches standalone (Phase C), it must beat Whoop/Strava/NTC/Hevy on their own turf with no gym attached.

Every architectural choice below is tested against both.

## 2. Where we actually are (post-audit, post-overnight work)

**Done in this pass (verified by running):**
- **Design system** — semantic tokens (`theme/`), 20 crafted primitives (`components/ui/`), Space Grotesk + Inter type system, light + dark first-class, living gallery at `/gallery` (screenshots in `docs/design/`).
- **Brand** — custom blade-W logo system (`components/brand/Logo.js`), wordmark, hero treatment.
- **Front door redesigned** — Welcome + Login rebuilt on the system: real validation, honest inline error states (the silent-login-failure bug is dead), forgot-password flow, no dev links, no fake buttons.
- **Navigation chrome** — one premium TabBar across all five role navigators (replaced the broken-glyph glass bar); web URLs for every stack (`/login`, `/trainee`, `/owner`, …); icon fonts fixed on web.
- **Security hardening** — see `SECURITY.md`: secrets untracked, FastAPI fully authenticated + role/ownership exemplar, edge function role-gated (adversarially reviewed), email relay closed, CSPRNG staff passwords, CORS pinned, stack traces contained.
- **Hygiene** — ~100 junk files quarantined to `_archive/`, `.expo`/temp untracked, `.env.example` contracts at all three levels.

**The hard truth (from `AUDIT.md`):** there is no live backend anywhere — all Supabase hosts NXDOMAIN, ngrok dead. Beyond that, the audit's register documents fake-success paths (offline attendance, hardcoded nutrition numbers, fabricated food-scanner results), farmable XP, a spoofable static QR, a no-op `Alert.alert` on web killing 146 confirm/feedback call sites, an unbuildable Alembic chain, and a 1,942-line trainee mega-screen with 117 hardcoded colors. The product is a feature-rich prototype, not yet a platform.

## 3. Target architecture (the platform picture)

```
                    ┌────────────────────────────────────────────┐
                    │              Supabase (one project)         │
                    │  Postgres + RLS on EVERY table · Auth · 	   │
                    │  Storage (avatars, exercise media) · Edge   │
                    └──────┬───────────────────┬─────────────────┘
                           │                   │
            direct (RLS-guarded reads)   FastAPI core API (auth'd writes,
                           │             business rules, schedulers, vision)
   ┌───────────────────────┼───────────────────┼──────────────────────────┐
   │                       │                   │                          │
 Mobile app (Expo RN)   Web app (same code,  Management dashboard       Gym public website
 iOS + Android          react-native-web)    (owner/admin/staff —       (marketing, class
 members + staff        URL-routed           start as the web app's     booking, join/pay
                                             staff surface; later a     funnels) → Phase B
                                             dedicated Next.js portal)
```

**Data-plane contract (decided):** Supabase is the single database. The client may *read* through PostgREST under strict RLS; every *write* that carries business rules (attendance, payments, XP, plan assignment) goes through the FastAPI core API or the role-gated edge function. RLS is the floor, the API is the brain. One schema, owned by Alembic, applied to Supabase — no more script-mutated tables.

**Phases:**
- **Phase A (now → first paying gym):** restore infrastructure, finish role surfaces on the design system, real payments, bulletproof attendance, trainer programming loop.
- **Phase B (gym growth):** public website + booking/checkout, dashboard analytics & retention engine, class scheduling, comms center.
- **Phase C (consumer launch):** member app forked as standalone — training AI, social/competitive layer, wearables. The domain model (workouts/nutrition/sleep/gamification are already member-centric) makes this a surface fork, not a rewrite.

## 4. Execution plan

### Milestone 0 — Resurrection (blocking everything; owner + 1 dev, ~1 week)
1. Owner: new Supabase project; rotate ALL credentials (`SECURITY.md` checklist); scrub git history.
2. Rebuild schema as **one squashed Alembic baseline** from the SQLAlchemy models (the existing migration chain is unbuildable — audit WF-data findings); apply to the new project; write RLS policies for all ~24 client-read tables; turn `verify_jwt` ON for the edge function.
3. Stand up FastAPI (now has `requirements.txt`) + email service behind real env config; deploy edge function.
4. Seed a demo gym (1 branch, 5 roles, 20 members, plans/diets) — from now on every feature is verified against live data, never fiction.

### Milestone 1 — Trustworthy core loops (the "no lies" release)
- **Kill every fake-success path** found by the audit: offline-attendance fake success, hardcoded nutrition totals, fabricated scanner results, farmable XP writes, the prod "Simulate Check-in" button.
- **Replace `Alert.alert` everywhere** (146 call sites) with the design-system `Sheet`/`Toast`/confirm primitives — this single sweep fixes every silent confirm/delete/error on web.
- **Attendance done right:** rotating signed QR (per-gym key, 30s TTL), geofence assist, member self-scan + front-desk scan, offline queue with honest "pending sync" states.
- **Auth/session routing:** session-driven navigator (no reachable role stacks without a session), role from the profile row, deep-link safe.
- Per-resource ownership checks across the remaining 17 FastAPI routers (profile.py is the pattern).

### Milestone 2 — The five surfaces, screen by screen (design-system migration)
Order: **Trainee home split** (1,942-line mega-screen → per-tab screens: Home/Workout/Alerts/Anatomy — the navigator is already shaped for it) → **Owner dashboard** → **Trainer programming flow** (plans, assignment, group management) → **Receptionist desk** (register/renew/scan in ≤3 taps) → **Admin**. Every screen ships against the §9 craft checklist from `HANDOVER.md` (states, themes, a11y, screenshots).
The ~30 `*Modal.js` components collapse into `Sheet`-based flows (audit shows they share ~70% structure).

### Milestone 3 — Money & growth (gym-side completeness)
- Payments: real gateway (Razorpay first — Indian gyms — then Stripe), invoices, dunning, plan proration, front-desk POS flow.
- Memberships: freeze/transfer/trial/guest passes, expiry automations (the email cron, now authenticated, becomes the comms engine).
- Retention: at-risk scoring from attendance/consistency data (the gamification tables already capture the signal), owner weekly digest.
- Class/slot booking (the missing table stake): schedules, capacity, waitlists — shared by dashboard and (Phase B) public site.

### Milestone 4 — The member experience that wins (consumer-grade)
- Workout logging that beats Hevy: rest timers, supersets, PR detection, plate math, exercise demo videos (assets below).
- Nutrition that's honest: real vision service or transparent manual logging — no fabricated meals, ever.
- Recovery: sleep + consistency fused into a daily readiness view (Whoop-style ring trio — the trifecta UI already exists).
- Gamification with integrity: server-authoritative XP, seasons, gym leaderboards, rank badges (asset program below).
- 3D anatomy as the hero moment: self-hosted models (the current GLTF hotlinks a dead third-party demo bucket), muscle-load heatmap from logged volume.

## 5. Custom asset & brand program (premium = drawn, not stocked)

| Asset family | Direction | Status |
|---|---|---|
| Logo system | Blade-W mark + Space Grotesk wordmark (built: `components/brand/Logo.js`) — extend to app icon, splash, favicon, watermark | mark ✅ · exports pending |
| Iconography | Ionicons as the single family (enforced by primitives); custom glyphs only where the domain demands (plate math, PR, rank) | standard ✅ |
| Rank/achievement badges | Forged-metal medallion set (Iron → Bronze → Steel → Damascus → Weapon), SVG, used by gamification + seasons | to design (M4) |
| Empty-state illustration | Geometric line-art in brand red/steel — one per domain (workouts, diet, sleep, attendance, payments) | to design (M2) |
| Exercise media | Licensed or in-house demo video/lottie set, self-hosted in Supabase Storage | to source (M4) |
| 3D anatomy | Self-hosted GLTF, brand-graded materials, heatmap shader | to build (M4) |
| App icon/splash | From the new mark, replacing the maroon `#8B0000` placeholders | quick win (M2) |

## 6. Quality gates (how we keep the bar)

- Every screen: the `HANDOVER.md` §9 checklist (all states, both themes, web + mobile, a11y, no orphan styles).
- Every API route: auth + ownership test before merge; the audit's findings register is the regression checklist.
- Screenshot-verified UI: the `docs/design/capture-*.mjs` harness runs per change; before/after pairs land in `docs/design/`.
- No feature ships "visually done" against fake data — live demo-gym round trip or it isn't done.

## 7. Sequencing summary

```
M0 Resurrection ──► M1 No-lies core ──► M2 Five surfaces ──► M3 Money & growth ──► M4 Member wow ──► Phase B website/portal ──► Phase C consumer launch
      1 wk              2-3 wk             4-6 wk                3-4 wk                4-6 wk
```

The overnight work means M2 starts from a finished design system with two screens already at the bar — the remaining migration is mechanical application of an established pattern, which is exactly how it was designed.
