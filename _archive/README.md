# _archive — quarantined files (nothing deleted)

Everything here was moved out of the live tree during the 2026-06-10 cleanup
(`git mv`, history preserved). None of it is imported by the app or the API.
Review and delete at leisure — or restore anything that turns out to matter.

| Folder | Contents | Why archived |
|--------|----------|--------------|
| `root-scripts/` | ~40 one-off `check_*` / `debug_*` / `probe_*` / `fix_*` / `list_*` scripts (JS + Python) from the repo root | Ad-hoc DB pokes against production written during firefights; several contain hardcoded credentials (see SECURITY notes). Not part of the product. |
| `backend-scripts/` | ~36 one-off scripts from `backend/` (`assign_*`, `create_*_table`, `fix_*`, `promote_to_owner`, `signup_owner`, `get_hash`, …) | Same as above — schema work belongs in Alembic, account ops belong in admin tooling. `get_hash.py` dumped auth password hashes; never run these against a live DB. |
| `backend-dumps/` | committed `.json` / `.txt` / `.log` debug captures | Output artifacts, not source. |
| `screens/` | `TraineeHomeScreen_8f2bd0a.js` (stale copy named after a commit hash), `TestScreen.js` (dev backend-probe screen, route removed) | Dead duplicates / dev-only UI that shipped in the production navigator. |
| `misc/` | `stash0/1/2_trainee.js` (~160 KB abandoned WIP), `stashes.txt`, `profiles_list.txt` (PII dump), `fix_log.txt`, `app-test.js` | Abandoned work-in-progress and data dumps. `profiles_list.txt` contains real member emails — treat as sensitive, delete after review. |

Also untracked in the same pass (files kept on disk, removed from git):
- `server/.env` — **live secrets were committed**; rotate every key in it (Brevo API key, SMTP key, Supabase anon key) and scrub git history (BFG / git-filter-repo).
- `.expo/` — local Expo state, never belongs in git.
- `supabase/.temp/cli-latest` — CLI temp artifact.

## legacy-ui/anatomy/ (2026-06-14, decision D-026)
The old Body-Anatomy implementation, retired when the surface was rebuilt on the
design system:
- `AnatomyView.web.js` — near-duplicate of the native `AnatomyView` (the only
  divergence was iframe-vs-WebView for the video; now one file, Platform-gated).
- `Anatomy3DScene.js` — the "glass-box mannequin" built from boxes/cylinders via
  `@react-three/fiber`'s **web** entry, so it crashed on native (it lived behind
  an error boundary that fell back to 2D). Off-brand and low-fidelity.
- `DetailedMuscleMap.js` — drove `react-native-body-highlighter` with the wrong
  press prop (`onMusclePress`) and invalid muscle slugs.
Replaced by `components/AnatomyView.js` + `components/MuscleFigure.js` +
`components/anatomy/muscles.js`.

## legacy-ui/ WorkoutAvatar (2026-06-14, decision D-027)
The old `FormLibraryModal` avatar, retired for the same native-crash reason as
the anatomy scene above:
- `WorkoutAvatar.js` — an animated three.js mannequin imported from
  `@react-three/fiber` / `@react-three/drei`'s **web** entry, so it threw on a
  real device (expo-gl needs `@react-three/fiber/native`). It loaded a remote
  `.gltf`, did procedural per-frame movement and live muscle highlighting.
- `WorkoutAvatar.web.js` — a "3D Avatar Disabled for Checking" stub that the
  Metro `.web.js` resolver served on web, so the crash only ever showed on
  native. Removing the three.js path removes the need for this split.
Replaced by a single cross-platform `components/WorkoutAvatar.js` — a 2D muscle
map built on `MuscleFigure` (react-native-svg), with no `.web`/`.native` split.
This was the app's **last** live `@react-three/*` / `three` / `expo-gl`
consumer; those deps are now prunable.
