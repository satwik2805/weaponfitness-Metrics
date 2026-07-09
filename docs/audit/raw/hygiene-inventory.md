# Slice: hygiene-inventory

## Purpose
Catalog every junk/debug/one-off/throwaway file at the repo root and in `backend/`. These are developer scratch scripts written during initial development against a (now-dead) Supabase project: schema-probing scripts, role-fixing one-offs, manual table creators, raw error/stub captures, server logs, and orphaned stash/test files. None are part of the running app's source tree; all are tracked in git (verified with `git ls-files`).

## What actually works
Most of these scripts *would have* worked when the Supabase project was live — they are simple, single-purpose scripts. Today they are all non-functional because:
- The Supabase hosts (`sdgrkwbofvxloglbumzy.supabase.co` etc.) are NXDOMAIN.
- The hardcoded DB password connection strings point at dead hosts.
- `backend/` has no requirements.txt, so even importing `app.*` requires a manually reconstructed venv.

The catalog/inventory itself is the deliverable. The key *working* observation: nothing in the app's runtime imports these files **except** `screens/TestScreen.js`, which is still wired into `navigation/AppNavigator.js:34` as a live `Test` route (and re-exported by `app/test.js`). So `TestScreen.js` is NOT dead — it ships in the navigator.

## Findings

### CRITICAL — Secrets committed in plaintext (extends seed finding S1)
The handover's S1 was about `server/.env`. These are ADDITIONAL hardcoded secrets in tracked Python scripts in `backend/`:

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| CRITICAL | backend/get_hash.py:3 | Hardcoded Postgres connection string with DB password (Supabase project `sdgrkwbofvxloglbumzy`, postgres user). Also queries `auth.users.encrypted_password` — a script written to exfiltrate a password hash. | Full DB credential leak in git history; password reuse risk even though host is now dead. | Delete file; rotate the DB password if the project is ever revived; scrub git history. |
| CRITICAL | backend/check_branch_data.py:3 | Same hardcoded DB connection string + password. | Credential in git history. | Delete; purge from history. |
| CRITICAL | backend/check_db_users.py:5 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/find_users.py:3 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/ensure_trainer_for_owner.py:3 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/promote_to_owner.py:3 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/verify_owner.py:3 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/verify_owner_setup.py:3 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/transform_to_owner_email.py:3 | Same hardcoded DB connection string + password. | Credential leak. | Delete; purge. |
| CRITICAL | backend/find_region.py:6,16 | DB password in a comment AND as a variable; brute-forces Supabase regions with the credential. | Credential leak + recon tooling. | Delete; purge. |
| CRITICAL | backend/find_ip_region.py:7,17 | DB password in comment + variable; brute-forces Supabase IPs. | Credential leak + recon tooling. | Delete; purge. |

Note: the DB password string (present in both URL-encoded and plaintext-comment forms; type=Postgres DB password, value redacted) appears in **14 locations across 11 files**. Values intentionally referenced only as file:line per audit rules. Because they are in committed history, rotating the DB password is mandatory before any project revival, and the cleanup is not complete until history is scrubbed (git filter-repo / BFG).

### HIGH — Live route still points at a debug screen

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| HIGH | navigation/AppNavigator.js:18,34 + screens/TestScreen.js + app/test.js | `TestScreen` (a developer scratch screen that hits raw `BASE_URL` endpoints) is registered as a navigable `Test` route and re-exported via `app/test.js`. | Ships a debug screen in the production navigator; users could reach it; expands attack/confusion surface. | Remove the route + delete TestScreen.js and app/test.js (confirm no deep-link references first). |

### HIGH — Schema-mutating / destructive one-off scripts committed

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| HIGH | backend/fix_nutrition_schema.py | `DROP TABLE IF EXISTS nutrition_logs CASCADE` then recreate — destructive migration run by hand instead of via Alembic. | Data loss if run against a live DB; bypasses migration history. | Archive; encode any needed schema change as a proper Alembic revision. |
| HIGH | backend/force_db_sync.py | Force-creates nutrition tables directly via `Base.metadata`/`create` bypassing Alembic. | Schema drift vs migrations. | Archive. |
| MEDIUM | backend/create_tables.py, create_nutrition_tables.py, create_daily_nutrition_table.py, create_workout_tables.py, migrate_gamification.py, fix_consistency_schema.py | Hand-rolled `create`/`ALTER TABLE` scripts duplicating what Alembic (`backend/alembic/versions/`) should own. | Two competing sources of truth for schema. | Archive; fold into Alembic. |

### MEDIUM/LOW — Debug capture files and logs (tracked, junk)

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| MEDIUM | backend/error_trace.json, backend/trace.txt | Full SQLAlchemy/psycopg2 stack traces captured to disk and committed. Leak absolute dev paths (`C:\Users\sneha\...`, `C:\Users\CHAYA\...`) and live trainee UUIDs (e.g. `58e1a978-...`). | PII (UUIDs) + internal path disclosure in repo. | Delete. |
| LOW | backend/api_debug_2.json, api_no_validation.json, stub_no_db.json, stub_output.json, final_debug.json, detailed_error.json (each 48 bytes, "Internal Server Error" / stub JSON) | One-off API response captures. | Pure clutter. | Delete. |
| LOW | backend/final_success.json, stub_output_8002.json | Captured successful daily-nutrition stub responses (UTF-16). | Clutter. | Delete. |
| LOW | backend/debug_output.txt (0 bytes), debug_mock_out.txt (0 bytes) | Empty capture files. | Clutter. | Delete. |
| LOW | backend/debug_run.log, uvicorn_8002_utf8.log (6.9KB), uvicorn_8002_retry.log (104KB) | Uvicorn/python run logs; leak dev machine paths (`C:\Users\CHAYA\...`). | Clutter + path disclosure; 104KB log bloats repo. | Delete; add `*.log` to .gitignore. |
| LOW | backend/files.txt (362KB) | A dumped recursive file listing of someone's `weaponfitness` tree (incl. venv site-packages). Leaks dev paths. | 362KB of pure noise in repo. | Delete. |
| LOW | backend/tables_list.txt | Plaintext list of DB table names. | Minor; clutter. | Delete. |
| LOW | fix_log.txt (root) | Captured PowerShell error output from running `fix_trainer_node.js`; leaks `C:\Users\sneha\...` path. | Clutter + path disclosure. | Delete. |
| LOW | profiles_list.txt (root, UTF-16) | Dumped JSON of real `profiles` rows (names + roles + UUIDs of "Varun Sharma", "Head Admin", etc.). | PII of real/test users committed. | Delete. |

### LOW — Orphaned stash snapshots & dead screen variants

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| LOW | stash0_trainee.js (55KB), stash1_trainee.js (54KB), stash2_trainee.js (31KB) | Three full copies of old TraineeHomeScreen versions saved out of git stashes; not imported anywhere. | 140KB of dead duplicate code. | Delete (the real screen lives in screens/). |
| LOW | stashes.txt | Notes listing `git stash@{0..3}` descriptions. | Dev scratch note. | Delete. |
| LOW | screens/TraineeHomeScreen_8f2bd0a.js (25KB) | Commit-hash-suffixed snapshot of TraineeHomeScreen; not imported (grep finds zero importers). | Dead duplicate. | Delete. |

### LOW — Node debug/probe scripts at repo root (all import @supabase/supabase-js, read env, hit the dead DB)

All of the following are throwaway DB-introspection scripts. None are imported by app code. They rely on `.env` (SUPABASE_URL/ANON_KEY or SERVICE_ROLE_KEY) — no secrets hardcoded in the JS themselves (verified: secrets come from `process.env`), but several reference real test emails (`trainer@gmail.com`). Disposition: archive-or-delete (delete-candidate).

| file | size | one-line purpose |
|---|---|---|
| check_all_data.js | 802 | dump custom_trainee_diet + group_weekly_diet |
| check_assignment_keys.js | 707 | print keys of diet assignment tables |
| check_cols.js | 483 | list cols of custom_trainee_weekly_workouts |
| check_days.js | 474 | sample day_name values |
| check_diet.js | 2697 | hardcodes host `https://sdgrkwbofvxloglbumzy.supabase.co` (line 9), inspect a trainee's diet |
| check_diet_lib.js | 515 | dump diet_library |
| check_dupes.js | 1016 | find duplicate diet rows |
| check_group_members.js | 551 | print group_members cols |
| check_groups.js | 1409 | inspect/auto-promote trainer@gmail.com to Trainer |
| check_ids.js | 690 | sample trainees + custom_trainee_diet ids |
| check_library.js | 597 | dump diet_library + diet_meals |
| check_pk_exact.js | 895 | probe primary-key columns |
| check_schema.js | 741 | rpc get_table_info probe |
| check_table_names.js | 890 | existence-check table names |
| check_tables.js | 741 | dump diet tables |
| check_tpl.js | 534 | print workout_templates cols |
| check_tpl_v2.js | 601 | v2 of check_tpl |
| check_trainee.js | 534 | print trainees schema |
| check_workout_data.js | 508 | dump custom_trainee_weekly_workouts |
| debug_assignments.js | 960 | dump diet assignments |
| debug_diets.js | 863 | dump group/custom diets |
| debug_trainer.js | 1096 | uses SERVICE_ROLE_KEY; inspect trainer@gmail.com |
| deep_inspect.js | 985 | iterate + inspect several tables |
| find_trainee.js | 564 | find a trainee profile by role |
| fix_trainer_node.js | 1914 | uses SERVICE_ROLE_KEY; create/repair trainer record for trainer@gmail.com (mutates data) |
| inspect_db.js | 761 | inspect diet tables |
| list_profiles.js | 517 | list profiles |
| list_tables.js | 814 | guess/probe table names |
| probe_all_cols.js | 1375 | probe columns of many tables |
| probe_cols.js | 873 | probe diet table columns |
| probe_junctions.js | 1320 | probe junction tables |
| simple_probe.js | 632 | probe group_weekly_diet columns |
| test_save.js | 1306 | hardcodes a trainee UUID; test a save path |

### LOW — Python one-off scripts at repo root

| file | size | one-line purpose | secrets? | disposition |
|---|---|---|---|---|
| fix_trainer.py | 1639 | promote trainer@gmail.com to Trainer via Supabase SERVICE_ROLE_KEY (mutates) | env only | delete-candidate |
| fix_trainer_direct.py | 3035 | same via SQLAlchemy ORM session (mutates) | env only | delete-candidate |
| repair_trainers.py | 986 | bulk-promote trainer-named profiles (mutates) | env only | delete-candidate |
| check_trainer_status.py | 609 | raw SQL select of trainer-like profiles | env only | delete-candidate |
| list_profiles.py | 358 | raw SQL dump of all profiles | env only | delete-candidate |
| run_project.py | 1292 | kill ports 8000-8002 then launch backend (dev launcher) | none | archive (could be useful as dev helper) |
| test_cv.py | 497 | smoke-test importing vision_service / YOLOv8 | none | archive (or fold into real tests) |

### LOW — Backend Python one-off scripts (env-based secrets only, no hardcoded creds)

| file | size | one-line purpose | secrets? | disposition |
|---|---|---|---|---|
| backend/assign_custom_friday.py | 1767 | assign a Friday custom workout to all trainees | none | delete-candidate |
| backend/assign_friday_workout.py | 1147 | assign Friday workout to "Morning Batch" group | none | delete-candidate |
| backend/assign_friday_workout_v2.py | 1449 | v2 of above | none | delete-candidate |
| backend/check_db.py | 458 | `SELECT 1` connection smoke-test | none | archive (useful health check) |
| backend/check_diet.py | 1830 | hardcodes host URL (line 9) + SERVICE_ROLE_KEY from env; inspect a trainee's diet | host hardcoded, key from env | delete-candidate |
| backend/check_missing_trainees.py | 1064 | find trainee profiles lacking trainee rows | none | delete-candidate |
| backend/create_trainee_profile.py | 2662 | link a Supabase auth user to a trainee record (SERVICE key from env) | env only | delete-candidate |
| backend/debug_daily_log.py | 2628 | debug daily nutrition summary serialization | none | delete-candidate |
| backend/debug_mock.py | 1405 | mock-serialize nutrition schemas | none | delete-candidate |
| backend/debug_xp.py | 408 | print trainee XP/level | none | delete-candidate |
| backend/fix_profile_roles.py | 1921 | fix profile roles via SERVICE key (mutates) | env only | delete-candidate |
| backend/fix_trainee_profile.py | 2728 | create trainee profile for trainee@gmail.com (mutates) | none | delete-candidate |
| backend/signup_owner.py | 1128 | sign up owner@test.com with hardcoded weak password "12345678" (line 21) via Supabase auth | weak test password literal | delete-candidate |
| backend/update_workout_instructions.py | 1171 | update a workout template's instructions | none | delete-candidate |
| backend/test_consistency.py | 2590 | manual consistency-service test harness (not pytest) | none | archive or convert to pytest |
| backend/list_tables.py | 380 | list public-schema tables | none | delete-candidate |

## UI & design notes
- `screens/TestScreen.js` is a bare debug screen (5.8KB) with raw `Alert`/`ActivityIndicator` test UI, wired into the navigator as `Test`. It is not a real product screen and should be removed before any redesign work.
- Three `stash*_trainee.js` + `TraineeHomeScreen_8f2bd0a.js` are stale design variants of the trainee home; do not mine them for the redesign — use the canonical `screens/TraineeHomeScreen.js`.

## Dead code & hygiene
- ~95 junk files tracked in git (33 root .js probes, ~16 root/.py + backend .py one-offs, ~16 backend capture/log files, 3 stash snapshots, 1 hash-suffixed screen).
- Largest offenders by size: `backend/files.txt` (362KB), `backend/uvicorn_8002_retry.log` (104KB), `stash0/1/2_trainee.js` (~140KB combined).
- No `.gitignore` entry prevents `*.log`, stub JSONs, or stash files from being committed.
- Recommended action for Phase 5: move all of the above into `_archive/` (or delete), EXCEPT first removing the live `TestScreen` route. The 11 files with hardcoded DB passwords require git-history scrubbing, not just deletion.

## Cross-slice questions
1. **config/env slice**: Confirm whether `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` (referenced by these scripts and used by app code) are themselves committed anywhere (`.env`, app.config.js extra). app.config.js:57-60 wires them from `process.env` — where does the env actually come from at build time?
2. **backend/main.py slice**: Confirm whether the global exception handler is what produced `error_trace.json` (full stack trace returned to client) — this corroborates seed finding S5.
3. **navigation slice**: Confirm `Test` route (AppNavigator.js:34) is unreachable from normal UX (no nav button) before deletion, and that no other screen deep-links to it.
4. **alembic slice**: Confirm the hand-rolled `create_*`/`fix_*_schema.py` scripts are fully superseded by `backend/alembic/versions/` so they can be deleted without losing a needed migration step (esp. the gamification xp/level columns and nutrition table schema).
