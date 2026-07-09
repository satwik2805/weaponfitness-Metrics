# Audit slice: backend-api-1

Files: `backend/main.py` + `backend/app/api/{attendance,branch,consistency,gamification,group,membership,motivation,nutrition,payment}.py`

## Purpose
FastAPI application entrypoint (`main.py`) wires CORS, a global exception handler, an APScheduler background scheduler (sleep + workout reminders run every minute), and mounts ~18 routers. The audited routers expose CRUD/business endpoints over Supabase Postgres via SQLAlchemy: gym attendance (with auto workout-log + consistency side effects), branches, membership plans, payments, trainee groups, nutrition logging/goals/summary/text-parsing, gamification XP/level stats, and the trifecta consistency stats. `motivation.py` is a static quote/greeting endpoint.

## What actually works
- Router wiring, prefixes, and tags are consistent and correct; health endpoints (`/`, `/ping`) are trivial and fine.
- CRUD scaffolding is structurally sound: 404s raised on missing rows, `model_dump(exclude_unset=True)` used for partial updates (branch, membership), `from_attributes` response models.
- DB delete cascades are defined at the model level (`ondelete="CASCADE"` on group member/workout join tables), so deleting a group cleans children.
- Attendance create is idempotent per (trainee, date) and wraps the two side-effect calls (auto workout log, consistency) in try/except so a side-effect failure does not abort the attendance write.
- Nutrition daily summary defensively handles NULL goals and missing goal rows with sane defaults.

## Findings

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| CRITICAL | all routers (e.g. attendance.py:16-105, branch.py:14-105, payment.py:12-45, membership.py:15-92, nutrition.py:25-281, group.py:18-56, consistency.py:11, gamification.py:13) | ZERO authentication/authorization on every route. No `Depends` security, no auth dependency exists in the backend at all (grep for Security/Header/jwt/Bearer in app code returns nothing). | Anyone who can reach the API can read/write/delete all gym data. Confirms S2 from a different angle: backend never checks identity, so the frontend's `useAuth` flag is the only gate and it is client-side only. | Add a FastAPI auth dependency (verify Supabase JWT) and apply via `dependencies=[Depends(...)]` on routers; derive the acting user server-side. |
| CRITICAL | attendance.py:21 / nutrition.py:29,58,86 / payment.py:16 / membership.py:20 / branch.py:22 / consistency.py:11 / gamification.py:13 | IDOR: every endpoint trusts client-supplied `trainee_id` / `profile_id` / `branch_id` / `trainee_id` query params with no ownership check. | Any caller can create attendance/nutrition/payments for, or read consistency/gamification/nutrition of, ANY trainee by guessing/enumerating UUIDs. Mass data exposure and forgery. Extends S3. | Resolve the subject from the authenticated principal; for trainer-scoped reads, verify the trainee belongs to the trainer's branch. |
| CRITICAL | main.py:31-39 | CORS `allow_origins=["*"]` combined with `allow_credentials=True`. | Browsers technically reject wildcard+credentials, but Starlette echoes credentials handling loosely; combined with no auth it signals intent to accept any origin. Confirms S4. | Set an explicit origin allowlist; only enable credentials for those origins. |
| CRITICAL | main.py:41-47 | Global exception handler returns `str(exc)` plus full `traceback.format_exc()` in the JSON body with status 500. | Leaks file paths, SQL, library internals, and code structure to any client on any unhandled error. Confirms S5. | Log the trace server-side; return a generic message + correlation id. Gate any detail behind a debug env flag. |
| HIGH | payment.py:16-21 + schemas/payment.py:17-18 | `PaymentCreate` requires a client-supplied `id: UUID` (primary key) and `payment_status`. Client sets the PK and can set status to `Completed` directly. | A caller can forge a completed payment record, choose its primary key (collision/overwrite attempts), and mark arbitrary amounts as paid. No server-side validation of who/what is paying. | Generate `id` server-side (default uuid), do not accept `payment_status` from client for create; set it via verified gateway callback. |
| HIGH | nutrition.py:250-251 | Grams detection `is_grams = 'g' in food or 'gram' in food` does substring match on the whole food name. Words like "egg", "banana"(no), "yogurt", "mango" contain "g". e.g. "3 eggs" -> `'g' in 'eggs'` is True -> `scale = 3/100 = 0.03`. | Smart-parse macros are silently wrong (off by ~100x) for any food name containing the letter g. Core nutrition feature produces garbage numbers. | Detect grams from a trailing unit token (`re` match on `\d+\s*g\b`), not substring membership. |
| HIGH | group.py:21-27 | If `trainerId` is unknown, the route auto-creates a `Trainer` row with the client-supplied UUID ("authority fix"). | Privilege/data-integrity hole: any client invents a trainer identity and becomes a group owner; pollutes the trainers table with fake records. | Reject unknown trainer ids (404); never fabricate authority records from request input. |
| HIGH | group.py:18-41 | Non-atomic multi-step create across 3+ separate `db.commit()` calls (trainer create, group create, each member loop then commit) with no try/except/rollback. `memberIds` are inserted without verifying the trainees exist. | A failure midway (e.g. invalid member FK) leaves an orphan group and partial members committed; FK violation on a bad member id throws and bubbles to the traceback handler. | Wrap in a single transaction; validate member ids exist; commit once. |
| MEDIUM | attendance.py:16-18 / branch.py:52-59 / membership.py:48-50 / payment.py:31-34 | "List all" endpoints return the entire table unfiltered (no pagination, no scoping). | Unbounded result sets (perf/memory) and, combined with no auth, full-table data dumps of attendance/branches/plans/payments. | Add pagination + mandatory scoping (branch/trainer) and auth. |
| MEDIUM | attendance.py:96-104 | `mark_absent` only catches `ValueError`; any other service exception propagates to the traceback-leaking global handler. | Inconsistent error handling; internal errors leak traces. | Catch and map service errors explicitly; avoid relying on global handler. |
| MEDIUM | gamification.py:47-54 / consistency_service usage | Broad `except Exception as e: print(...)` swallows consistency errors and sets `consistency=None`; `print` is the only telemetry. | Silent partial failures; no structured logging/alerting; hard to diagnose in prod. | Use logging with levels; surface a degraded flag rather than silently nulling. |
| MEDIUM | nutrition.py:59,86,29 / attendance.py:21 | No validation of numeric ranges: calories/protein/etc default to 0.0 but negatives, NaN, or absurd values are accepted (schema only enforces type). `quality_rating` (nutrition daily log) unbounded int. | Garbage/negative macros and ratings corrupt summaries and consistency logic. | Add Pydantic `Field(ge=0)` constraints and bounds. |
| MEDIUM | nutrition.py:100-114 | `get_nutrient_goal` constructs and returns an un-persisted `NutrientGoal` ORM object (with a fresh random `id`) when none exists. | Each call returns a different random `id` for the same trainee's "default" goal; client may treat it as a real persisted row. | Return a plain response model marked as default, or upsert a real row. |
| LOW | main.py:72-97 | `@app.on_event("startup")/("shutdown")` are deprecated in current FastAPI in favor of lifespan handlers; scheduler runs in-process (won't scale to multiple workers, jobs duplicate per worker). | Reminder jobs fire N times with N uvicorn workers; deprecated API. | Migrate to lifespan; move scheduling to a single dedicated worker/external scheduler. |
| LOW | attendance.py:48,59 / nutrition.py:52,68,175 | `print()` + `traceback.print_exc()` used as logging throughout. | Noisy stdout, no log levels; consistent with S7 verbose logging. | Replace with `logging`. |
| LOW | motivation.py:1-12 | Static endpoint fine, but no caching headers; trivial. | Negligible. | Optional cache. |

## UI & design notes
Not applicable (backend slice). One UX-relevant correctness item: the nutrition smart-parse macro bug (nutrition.py:250) will surface to users as wrong calorie/macro totals.

## Dead code & hygiene
- `consistency.py:1`, `gamification.py:1-5` import `HTTPException`/`Optional`/`date` partially unused depending on path; minor.
- Comments like "authority fix" (group.py:23) document an intentional security shortcut — flag for removal.
- `backend/files.txt` is a committed absolute-path file listing from another machine (`C:\Users\CHAYA\...`) — repo hygiene noise.
- Backend still has no `requirements.txt`/`pyproject.toml` (ground truth) — these routers import apscheduler, sqlalchemy, fastapi, pydantic with no pinned manifest.

## Cross-slice questions
- Services slice: confirm `update_daily_consistency` (consistency_service.py:18) and `auto_create_workout_log_from_attendance` manage their own commits/rollbacks — attendance.py relies on them not corrupting the session after its own commit.
- Schemas/DB slice: confirm whether `payments.id` is truly client-settable at the DB layer (PaymentCreate.id) and whether `payment_status` should be a server-only field.
- Frontend slice: confirm `apiClient.js` is the only place auth is enforced (client-side), making the backend's total lack of auth the real exposure.
- DB slice: confirm FK `ondelete` behavior for `trainee_group_members` matches expectation when a trainee is deleted (CASCADE present in workout.py model).
