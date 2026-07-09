# UI Quality Sweep — screens/ + components/ (design-lens audit)

Scope: all 19 files in `screens/`, all 48 files in `components/` (legacy), `constants/theme.js`, `constants/colors.js`, `context/ThemeContext.js`. The new `theme/` + `components/ui/` design system is **being written concurrently by Phase 2** (files appeared mid-audit, untracked in git) and is excluded from offender rankings; noted only for cross-slice context.

## Purpose

This slice inventories the visual/UX quality of the entire React Native (Expo/web) frontend: which color source each file uses, hardcoded hex density, loading/empty/error state coverage, Alert vs inline error patterns, accessibility, typography, and spacing consistency — ending with the 10 worst offenders and the mechanical requirements for a design system migration.

## What actually works

- `context/ThemeContext.js` is a clean, correct light/dark provider with AsyncStorage persistence; ~55 of 67 UI files do call `useTheme()`.
- Several screens already use the `createStyles(colors)` factory + `useMemo` pattern (TraineeHomeScreen.js:59, ProfileScreen.js:22), which is the right shape for theme-aware styles.
- `constants/theme.js` has a real spacing scale and glass layout token; profile screens and Welcome/Login consume `spacing`/`typography`/`layout` consistently.
- Admin/Owner dashboards have plain-text empty states for every list (AdminDashboard.js:540-701, OwnerDashboard.js:1014-1192) and ActivityIndicators.
- ErrorBoundary + SafeAreaProvider + ThemeProvider correctly wrap the app (App.js:54-63).
- WelcomeScreen's animation/glass-card composition is genuinely decent dark-mode visual design.

## Findings

| Severity | file:line | Issue | Impact | Suggested fix |
|---|---|---|---|---|
| CRITICAL | 29 files, 146 call sites (e.g. screens/AdminDashboard.js:434, components/GroupDetailModal.js:55, components/ManagePlansModal.js:127, components/TrainerAttendanceModal.js:68, screens/AdminProfileScreen.js:49) | `Alert.alert` is a literal no-op on react-native-web (`node_modules/react-native-web/dist/exports/Alert/index.js` → `static alert() {}`). All 146 calls — every validation error, success message, AND every "Are you sure?" confirm with an onPress callback — silently do nothing on web. | On web: zero user feedback anywhere, and destructive/confirm flows (Delete User, Delete Group, Delete Plan, Logout, Mark Absent) can **never execute** because the confirm button never renders. Feature-breaking on the platform the app is currently run on. | Design system must ship a cross-platform `ConfirmDialog` + `Toast`; codemod all Alert.alert sites. |
| CRITICAL | screens/LoginScreen.js:23,37,55,61 | All login failures reported only via Alert.alert → no-op on web. | Failed login on web gives no feedback at all; user stares at a button that does nothing. Compounded by dead Supabase hosts (every login fails). | Inline error text under the form + toast. |
| HIGH | screens/TraineeHomeScreen.js:39-41 vs 61-116 | Early `return` when `!colors` occurs BEFORE ~25 `useState`/`useEffect` hooks — rules-of-hooks violation; if `colors` ever transitions, React throws "rendered fewer hooks". Also renders permanent fake "Loading..." if mounted outside ThemeProvider. | Latent crash + masks provider bugs. | Remove guard; ThemeProvider always supplies colors. |
| HIGH | screens/TraineeHomeScreen.js (whole file) | Flagship screen: 66 hex + 51 rgba hardcoded dark values inside `createStyles(colors,...)` that receives theme colors (e.g. :1242 `rgba(0,0,0,0.6)`, :1250 `#ffae00`, :1277 `#0c0c0c`, :1307 `#fff`, :1745 `rgba(0,0,0,0.95)`). | Light mode is visually broken on the most important screen — dark HUD panels, white text on light bg. | Token codemod; semantic colors for streak/HUD. |
| HIGH | constants/theme.js:47-77 | `typography` tokens bake `colors.text` where `colors = darkColors` (line 36). Any style spreading `...typography.h1` gets `color:#FFFFFF` permanently. Confirmed consumer: screens/ProfileScreen.js:343-346 (`name` style, no color override). | In light mode the profile name (and any unoverridden h1/h2/body) renders white-on-light = invisible. ~10 files import `typography`. | Typography tokens must be color-free; color resolved at render via themed `<Text>` component. |
| HIGH | components/TrifectaDashboard.js:23,43-90 (module-level `styles`) + components/RankDashCard.js:27-90 | Components call `useTheme()` (Trifecta) or import no theme at all (RankDashCard) but style entirely from hardcoded dark hex (`#0a0a0a`, `#333`, `#888`, `#222`). | Light mode broken; theme toggle is cosmetic on trainee gamification UI. | Convert to createStyles(colors) with tokens. |
| HIGH | screens/LoginScreen.js:142-143 | `inputWrapper` has no `borderWidth`; `inputWrapperFocused` only sets `borderColor`. | Focus state is completely invisible — the `focusedInput` state machinery does nothing. | Add borderWidth:1 + token focus ring (Input component). |
| HIGH | screens/LoginScreen.js:68-71,124-127 | "Continue with Google" button is fake: handler shows an info Alert ("already configured in Supabase") — which is also a no-op on web, so the button literally does nothing. | Users tap a primary social-auth affordance with zero result. | Remove button or implement OAuth. |
| HIGH | all 67 files | Accessibility is **zero**: 0 `accessibilityLabel`, 0 `accessibilityRole`, 0 `hitSlop` across screens/ + components/. Icon-only TouchableOpacities everywhere (tab bars, close buttons, QR buttons). | Screen readers get unlabeled buttons; small icon targets (<44px) hard to tap. | Button/IconButton primitives that require a label prop and enforce 44px min target. |
| HIGH | screens/TraineeHomeScreen.js (entire), screens/TrainerDashboard.js, screens/TodayAttendanceScreen.js, screens/ReceptionistDashboard.js | No loading UI at all (zero ActivityIndicator/skeleton/isLoading). TraineeHomeScreen fires ~8 async fetches; content pops in piecemeal from defaults ("User", empty rings). | Janky first paint; user sees placeholder identity and 0% rings every open. | `Skeleton` + `AsyncContent` wrapper from design system. |
| HIGH | screens/ReceptionistDashboard.js:86-108, screens/TraineeHomeScreen.js:136,203-244 | Bare global `alert()` (13 sites) for success/error — raw browser dialog on web, title-less Alert on native; inconsistent with the 146 Alert.alert sites and the 8 files that use inline error text. | Three competing feedback patterns; browser-chrome dialogs destroy the premium aesthetic. | Single Toast API. |
| MEDIUM | screens/WelcomeScreen.js:76-81 + navigation/AppNavigator.js:34 | "Test Backend Connection" debug button on the production welcome screen, routed to TestScreen (14 hardcoded hex, dev tooling). | Dev tooling shipped on the first screen users see. | Gate behind `__DEV__` or delete. |
| MEDIUM | screens/WelcomeScreen.js:12, screens/LoginScreen.js:8 + 15 more files | 17 files import the **static** `colors` (= darkColors) from constants/theme.js instead of `useTheme()`; Welcome/Login/Loading have no theme awareness at all. | Theme toggle does nothing on entry screens; light-mode users get dark login. | Codemod static import → hook. |
| MEDIUM | screens/TraineeHomeScreen.js:43-46 + components/TrifectaDashboard.js:9 | `Dimensions.get('window')` read once at render/module scope (no `useWindowDimensions`). | Layout doesn't respond to web window resize, rotation, or foldables; CIRCLE_SIZE frozen. | useWindowDimensions in primitives. |
| MEDIUM | screens/TraineeHomeScreen.js:1747 | Safe area faked with `paddingBottom: Platform.OS === "ios" ? 30 : 20` on the fixed bottom bar; `useSafeAreaInsets` used nowhere in legacy code (only new ui/Screen.js). | Wrong on notch-less iPhones, Android gesture nav, iPad. | Screen primitive with insets. |
| MEDIUM | components: only 2 of 16 TextInput-bearing modals use KeyboardAvoidingView | Keyboard covers inputs in 14 form modals (AddTrainee, RegisterMember, CreateDietPlan, etc.). | Mobile form entry frustration. | Modal/Sheet primitive with built-in keyboard avoidance. |
| MEDIUM | typography sweep (all files) | 21 distinct `fontSize` literals (7,9,10,11,12,13,14,15,16,17,18,20,21,22,24,26,28,32,42,48,50); theme typography used in ~10 files only. fontSize:7 (1×) and 9 (4×) are below legibility floor. | No type hierarchy; sub-10px text unreadable. | Type scale tokens + `<Text variant>`; lint raw fontSize. |
| MEDIUM | spacing sweep (all files) | 25 distinct margin/padding literals; the most common values — 10 (201×), 12 (171×), 20 (163×), 15 (31×) — are **not on** the theme scale (4/8/16/24/32/48). `spacing` imported in only 12 of 67 files. | Visual rhythm is accidental; redesign requires touching every file. | 4px-grid space tokens + codemod map (10→8 or 12, 15→16, 20→16 or 24, 25→24). |
| MEDIUM | screens/ReceptionQRCodeScreen.js | Zero loading/empty/error handling (0/0/0 on all heuristics). | Any fetch failure = blank screen. | AsyncContent wrapper. |
| MEDIUM | 115 `console.log` across legacy screens/components (excl. new ui/) | Debug logging in production UI, incl. session/profile data paths (extends seed S7 to the frontend broadly). | Console noise; potential PII in web console. | Strip via babel plugin or logger util. |
| LOW | constants/colors.js:1-11 | Second palette (`colors2`, brown/maroon) with **zero importers** anywhere in the repo. | Dead file; confuses "which color source?" question — answer: theme.js + hex, never colors.js. | Delete. |
| LOW | screens/TraineeHomeScreen_8f2bd0a.js (831 lines) | Orphaned snapshot copy of TraineeHomeScreen (git-hash-suffixed filename); zero importers. | 831 lines of dead weight; shows up in greps and confuses edits. | Move to _archive/ (Phase 5). |
| LOW | components/SectionHeader.js | Zero importers — dead shared component. | Dead code. | Delete or adopt. |
| LOW | components/ListItem.js | Imported only by TraineeHomeScreen + the dead _8f2bd0a copy — the only legacy "shared primitive" and it has 1 real consumer. | Component reuse essentially doesn't exist in legacy code; 48 components are one-off modals. | Supersede with ui/ primitives. |
| LOW | screens/LoginScreen.js:92-100 | Email input missing `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete`; no password visibility toggle; no forgot-password path. | Mobile users get auto-capitalized email; minor friction. | Input primitive presets. |

## Color-source table (who imports what)

| Source | Files | Notes |
|---|---|---|
| `constants/theme.js` (static `colors` = dark) | 17 (Welcome, Login, Loading, all 5 profile screens, Payments, TodayAttendance, ReceptionQR, AdminDashboard, OwnerDashboard, QRCodeModal, FeedbackModal, AttendanceCalendarModal, ManagePlansModal) | Entry screens are dark-only |
| `useTheme()` hook | ~55 files | But most still hardcode hex on top |
| `constants/colors.js` | **0 files** | Dead palette |
| Hardcoded hex only (no theme import at all) | RankDashCard, FoodCameraScanner(.web), Anatomy3DScene, TestScreen, WorkoutAvatar.web, SectionHeader | Fully theme-blind |

### Hardcoded hex per file — top offenders (hex / rgba)

1. screens/TraineeHomeScreen.js — 66 / 51
2. components/TrifectaDashboard.js — 36 / —
3. screens/OwnerDashboard.js — 27 / —
4. components/WorkoutAvatar.js — 14 / 7
5. components/NutritionTrackerModal.js — 14
6. screens/TestScreen.js — 14
7. screens/AdminProfileScreen.js — 13; components/LevelUpModal.js — 13; FoodCameraScanner.web.js — 13
8. screens/AdminDashboard.js — 12
9. components/WorkoutTracker.js, TraineeProgressModal.js, AnatomyView.js, FoodCameraScanner.js — 11 each
10. components/RankDashCard.js — 10 (and imports no theme at all)

## Loading / empty / error coverage per screen

| Screen | Loading | Empty | Error UI |
|---|---|---|---|
| AdminDashboard | ActivityIndicator | text empties (6+) | Alert (web no-op) |
| AdminProfileScreen | none | n/a | Alert + some inline |
| EditProfileScreen | none | n/a | Alert |
| LoginScreen | spinner-in-button | n/a | Alert only (no-op on web) |
| OwnerDashboard | ActivityIndicator | text empties | console + 1 Alert |
| OwnerProfileScreen | partial | none | Alert |
| PaymentsScreen | ActivityIndicator | partial | Alert-ish |
| ProfileScreen | partial | 1 | Alert |
| ReceptionistDashboard | **none** | minimal | bare `alert()` |
| ReceptionistProfileScreen | ActivityIndicator | none | Alert |
| ReceptionQRCodeScreen | **none** | **none** | **none** |
| TodayAttendanceScreen | **none** | 1 | console |
| TraineeHomeScreen | **none** (flagship!) | 1 ("No workouts assigned today" :1026) | bare `alert()` + console |
| TrainerDashboard | **none** | minimal | console |
| WelcomeScreen | n/a | n/a | n/a |

No skeleton component exists anywhere in legacy code. No toast/snackbar exists in legacy code (ui/Toast.js being added by Phase 2 now).

## UI & design notes

- The intended brand (charcoal + neon red #E50914, glass cards, italic display type) is coherent on WelcomeScreen but degrades into ad-hoc reds (#FF4D4D, #ff4d4d, rgba(255,23,68,…) = Material redA400, #E50914) across screens — at least 3 different "accent reds" in use.
- Streak amber `#ffae00` (TraineeHomeScreen:1250) and success greens appear with no token.
- Light mode is effectively unusable: entry screens ignore it, flagship screens hardcode dark surfaces, and typography tokens bake white text. Either fix mechanically via tokens or remove the toggle until migration completes.

## The 10 worst UI offenders, ranked

1. **screens/TraineeHomeScreen.js** — 1942 lines; 66 hex + 51 rgba; zero loading UI; conditional-hooks bug (:39); bare alert(); hardcoded safe area; the flagship screen and the worst file.
2. **screens/OwnerDashboard.js** — 1940 lines; 27 hex; mixed static + hook theming; Alert/console error mix.
3. **components/TrifectaDashboard.js** — 36 hex in a module-level StyleSheet while calling useTheme; light mode broken on gamification centerpiece.
4. **screens/LoginScreen.js** — invisible focus ring, fake Google button, web-no-op error alerts, static dark palette, missing input semantics.
5. **screens/AdminDashboard.js** — 1120 lines; delete-user confirm cannot execute on web; 12 hex.
6. **components/NutritionTrackerModal.js** — 831 lines; 14 hex; 8 Alerts; no keyboard avoidance.
7. **components/RankDashCard.js** — entirely theme-blind hardcoded palette.
8. **screens/ReceptionistDashboard.js** — bare browser `alert()` for all feedback; no loading state.
9. **screens/WelcomeScreen.js + screens/TestScreen.js** — debug backend-test button shipped on the front door, routing to a 14-hex dev screen.
10. **components/WorkoutAvatar.js / AnatomyView(.web).js / FoodCameraScanner(.web).js** — 10-14 hex each, platform forks duplicating hardcoded styles.

## What a design system must provide to fix this mechanically

1. **Semantic color tokens via useTheme only** — incl. named accent ramps (accent, accentMuted, streakAmber, success/warn/error surfaces); delete constants/colors.js; publish a hex→token codemod map (#E50914/#ff4d4d/rgba(255,23,68,x)→accent*, #0c0c0c/#0a0a0a→surface, #fff→onSurface, #ffae00→streak).
2. **Color-free typography tokens + `<Text variant>`** that resolves color at render (kills the white-on-light bug class).
3. **4px-grid space tokens + codemod table** (10→sm/md decision, 15→16, 20→md/lg, 25→lg) + ESLint `no-color-literals` / no-magic-spacing.
4. **Web-safe `ConfirmDialog` + `Toast`** with an `Alert.alert`-shaped adapter so all 146 + 13 call sites convert mechanically.
5. **`AsyncContent`/`Skeleton`/`EmptyState`/`ErrorState`** primitives; every fetch-rendering screen wraps lists in them.
6. **`Button`/`IconButton`** enforcing ≥44px hit target, required accessibilityLabel for icon-only, built-in loading state.
7. **`Input`** with label, error slot, visible focus ring, keyboardType presets, password toggle.
8. **`Screen`** wrapper: SafeAreaView insets, themed bg/gradient, scroll + keyboard avoidance (kills Platform.OS padding hacks).
9. **`Modal/Sheet`** primitive with keyboard avoidance for the 16 form modals.
10. **useWindowDimensions-based responsive helpers** replacing module-scope Dimensions.get.

## Dead code & hygiene

- `constants/colors.js` — zero importers (dead second palette).
- `screens/TraineeHomeScreen_8f2bd0a.js` — 831-line orphan snapshot, zero importers.
- `components/SectionHeader.js` — zero importers.
- `screens/TestScreen.js` — dev tool routed in production (navigation/AppNavigator.js:34).
- 115 `console.log` in legacy UI files.
- Comment "/* Styles unchanged */" (LoginScreen.js:136) and dead Share result branches (TraineeHomeScreen.js:126-134) — leftover scaffolding.

## Cross-slice questions

1. **Navigation slice**: confirm TestScreen and the Welcome→Test route should be removed; confirm LoadingScreen replace-navigation flow (Login → "Loading" → role dashboard) handles the dead-Supabase failure path.
2. **Phase 2 (design system)**: App.js already imports `./components/ui/Toast` and `./theme` (darkSemantic) but `Toast.js` did not exist on disk at audit time (files were being written concurrently) — verify App.js boots, and verify ui/ primitives cover ConfirmDialog (the Alert.alert web no-op is the single highest-leverage fix).
3. **API slice**: confirm the bare `alert(error.message)` paths in TraineeHomeScreen expose backend stack traces (seed S5) directly to users.
4. **Backend slice**: ReceptionistDashboard's broadcast email `alert("Emails sent successfully!")` fires on a 200 regardless of per-recipient failures — does server/ report partial failure?
