# Slice: client-services (services/, all 16 files)

## Purpose

The `services/` directory is the frontend's entire API layer: thin per-domain wrappers
(profile, trainee, trainer, branch, payment, membership, attendance, trainer-attendance,
sleep, sleep-reminder, nutrition, consistency, motivation, gamification-via-trainee) over
`config/apiClient.js` (`api.get/post/put/delete`), plus two notification modules
(`localNotificationService.js` for scheduled local notifications via expo-notifications,
`pushNotificationService.js` for Expo push-token registration). `services/index.js` is a
partial barrel re-export. Every wrapper hits the FastAPI backend in `backend/` through the
hardcoded ngrok `BASE_URL` (offline today).

## What actually works

The wrapper pattern itself is clean and consistent: each domain module is a flat object of
async functions delegating to a single shared `api` client, so a future auth/default-header
fix in `apiClient.js` lifts every call at once. Endpoint paths were cross-checked against
`backend/main.py` router prefixes and almost all of them line up, including the oddball
`/api/gamification/stats` (`backend/main.py:65`) and `/consistency/stats/{id}`
(`backend/app/api/consistency.py:11`). `localNotificationService` correctly guards every
runtime method with `Platform.OS === 'web'` early-returns and creates the Android channel
before requesting permissions. `trainerAttendanceService.markPresent` is the only function
that validates its inputs (null-check + String coercion) before calling the API.

## Findings

| Severity | file:line | Issue | Impact | Suggested fix |
|---|---|---|---|---|
| CRITICAL | services/nutritionService.js:81-121 | `detectFood` POSTs `/nutrition/detect`, a route that DOES NOT EXIST in the backend (`backend/app/api/nutrition.py` defines only daily-log/log/logs/goals/daily/parse). Additionally `apiClient.js:41` does `JSON.stringify(body)` so the FormData photo could never be transmitted, and the manually-set `multipart/form-data` header lacks a boundary. Every call therefore throws, lands in the catch, sleeps 1.5s to "simulate processing", and returns hardcoded fake detections ("Grilled Chicken Salad", "Boiled Eggs (2)", "Fresh Apple"). | The food-photo-scanning feature is 100% fabricated. Users photograph any meal and get the same three fake items logged as real nutrition data — silent data corruption of the nutrition log. | Remove the mock fallback (or gate behind `__DEV__` with a visible "demo data" banner), implement a real `/nutrition/detect` backend route, and add FormData support to apiClient (skip JSON.stringify and Content-Type when body instanceof FormData). |
| CRITICAL | services/attendanceService.js:15-22 | `createAttendance` catches ALL errors and returns `{ status: "success", message: "Attendance marked (Offline Mode)" }` with no persistence, queue, or retry. | Any network/server/validation failure is masked as success; attendance silently never recorded. With the backend currently dead, every check-in "succeeds" and is lost. | Throw (or return an explicit `{offline: true}` the UI must surface); if offline support is wanted, queue in AsyncStorage and replay. |
| HIGH | services/* (all 14 API modules) | Zero service calls pass `{ useAuth: true }` — `grep useAuth services/` returns nothing — so given `config/apiClient.js:19` only attaches Authorization when `options.useAuth === true`, literally every API request the app makes is unauthenticated. (Extends seed S2 with the concrete count: ~50 endpoints, 0 authenticated.) | Combined with the backend's trust of client-supplied IDs (S3), any user can CRUD any profile, payment, trainee, trainer, branch, membership. | Invert the default: attach the token whenever a session exists; add `useAuth:false` opt-out for the rare public endpoint. Fix CORS server-side instead of stripping auth client-side. |
| HIGH | services/nutritionService.js:17-39 | `getDailySummary` swallows every error and returns hardcoded fake totals (1450 kcal / 110 g protein / goals 2200 kcal etc.) with only a console.warn. | The nutrition dashboard renders fabricated numbers indistinguishable from real data whenever the API is down — which is always, today. Users may make diet decisions from fake data. | Re-throw or return a sentinel the UI renders as an offline/error state. |
| HIGH | services/localNotificationService.js:64 | `scheduleBedtimeReminder` calls `Notifications.cancelAllScheduledNotificationsAsync()` to dedupe, cancelling EVERY scheduled notification app-wide (workout reminders, anything else), not just the bedtime one. | Setting a bedtime reminder silently destroys all other scheduled notifications. | Tag the bedtime notification with an identifier (or store the id returned by `scheduleNotificationAsync`) and cancel only that one via `cancelScheduledNotificationAsync(id)`. |
| HIGH | services/localNotificationService.js:68-84 | Trigger object `{ channelId, hour, minute, repeats: true }` omits the `type` field (`SchedulableTriggerInputTypes.DAILY`) that expo-notifications has required since SDK 52; repo is on expo-notifications ~0.32.16 (SDK 54, package.json:38). Same pre-SDK-52 shape in pushNotificationService.js:93 (`{ seconds: 5 }` without `type: 'timeInterval'`). | Daily bedtime reminder scheduling rejects/misfires on current SDK — the sleep-reminder feature's local notification likely never fires on device. | Use `trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }` (channelId goes in `content` via channel on Android). |
| MEDIUM | services/attendanceService.js:55-57 | `markTrainerAbsent` POSTs `/attendance/trainer/absent/{id}`; backend attendance router (`backend/app/api/attendance.py:96`) only defines `/absent/{trainee_id}` — the trainer variant does not exist. Function is also never called anywhere in the app (grep: only definition). | Dead AND broken — guaranteed 404 trap if a future caller wires it instead of `trainerAttendanceService.markAbsent` (the real one, hitting `/trainer-attendance/absent/{id}`). | Delete it. |
| MEDIUM | services/pushNotificationService.js:1-130 | Entire module is dead code: nothing imports it (grep across App.js/app/components/screens/context/hooks finds zero references). It also (a) bypasses apiClient using raw axios (line 74) — axios is a dependency kept alive solely for this dead file, (b) `savePushToken` POSTs `/trainees/{id}/push-token` while the backend route is mounted at `/push` prefix + `/trainee/{trainee_id}/push-token` (`backend/main.py:61`, `backend/app/api/push_token.py:38`) i.e. `/push/trainee/{id}/push-token` — a 404 even if called, (c) runs `setNotificationHandler` as a module-level import side effect (lines 10-16) with no web guard, (d) `savePushToken` swallows errors (console.error only), (e) logs the push token to console (line 57), (f) uses bare `alert()` (lines 48, 63). | Push notifications are not actually wired into the app at all; the file misleads readers into thinking they are. | Either delete the module (and the axios dependency) or fix the route, route it through apiClient, and actually call `registerForPushNotificationsAsync` from app startup. |
| MEDIUM | services/{profileService,branchService,trainerService,traineeService,paymentService,membershipService}.js (list/create calls, e.g. branchService.js:18,25) | These six modules call collection endpoints WITHOUT trailing slash (`/branches`, `/profiles`, ...) while the backend defines them as `"/"` under the prefix (e.g. `backend/app/api/branch-like routers`, confirmed for trainer.py:19,48, profile.py:18,57, payment.py:15,32, membership.py:19,48, trainee.py:17,38) — FastAPI answers with a 307 redirect to the slashed path. attendanceService/sleepService correctly use the trailing slash. | Every list/create does a redirect round-trip; 307 + CORS preflight + ngrok interstitial pages is a classic source of intermittent "Failed to fetch" and the redirect can drop headers on some RN fetch stacks. | Normalize all collection calls to trailing-slash form (or set `redirect_slashes` handling server-side). |
| MEDIUM | services/attendanceService.js:8,25,29,37,56; trainerAttendanceService.js:8 | `attendanceId.trim()` / `traineeId.trim()` assume string input; an undefined/null/number id throws `TypeError: ... .trim is not a function` before any request, surfacing as a confusing crash rather than a validation message. | Runtime crash on bad caller input; the `// <<< FIX` comment at attendanceService.js:37 shows this already bit them once. | `String(id ?? '').trim()` + explicit empty check (as trainerAttendanceService.markPresent already does). |
| MEDIUM | services/index.js:1-13 | Barrel exports only 10 of 16 modules; `consistencyService`, `motivationService`, `trainerAttendanceService`, `localNotificationService`, `pushNotificationService` are missing, so callers import them by direct path while others come from the barrel (both styles visible in components/screens). | Inconsistent import surface; refactors that move files break half the imports; misleads readers about what the API layer contains. | Export everything from the barrel (or delete the barrel and use direct imports everywhere). |
| MEDIUM | services/localNotificationService.js:10-18 vs pushNotificationService.js:10-16 | Two competing global `setNotificationHandler` configurations (one disables badge, the dead one enables it). `localNotificationService.configure()` is called from App.js:15 with no web guard, executing expo-notifications setup on react-native-web where the module is unsupported. | Whichever loads last wins; on web it emits warnings/undefined behavior. | Single notification bootstrap module, web-guarded. |
| LOW | services/motivationService.js:4-14 | `getQuote` swallows errors and returns a canned quote. | Acceptable graceful degradation for decorative content, but it also hides total backend outage from any "is the API up" signal. | Fine to keep; optionally log once. |
| LOW | services/localNotificationService.js:12-16 | `shouldShowAlert` is deprecated since expo-notifications SDK 53 in favor of `shouldShowBanner`/`shouldShowList`. | Deprecation warnings; iOS foreground presentation may not match intent on future SDKs. | Use the new fields. |
| LOW | services/pushNotificationService.js:47-50,62-64 | `alert(...)` (global) used for permission failures instead of RN `Alert.alert` or app UI. | Janky UX if ever revived; on some platforms global alert is a no-op. | Use the app's toast/Alert (moot if file deleted). |
| LOW | services/attendanceService.js:39-43, trainerAttendanceService.js:36-38, traineeService.js:46, apiClient.js:31-33,64-65 | Emoji console.log of every request URL, body, response (extends S7) from the service layer too, including IDs and full payloads. | Data leakage to device logs; noise. | Strip or gate behind `__DEV__`. |
| LOW | services/traineeService.js:45-49 | `getGamificationStats` builds query string manually with `&` appended after the fixed `?trainee_id=` — works, but fragile, and the `/api/gamification` prefix is inconsistent with every other route (no `/api`). | Cosmetic/maintenance. | Use URLSearchParams; align backend prefix. |
| LOW | services/localNotificationService.js:24-52 | `requestPermissions` returns `true` on simulators unconditionally (line 51) and returns `false` on web silently; callers can't distinguish "denied" from "unsupported platform". | Minor: UI may show reminder as enabled when it can never fire. | Return a status enum. |

## UI & design notes

Not a UI slice, but two service behaviors directly shape UX: (1) the mock fallbacks
(`createAttendance`, `getDailySummary`, `detectFood`) make the app look healthy while the
backend is dead — any visual QA pass on these screens is testing fiction; (2) toast/alert
strategy is inconsistent: services mostly throw (good) but pushNotificationService uses
bare `alert()` and attendance/nutrition fake success instead of letting screens render
error states.

## Dead code & hygiene

- `services/pushNotificationService.js` — entire file unreferenced (130 lines), drags the
  `axios` dependency (package.json:23) along with it, and contains a wrong endpoint path.
- `services/attendanceService.js:52-57` — `markTrainerAbsent` unused and targets a
  nonexistent backend route; superseded by `trainerAttendanceService.markAbsent`.
- `services/index.js` barrel is incomplete (5 modules missing), producing two import styles
  across the app.
- `attendanceService.js:37` `// <<< FIX` and emoji-comment debugging artifacts throughout.
- `nutritionService.js` mock payloads (lines 24-37, 92-119) are inline fixtures that belong
  in a `__mocks__`/demo module if kept at all.

## Cross-slice questions

1. **apiClient/backend slices**: confirm no backend route requires the Authorization header
   today (if any does, every screen using these services is broken even with the API up,
   since no call sends auth).
2. **backend slice**: does any code intend to implement `/nutrition/detect` (CV model in
   `backend/`?) or was the camera scanner always demo-ware? Also confirm `push_token.py`
   router's full mounted path is `/push/trainee/{id}/push-token` (frontend never calls it).
3. **screens slice**: do `TraineeHomeScreen` / attendance screens treat
   `createAttendance`'s fake "Offline Mode" success as real (XP awards, streak increments)?
   If so the gamification stats are corrupted by phantom check-ins.
4. **components slice**: `SleepTrackingModal.js` imports `localNotificationService` — check
   whether it surfaces scheduling failures from the missing trigger `type` or fails
   silently.
5. **backend slice**: verify FastAPI `redirect_slashes` behavior with the CORS config for
   the six no-trailing-slash collection calls (307 + preflight interaction).
