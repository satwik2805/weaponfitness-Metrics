# Security Sweep (cross-cutting, whole repo)

## Purpose
Repo-wide hunt for hardcoded secrets, committed `.env` files, service-role keys in
client-reachable code, missing auth on backend routes / email server / edge function,
RLS assumptions in frontend, and PII logging. Secrets are referenced as `file:line` +
type only; matched values are NOT reproduced here.

## What actually works
- Brevo email client and FastAPI server read most secrets from `process.env` / `os.getenv`
  (the right pattern) rather than inline literals (server/utils/brevoClient.js, server/controller/emailController.js).
- Root `.env` IS gitignored (`.gitignore:48` matches `.env`) so it is NOT committed.
- The edge function correctly creates the privileged Supabase client with the service-role
  key on the server side only (Deno env), not shipped to the client.
- The email controller has basic input validation (recipients/subject/message) before sending.
- Frontend SecureStore adapter is used for Supabase session storage (utils/SecureStoreAdapter.js).

## Findings

| Severity | file:line | Issue | Impact | Suggested fix |
|---|---|---|---|---|
| CRITICAL | server/.env (tracked) | `server/.env` is git-tracked and committed (confirmed via `git ls-files`). Contains 9 secret assignments: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (JWT), `SMTP_HOST`, `SMTP_PORT`, `SMTP_LOGIN`, `SMTP_KEY`, `PORT`, `SENDER_EMAIL`, `BREVO_API_KEY` (`xkeysib-…`). | Live SMTP + Brevo transactional-email credentials and Supabase anon JWT are in git history; anyone with repo access can send mail as the gym and hit Supabase. | Remove from git (`git rm --cached server/.env`), rotate ALL of these keys, add `server/.env` to `.gitignore`, scrub history (filter-repo/BFG). |
| CRITICAL | supabase/functions/rate-limit-demo/index.ts:17-20, 145-1041 | Edge function runs **15 privileged admin actions** (`create_trainee`, `add_trainer`, `add_branch`, `add_receptionist`, `manage_plans`, `assign_diet`, `assign_workout`, `renew_subscription`, `admin_attendance`, `submit_feedback`, `delete_group`, etc.) using the **service-role client** with **no role/authorization check**. The only `auth.getUser(token)` call (line 118) is used solely to derive a rate-limit identity, not to authorize. | Broken access control / privilege escalation: any caller who can reach the function (anon key holder, or any logged-in trainee if verify_jwt) can create/upgrade trainers, delete groups, mutate plans & payments as anyone. | Add explicit authz: resolve caller from JWT, fetch their role, and gate each action by role (Owner/Trainer). Never trust IDs from payload. |
| CRITICAL | supabase/functions/rate-limit-demo/index.ts:944-954 | Developer comment admits the design: *"for this refactor I will trust the payload"* — caller-supplied `traineeId`/`creator_id` are trusted with no token match. | IDOR: a user can submit feedback / perform actions impersonating any `trainee_id`. | Derive the acting user id from the verified JWT, never from `payload`. |
| CRITICAL | backend/main.py (whole app), all of backend/app/api/*.py | **Zero authentication anywhere in the FastAPI backend.** All 80 `Depends(...)` are `Depends(get_db)` (0 auth deps). 82 routes total, **46 are mutations** (POST/PUT/DELETE/PATCH). | Every endpoint is fully unauthenticated and trusts client-supplied IDs (IDOR). | Add an auth dependency (verify Supabase JWT) + per-resource ownership checks on every router. |
| CRITICAL | backend/app/api/profile.py:40,57,67,91 | `GET /profiles/{id}`, `GET /profiles/` (lists ALL), `PUT /profiles/{id}`, `DELETE /profiles/{id}` — no auth, ID taken straight from path. | Anyone can enumerate, read, modify, or delete any user profile (mass PII exposure + account takeover/destruction). | Require auth; restrict list to caller's branch/role; verify ownership on get/update/delete. |
| CRITICAL | backend/app/api/payment.py:15,24,32,37 | `POST /payments/`, `GET /payments/{id}`, `GET /payments/` (lists ALL), `DELETE /payments/{id}` — no auth. | Financial records readable/forgeable/deletable by anyone. | Auth + role gate (Owner/Receptionist) and ownership scoping. |
| CRITICAL | backend/app/core/database.py:12 | Hardcoded Postgres connection string fallback with **inline DB password** (`postgresql://postgres:<pw>@db.sdgrkwbofvxloglbumzy.supabase.co:5432/postgres`). | Production DB superuser credential committed in source. | Remove the literal default; require `DATABASE_URL` env; rotate the DB password. |
| HIGH | server/index.js:47, server/routes/emailRoutes.js:13,16 | Email server mounts `/api/email/send` and `/api/email/test-absent-reminder` with **no authentication** and `cors()` wide open (index.js:10). | Open mail relay: anyone can POST arbitrary `recipients/subject/message` and send mail as "Weapon Fitness" (spam/phishing) and trigger bulk reminders. | Add an API key / shared-secret middleware on `/api/email/*`; restrict CORS to known origins. |
| HIGH | components/AddTrainerModal.js:42 | Hardcoded default password `"trainer123"` for every trainer auth account created via the edge function. | All trainer logins share a guessable static password → trivial account takeover of any trainer. | Generate a random password / force first-login reset; never hardcode. |
| HIGH | app.config.js:59-62 | `SMTP_LOGIN`, `SMTP_KEY`, `SMTP_PORT`, `SMTP_HOST` are injected into `expo.extra`, which is **bundled into the client app** and readable by any user. | SMTP credentials shipped to every device/web client → mail account compromise. | Remove SMTP secrets from client config; only `SUPABASE_URL`/`ANON_KEY` belong client-side. Keep SMTP server-side. |
| HIGH | (frontend, 152 call sites) services/*.js, screens/*.js, components/*.js | Frontend performs **152 direct `supabase.from(...)` table reads/writes** across 24 tables (profiles 38, branches 13, payments 12, membership_plans 11, trainees/attendance 9, …). Security depends entirely on Supabase RLS, which is unverified here. | If any table lacks correct RLS, the anon key allows reading/altering all gym data (payments, profiles, attendance) directly from the client. | Confirm RLS is enabled + correct on every table; treat client as untrusted. (Cross-slice: data layer.) |
| MEDIUM | backend/main.py:33-39 | `CORSMiddleware` with `allow_origins=["*"]` together with `allow_credentials=True`. | Invalid/over-permissive CORS; with no auth it widens the unauthenticated attack surface to any origin. | Pin explicit origins; only enable credentials for those. |
| MEDIUM | backend/main.py:41-47 | Global exception handler returns `str(exc)` + full `traceback.format_exc()` in the JSON body. | Stack traces / internal paths / SQL leaked to clients (info disclosure). | Log server-side; return a generic 500 to clients. |
| MEDIUM | backend/find_ip_region.py:17, backend/find_region.py:16, backend/get_hash.py:8, backend/signup_owner.py:21 | Hardcoded DB password literals and a script (`get_hash.py`) that `SELECT encrypted_password FROM auth.users`. | Committed credentials + a tool to dump password hashes living in the repo. | Delete these ad-hoc scripts; rotate the password. |
| MEDIUM | config/api.js:10 | Hardcoded ngrok tunnel URL as mobile backend base URL. | Backend host pinned in source; tunnel is offline (confirmed dead). | Move to env/config; remove from source. |
| LOW | backend/api_debug_2.json, backend/api_no_validation.json | Committed API-response debug dumps (content is an "Internal Server Error" blob). | Repo clutter; debug dumps can leak data over time. | Remove and gitignore `*.json` debug dumps. |
| LOW | services/pushNotificationService.js:57, screens/LoginScreen.js:44 | Logs Expo push token and "Login successful" to console; verbose request/response logging in config/apiClient.js:31-65 prints full bodies. | Minor PII/telemetry leakage in client logs. | Strip verbose logging in production builds. |
| LOW | 45 committed ad-hoc scripts (backend/*.py + repo-root *.js) | `git ls-files` shows ~45 `check_*/fix_*/debug_*/promote_to_owner/signup_owner/verify_owner/transform_to_owner` one-off scripts; several reference `SUPABASE_SERVICE_ROLE_KEY` from env (debug_trainer.js:6, fix_trainer_node.js:8, fix_trainer.py:8, backend/check_diet.py:10). | Large untrusted attack/operational surface; any local `.env` with a service-role key turns these into god-mode tools. | Quarantine into an `_archive/` / `scripts/` dir excluded from deploys; document & gate. |

## UI & design notes
- N/A for this slice (cross-cutting security). One UX-relevant item: the static `trainer123`
  password (AddTrainerModal.js:42) will confuse/endanger users who never get prompted to change it.

## Dead code & hygiene
- ~45 ad-hoc `check_*/fix_*/debug_*` scripts committed (backend/ and repo root) — see LOW finding.
- `backend/api_debug_2.json`, `backend/api_no_validation.json` debug dumps committed.
- No `requirements.txt`/`pyproject.toml` in backend (separately verified) — secrets/scripts coexist with no dep manifest.
- `supabase/.temp/cli-latest` committed (CLI temp artifact).

## Cross-slice questions
- DATA/RLS slice: Are RLS policies actually enabled and correct on all 24 tables hit by the 152
  frontend `.from()` calls (especially `profiles`, `payments`, `attendance`)? This is the linchpin
  for whether the anon-key client model is safe.
- EDGE-FN slice: Is `verify_jwt` enabled for the `rate-limit-demo` function (no `supabase/config.toml`
  is committed, so deployment default applies)? Even if enabled, it only requires *some* valid JWT,
  not the correct role — confirm role gating is added.
- BACKEND slice: Is the FastAPI backend actually deployed/reachable in any environment, or fully
  superseded by the edge function? Either way it must not ship without auth.
