# Audit Slice: screens-trainee

Files in scope:
- `screens/TraineeHomeScreen.js` (1942 lines) — **LIVE** (imported by `navigation/TraineeTabs.js:6`)
- `screens/TraineeHomeScreen_8f2bd0a.js` (831) — historical snapshot, git-tracked
- `stash0_trainee.js` (1752), `stash1_trainee.js` (1746), `stash2_trainee.js` (1012) — dev stashes at repo root, git-tracked

## Purpose
TraineeHomeScreen is the trainee's main dashboard. It renders a "Daily Trifecta" gamification HUD (4 progress rings: GYM/WORKOUT/DIET/SLEEP), a weekly 7-day consistency node tracker, an XP/rank "mission" card, a motivation card, today's assigned workouts (personal > group-weekly > group-monthly fallback), diet/attendance/sleep/nutrition entry points, trainer info, and subscription status. It also hosts QR-scan attendance, a "Simulate Check-in (Dev)" button, and acts as a multiplexer for the bottom-tab navigation (`initialTab` prop drives `workouts` / `anatomy` / `notification` sub-views).

## What actually works
- Workout-plan resolution cascade (personal custom weekly → group weekly → group monthly) with dedup-by-id and completion re-hydration from `workout_logs.notes` (CHECKED_EXERCISES_V2 + legacy CHECKED_EXERCISES) is well structured (lines 287-452).
- Per-exercise check/reps state keyed `${workoutId}_${idx}`, persisted into `notes` JSON on finish (lines 454-556).
- Responsive ring sizing via `CIRCLE_SIZE = Math.min(110, (SCREEN_WIDTH-84)/4)` and memoized styles (lines 46-59).
- Local-date string helper avoids UTC off-by-one for attendance dates (lines 51-57, 166-168).
- Optimistic UI on check-in then re-fetch after 1.5s (lines 178-198).

## Findings

| severity | file:line | issue | impact | suggested fix |
|---|---|---|---|---|
| CRITICAL | TraineeHomeScreen.js:170, 267, 520, 527 | All mutating API calls (`api.post('/attendance/')`, bulk streak `api.post`, `api.put('/workout-logs/{id}')`, `api.post('/workout-logs/')`) omit `{ useAuth: true }`. Per `config/apiClient.js:19`, the Authorization header is attached ONLY when `options.useAuth===true`. So these requests are unauthenticated and pass a client-supplied `trainee_id`. | IDOR: a trainee (or anyone) can write attendance/workout logs for any `trainee_id`, inflating their own or others' gamification. This is the concrete frontend manifestation of seed findings S2 + IDOR. | Pass `{ useAuth: true }` on every mutating call; backend must derive trainee_id from the verified JWT, not the body. |
| CRITICAL | TraineeHomeScreen.js:1072-1077, 236-251 | "Simulate Check-in (Dev)" button ships in the production render tree with no `__DEV__` guard. It calls `markAttendanceApi` which writes a real attendance row and bumps streak/XP. | Any end user can tap it to fabricate attendance and game the leaderboard/streak/level system. Combined with the no-auth IDOR above, fully exploitable. | Wrap button in `{__DEV__ && (...)}` or remove entirely before release. |
| HIGH | TraineeHomeScreen.js:116 (+ no setter) | `planActive` is initialized `true` and `setPlanActive` is NEVER called anywhere in the file. | Every "Membership inactive" branch (workouts hidden, attendance blocked, subscription warning at lines 214, 1023-1024, 1133-1134) is dead — an expired/inactive member is never gated. `fetchSubscription` computes `daysLeft` but never flips `planActive`. Membership enforcement is fundamentally broken. | In `fetchSubscription`, set `planActive` based on `active_status`/`daysLeft>0`; default to `false` until confirmed. |
| HIGH | navigation/TraineeTabs.js:23 vs TraineeHomeScreen.js:791-1176 | The "Notification" bottom tab navigates with `initialTab="notification"`, but the render body has NO `activeTab === 'notification'` branch (only `home`, `anatomy`, `workouts`, `reminders`). | Tapping the bell tab shows only the welcome header and a blank screen — a visibly broken nav destination. | Add a notification view block, or remove the tab until built. |
| HIGH | TraineeHomeScreen.js:641-660, 667-677, 731-739 | `fetchGamification` reads `gamification.level` from its closure; but `onRefresh` (`useCallback([])`) and `useFocusEffect` (`useCallback([])`) capture the FIRST render's `fetchGamification`, which closes over the initial `gamification` (`level:1`). Level-up detection compares against stale state. Also the guard `gamification.level > 1 && data.level > gamification.level` means a genuine **Level 1→2 promotion never triggers the LevelUp modal** (requires prior level already >1). | First level-up (the most motivating one) is never celebrated; refresh/focus paths use stale level for comparison. | Use functional setState / a ref to read latest level, or store previous level in a ref; relax the `>1` guard so 1→2 fires. |
| MEDIUM | TraineeHomeScreen.js:179-193 | Optimistic update hardcodes `attendance_weekly_avg` to `Math.max(prev,0.2)` ("at least 20%") and weekly count to `Math.max(prev,1)`. | If the real backend value differs (e.g., 1/7≈14%), the GYM ring shows a fake 20% for ~1.5s then snaps. Misleading and inconsistent with the actual /7 math used elsewhere. | Compute optimistic value from real denominator or skip the fake number and only re-fetch. |
| MEDIUM | TraineeHomeScreen.js:492-538 | When `workout.id` is not a UUID, `templateId` is set `null` and posted as `workout_template_id: null` (the real id is stuffed into `notes` text). | Creates workout_log rows with null template FK; completion-matching on next load (`completedTemplateIds`) keys off `workout_template_id` so non-UUID workouts will never re-hydrate as completed. | Persist a stable id; don't rely on parsing it back out of a free-text notes string. |
| MEDIUM | TraineeHomeScreen.js:721-727, 731-739 | A 30s `setInterval` re-runs `fetchTodaysWorkouts` + `fetchNutritionSummary`, AND `useFocusEffect` re-fires the same fetches on every focus. Multiple Supabase round-trips per cycle, overlapping. | Battery/data/quota churn; redundant with focus refresh. | Increase interval, gate by app-state foreground, or rely on focus + pull-to-refresh only. |
| MEDIUM | TraineeHomeScreen.js:667-677 | `onRefresh` omits `fetchNutritionSummary` (it's in `useEffect` and focus but not pull-to-refresh). | Pull-to-refresh does not update the Nutrients & Calories card. | Add `fetchNutritionSummary()` to the `Promise.all`. |
| LOW | TraineeHomeScreen.js:1594/1618 & 1600/1623 | `workoutTitle` and `workoutSub` style keys are each defined twice in `createStyles`; the later definition silently overrides the earlier (fontWeight 800→700, fontSize 13→12). | Confusing dead style declarations. | Remove the duplicate keys. |
| LOW | TraineeHomeScreen.js:3, 22, 28, 29, 30 | Unused imports: `attendanceService`, `checkRateLimit`, `axios`, `API_URL` (live code uses `api` wrapper, not axios), plus `Animated`, `Easing`, and SVG `G/Path/Rect` are imported but unused. | Dead imports, bundle noise. | Prune. |
| LOW | TraineeHomeScreen.js:1175 | `activeTab === 'reminders'` branch (WorkoutReminderSettings) is unreachable — TraineeTabs never passes `initialTab="reminders"`. | Dead render branch. | Remove or wire a tab to it. |
| LOW | TraineeHomeScreen.js:826-832, 949 | GYM ring mixes semantics: ring/percent use `attendance_weekly_avg` (a 0-1 fraction) while the label-color uses the boolean `daily.attendance`; `nodeDayText` guards `d.day ? ...` but assumes backend day objects. | Minor visual inconsistency; safe-ish due to optional chaining. | Document the data contract; ensure backend always returns the `days` array. |

## UI & design notes
- The live "Elite" Trifecta HUD is a clear visual upgrade over the snapshots: 4 responsive rings (adds DIET), gold "EVOLUTION READY" promo badge, gradient mission bar, "ON FIRE" streak treatment ≥5 days. Solid premium-tactical aesthetic.
- `xpTotalText`/mission bar in the live file are driven by `consistency.weekly.count / 5` (days-completed semantics), whereas stash versions used `xp_in_level/100` and `progress`. The live "DAYS COMPLETED" framing is more intuitive but means the literal XP number is no longer surfaced anywhere.
- Profile fallback avatar is a hardcoded imgur URL (`i.imgur.com/ExdKOOz.png`, line 779) — external dependency for a core UI asset; bundle it locally.

## Dead code & hygiene
- `simulateFiveDayStreak` (lines 253-282) is fully defined but **never referenced** by any button in the live render — dead code (and a latent abuse vector if wired up, since it bulk-posts 5 unauthenticated attendance rows).
- `screens/TraineeHomeScreen_8f2bd0a.js`, `stash0_trainee.js`, `stash1_trainee.js`, `stash2_trainee.js`, and `stashes.txt` are all git-tracked clutter at non-standard locations.

### Disposition recommendation for dupes/stashes
- **`_8f2bd0a.js`**: oldest snapshot — pre-gamification (no trifecta, no nutrition, no level-up; client-side `fetchStreak`, internal tab bar, `group_members` table). Fully superseded. **Delete.**
- **`stash0/stash1`**: near-identical to each other (26-line diff: FontAwesome5 vs FontAwesome6 icons + a richer default `gamification` object). They carry the OLD 3-ring HUD (GYM/WORKOUT/SLEEP, no DIET) with fixed 85px SVGs and triple-layered glow aura rings. Superseded by live 4-ring responsive HUD. **Delete.**
- **`stash2`**: intermediate between _8f2bd0a and stash0 (no LevelUp/traineeService yet). **Delete.**
- **Unique bits worth salvaging before deletion (optional, low value):** (1) stash0/1 `handleScan`/`simulateCheckIn` validate the trainee exists in the `trainees` table before posting (lines ~174-205) — the live version skips that check and uses the raw session id; (2) stash0/1 layered triple-glow aura rings are a nicer cosmetic than the live single ring. Neither is must-have.
- Net: quarantine/delete all four JS dupes + `stashes.txt`; none contains feature logic the live file lacks.

## Cross-slice questions
1. **apiClient slice**: confirm `api.post/put` truly send no Authorization without `useAuth:true` (verified at config/apiClient.js:19) and that the backend attendance/workout-log routers do NOT independently authenticate — that determines whether the IDOR is live-exploitable.
2. **backend gamification slice**: confirm the exact shape of `/api/gamification/stats` (`consistency.daily.{attendance,workout,diet,sleep}` booleans + `*_weekly_avg` fractions, `consistency.weekly.{count,streak,days[]}`, `level`, `level_locked`, `rewards.shoutout`). The UI assumes all of these; any missing key silently renders 0%/empty.
3. **backend attendance slice**: does POST `/attendance/` accept an arbitrary `attendance_date` (used by the dead `simulateFiveDayStreak` to backfill 5 days)? If so, streak/consistency are trivially forgeable.
4. **navigation slice**: is the missing `notification` tab content intended to live in TraineeHomeScreen or a separate screen? Currently it renders blank.
5. **subscription/membership slice**: where (if anywhere) is `planActive` supposed to be set false? Confirm membership gating is meant to be enforced client-side here.
