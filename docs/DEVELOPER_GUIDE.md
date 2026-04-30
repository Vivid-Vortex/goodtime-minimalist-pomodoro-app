# Developer Guide — Pomodoro Auto

> First-time setup, full architecture, tech stack, data flow, and release process.

---

## Table of Contents

1. [Repository Overview](#1-repository-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [First-Time Setup — React Desktop App](#4-first-time-setup--react-desktop-app)
5. [First-Time Setup — Tauri Native App](#5-first-time-setup--tauri-native-app)
6. [First-Time Setup — Android App](#6-first-time-setup--android-app)
7. [Architecture Deep Dive](#7-architecture-deep-dive)
8. [Firestore Data Model](#8-firestore-data-model)
9. [Tag → Field Mapping](#9-tag--field-mapping)
10. [Key Files Reference](#10-key-files-reference)
11. [CI/CD Pipelines](#11-cicd-pipelines)
12. [Release Process](#12-release-process)
13. [Adding Features — Checklists](#13-adding-features--checklists)
14. [Authentication Setup](#14-authentication-setup)
15. [Firestore Security Rules](#15-firestore-security-rules)

---

## 1. Repository Overview

This is a monorepo containing three independent deliverables that share the same Firestore database:

| Directory | What it is |
|---|---|
| `androidApp/` | Android app (Kotlin, Jetpack Compose) |
| `shared/` | Kotlin Multiplatform shared business logic |
| `react_desktop/` | React web + Tauri native desktop app |
| `.github/workflows/` | CI/CD pipelines |
| `docs/` | User guide, developer guide |

The Android and desktop apps are fully independent build systems. You do **not** need Android Studio or a JDK to work on the React/Tauri desktop app, and vice versa.

---

## 2. Tech Stack

### React Desktop App (`react_desktop/`)

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 8 (Rolldown bundler) |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS v4 (CSS-first, `@theme {}` block — no config file) |
| State / server state | TanStack Query v5 (`useQuery` + `useMutation`) |
| Routing | React Router v7 |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | Recharts v3 |
| Icons | lucide-react |
| Cloud database | Firebase SDK v12 / Firestore |
| Production server | Zero-dependency Node.js CJS script (`server.cjs`) |
| Native wrapper | Tauri v2 (Rust + OS WebView) |

### Android App (`androidApp/`)

| Layer | Technology |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose + Material 3 |
| Architecture | MVVM + Kotlin Flows |
| Local storage | Room (SQLite) |
| DI | Koin |
| Cloud | Firebase Firestore Android SDK |
| Build | Gradle (Kotlin DSL) |
| Shared logic | Kotlin Multiplatform (`shared/` module) |

---

## 3. Project Structure

```
goodtime-minimalist-pomodoro-app/
├── androidApp/                  # Android-only source
│   └── src/
│       ├── google/              # Google Play flavor (billing, update manager)
│       ├── fdroid/              # F-Droid flavor (no billing)
│       └── main/
│           └── java/com/apps/adrcotfas/goodtime/
│               ├── main/        # Timer screen, navigation
│               ├── labels/      # Label management screens
│               ├── settings/    # Settings, backup, timer profiles
│               ├── stats/       # Statistics screens
│               └── bl/          # Business logic (TimerService, alarms)
│
├── shared/                      # Kotlin Multiplatform module
│   └── src/
│       ├── commonMain/          # Platform-agnostic domain models, use-cases
│       └── androidMain/         # Android-specific implementations
│
├── react_desktop/               # React + Tauri desktop app
│   ├── src/
│   │   ├── types/               # TypeScript interfaces (label, session, firestore, settings)
│   │   ├── lib/
│   │   │   ├── firestore.ts     # All Firestore read/write functions
│   │   │   ├── localStorage.ts  # Browser localStorage persistence
│   │   │   ├── tagMapping.ts    # TAG_TO_FIELD map + helpers
│   │   │   ├── dateUtils.ts     # dd-mm-yyyy parsing/formatting
│   │   │   └── timer.ts         # Core timer countdown logic
│   │   ├── queries/             # TanStack Query read hooks
│   │   ├── mutations/           # TanStack Query write hooks
│   │   ├── components/
│   │   │   ├── Timer/           # CircularProgress, LabelPicker, ProfileBadge
│   │   │   └── Labels/          # ColorPicker, LabelRow
│   │   ├── pages/               # TimerPage, LabelsPage, SettingsPage, StatisticsPage
│   │   ├── context/
│   │   │   └── TimerContext.tsx  # Global timer state (running, phase, label)
│   │   ├── firebase.ts          # Firebase app init + Firestore instance
│   │   ├── queryClient.ts       # TanStack QueryClient singleton
│   │   ├── queryKeys.ts         # Centralized query key definitions
│   │   ├── App.tsx              # Router + sidebar layout
│   │   └── main.tsx             # React entry point
│   │
│   ├── src-tauri/               # Tauri Rust backend
│   │   ├── src/
│   │   │   ├── lib.rs           # app() builder — plugins, window setup
│   │   │   └── main.rs          # Binary entry point
│   │   ├── tauri.conf.json      # Window config, build commands, app metadata
│   │   ├── Cargo.toml           # Rust dependencies
│   │   └── icons/               # App icons for all platforms
│   │
│   ├── scripts/
│   │   └── package.cjs          # Zip packager for web release
│   ├── server.cjs               # Zero-dependency Node HTTP server
│   ├── index.html               # Vite HTML entry
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript config
│   └── package.json
│
├── .github/workflows/
│   ├── build-release.yml        # Android APK release
│   ├── build-web-desktop.yml    # React web zip release
│   └── build-tauri.yml          # Tauri native installer release
│
├── docs/
│   ├── USER_GUIDE.md
│   └── DEVELOPER_GUIDE.md
│
├── version.properties           # Android VERSION_NAME / VERSION_CODE
├── google-services.json         # Firebase config (Android)
└── react_desktop/src/firebase.ts # Firebase config (web — inline)
```

---

## 4. First-Time Setup — React Desktop App

### Prerequisites

- **Node.js 20+** — download from [nodejs.org](https://nodejs.org) or via `winget install OpenJS.NodeJS`
- A code editor (VS Code recommended)
- Git

That's it. No Android SDK, no Rust, no Java needed.

### Clone and install

```bash
git clone https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app.git
cd goodtime-minimalist-pomodoro-app/react_desktop
npm install
```

### Run the dev server

```bash
npm run dev
# → http://localhost:5173 opens with hot-reload
```

Changes to any `.tsx`, `.ts`, or `.css` file reflect instantly in the browser.

### Build for production

```bash
npm run build
# Outputs to react_desktop/dist/
```

### Run the production build locally

```bash
npm run start     # build + serve at http://localhost:3000
# or if already built:
npm run serve     # serve existing dist/ at http://localhost:3000
```

### TypeScript check (no emit)

```bash
npx tsc --noEmit
```

### Lint

```bash
npm run lint
```

### Firebase config

Firebase credentials are hard-coded in `react_desktop/src/firebase.ts`. The project is already configured — no `.env` file or separate setup required. The Firestore security rules on the backend control access.

---

## 5. First-Time Setup — Tauri Native App

Tauri wraps the React app in a native desktop window using the OS's built-in webview (no bundled browser). This gives ~20–50 MB RAM vs ~150 MB for Node + Chrome.

### Prerequisites

**All platforms:**
- Node.js 20+ (same as above)
- **Rust** — install via [rustup.rs](https://rustup.rs)
  ```bash
  # Windows (PowerShell)
  winget install Rustlang.Rustup
  # then restart terminal
  rustup update stable
  ```

**Windows only:**
- WebView2 runtime — pre-installed on Windows 10/11. If missing: [download from Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- Visual Studio Build Tools with "Desktop development with C++" workload (for MSVC linker)

**Linux only:**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**macOS only:**
- Xcode Command Line Tools: `xcode-select --install`

### Run in dev mode

```bash
cd react_desktop
npm install
npm run tauri:dev
# Opens a native window with Vite hot-reload
```

The first `tauri:dev` compiles Rust dependencies — takes 5–10 min. Subsequent runs are fast.

### Build release installer

```bash
npm run tauri:build
```

Output locations:
- Windows: `src-tauri/target/release/bundle/nsis/*.exe`
- macOS: `src-tauri/target/release/bundle/dmg/*.dmg`
- Linux: `src-tauri/target/release/bundle/appimage/*.AppImage`

> **Tip:** For cross-platform installers, use the CI pipeline (see [§11](#11-cicd-pipelines)) — building Windows `.exe` on macOS or vice versa is not supported by Tauri.

---

## 6. First-Time Setup — Android App

### Prerequisites

- **JDK 17** — `winget install EclipseAdoptium.Temurin.17.JDK`
- **Android Studio** (Hedgehog or newer) — includes Android SDK and emulator
- Android SDK compile target: API 36
- `google-services.json` in `androidApp/` (already committed)

### Open in Android Studio

1. Open Android Studio → **Open** → select the repo root (not `androidApp/`)
2. Let Gradle sync complete (first sync downloads dependencies — 5–10 min)
3. Select the `androidApp` run configuration
4. Choose a device (emulator or physical via USB)
5. Click **Run**

### Build from command line

```bash
# Debug build
./gradlew :androidApp:assembleGoogleDebug

# Install on connected device
./gradlew :androidApp:installGoogleDebug

# Release APK
./gradlew :androidApp:assembleGoogleRelease
```

The APK lands in `androidApp/build/outputs/apk/google/release/`.

### Flavors

| Flavor | Description |
|---|---|
| `google` | Google Play flavor — includes billing and update manager |
| `fdroid` | F-Droid flavor — no billing, no proprietary SDKs |

All cloud sync code lives in `main/` and runs in both flavors.

---

## 7. Architecture Deep Dive

### React Desktop — Data Flow

```
User action
    │
    ▼
TanStack Query mutation  (react_desktop/src/mutations/)
    │  writes to
    ▼
localStorage             (react_desktop/src/lib/localStorage.ts)
    │  invalidates query key
    ▼
TanStack Query cache     (react_desktop/src/queryClient.ts)
    │  re-renders
    ▼
React component          (react_desktop/src/pages/ + components/)
```

**Cloud sync is always explicit (button-triggered):**

```
Push to cloud:
  usePushToCloud mutation
    → reads local sessions (gt_sessions)
    → groups by date, sums by tag
    → calls upsertTimesheetEntry() + pushAppHistoryEntry()
    → writes to Firestore

Refresh from cloud:
  useRefreshCloudStats mutation
    → getAllTimesheetEntries() from Firestore
    → converts TimesheetEntry[] → Session[]
    → saves to localStorage (gt_cloud_stats)
    → invalidates 'cloudStats' query key
    → StatisticsPage merges local + cloud sessions
```

### Timer State

`TimerContext.tsx` holds all running timer state: countdown value, current phase (focus/short break/long break), selected label, session counter. It is a React Context at the app root — all pages can read and dispatch to it.

When a session completes, `TimerContext` calls `appendSession()` from `localStorage.ts`, which appends to the `gt_sessions` array, then invalidates the `sessions` query key so Statistics updates.

### Android — Data Flow

```
User action (Compose UI)
    │
    ▼
ViewModel (Koin DI, Kotlin Flow)
    │  reads/writes
    ▼
Room database (SQLite, local)
    │  on "Save to cloud" button
    ▼
FirestoreRepository
    │  writes
    ▼
Firestore (timesheet_entries + pomodoro_app_history)
```

The Android app uses `TimerService` (a foreground service) to keep the timer running when the app is backgrounded. `AlarmManager` is used for exact-time alarms.

### Shared Module

`shared/` contains platform-agnostic domain models (`TimerProfile`, `Label`, `Session`) and business logic (timer state machine, profile validation). Android consumes this via a Gradle dependency. The React app has its own parallel TypeScript types in `react_desktop/src/types/`.

---

## 8. Firestore Data Model

### Collection: `timesheet_entries`

Document ID: `dd-mm-yyyy` (e.g. `29-10-2025`)

```json
{
  "id": "29-10-2025",
  "createdAt": 1730208645000,
  "formData": {
    "entryDate": 1730160000000,
    "tagSnapshot": {
      "work1Main": "W1M",
      "essentials": "ESS",
      "ltg": "LTG",
      "...": "..."
    },
    "work1Main": 180,
    "spentOnEssentials": 45,
    "ltgLongTermGoal": 90,
    "finance": 20,
    "others": 10,
    "avdhanaMode": 60,
    "work1ToWork4Ikigai": 120,
    "learning": 20,
    "meditation": 30,
    "exercise": 60,
    "..."
  }
}
```

All time fields (the numeric ones) are stored in **minutes** as integers. All other fields (`total`, `intoxNo`, etc.) are strings or booleans as specified in the CLAUDE.md template.

**Upsert logic:** if the document for today exists, `updateDoc` adds new minutes on top of existing; if it doesn't exist, a full default document is created (`buildDefaultFormData`) and the session minutes are applied.

### Collection: `pomodoro_app_history`

Document ID: `dd-mm-yyyy`

```json
{
  "id": "29-10-2025",
  "entries": [
    {
      "labelName": "W1M",
      "durationMinutes": 72,
      "deviceName": "Deepak-PC",
      "timestamp": 1730208645000
    }
  ]
}
```

This is an append-only log of raw sessions per device. Used to display history — never used for analytics totals.

### Collection: `global_notes`

Document ID: `timer_profile`

```json
{
  "profiles": [
    { "id": "72-5", "name": "72/5", "focusMinutes": 72, "breakMinutes": 5, "longBreakMinutes": 15, "longBreakInterval": 4, "autoStartBreak": false, "autoStartWork": false },
    { "id": "90-5", "name": "90/5", "focusMinutes": 90, "breakMinutes": 5, "longBreakMinutes": 20, "longBreakInterval": 4, "autoStartBreak": false, "autoStartWork": false },
    { "id": "25-5", "name": "25/5", "focusMinutes": 25, "breakMinutes": 5, "longBreakMinutes": 15, "longBreakInterval": 4, "autoStartBreak": false, "autoStartWork": false }
  ],
  "activeProfileId": "72-5"
}
```

---

## 9. Tag → Field Mapping

The central lookup table lives in `react_desktop/src/lib/tagMapping.ts`.

### How it works

Every Firestore document contains a `tagSnapshot` sub-object. The **values** of `tagSnapshot` are the tag abbreviations shown in the UI (e.g. `"W1M"`, `"ESS"`). The **keys** of `tagSnapshot` are the corresponding `formData` field names (e.g. `"work1Main"`, `"essentials"`).

To go from a UI label to a Firestore field:

```
User label "W1M"
  → TAG_TO_FIELD["W1M"]       = "work1Main"       (direct abbreviation → field)
  → formData["work1Main"]     = 180               (current stored minutes)
```

### Full mapping table

| UI Label | Abbreviation | `formData` field |
|---|---|---|
| Work 1 Main | W1M | `work1Main` |
| Essentials | ESS | `spentOnEssentials` |
| Long-term Goal | LTG | `ltgLongTermGoal` |
| Avdhana Mode | AV | `avdhanaMode` |
| Work 1–4 Ikigai | WCMN | `work1ToWork4Ikigai` |
| Work 3 Udemy | W3 | `work3Udemy` |
| Work 4 Tech | W4 | `work4TechWebsite` |
| Work 2 YouTube | W2 | `work2Youtube` |
| Work 5 Online | W5 | `work5OnlineSale` |
| Time Wasted | TW | `timeWasted` |
| Finance | FIN | `finance` |
| Others | OTH | `others` |
| Work 1 Misc | W1X | `work1Misc` |
| Project Mgmt | PM | `projectManagement` |
| Learning | LRN | `learning` |
| Meditation | MED | `meditation` |
| Exercise | EXE | `exercise` |

### Adding a new tag

1. Add to `DEFAULT_TAG_SNAPSHOT` in `tagMapping.ts`
2. Add to `TAG_TO_FIELD` in `tagMapping.ts`
3. Add to `NUMERIC_FIELDS` set in `tagMapping.ts`
4. Add the field with default `0` to `buildDefaultFormData()` in `firestore.ts`
5. Add the field to `TimesheetFormData` in `types/firestore.ts`
6. Mirror the change in the Android `FirestoreRepository` if needed

---

## 10. Key Files Reference

| File | Purpose |
|---|---|
| `react_desktop/src/firebase.ts` | Firebase app init; exports `db` (Firestore instance) |
| `react_desktop/src/queryClient.ts` | TanStack QueryClient singleton; used for imperative `invalidateQueries` outside React |
| `react_desktop/src/queryKeys.ts` | Single source of truth for all query key arrays |
| `react_desktop/src/lib/tagMapping.ts` | `TAG_TO_FIELD`, `DEFAULT_TAG_SNAPSHOT`, `NUMERIC_FIELDS`, `buildFieldPatch()` |
| `react_desktop/src/lib/firestore.ts` | `getTimesheetEntry`, `upsertTimesheetEntry`, `setTimesheetFields`, `getAllTimesheetEntries`, `pushAppHistoryEntry` |
| `react_desktop/src/lib/localStorage.ts` | All localStorage read/write; keys: `gt_labels`, `gt_sessions`, `gt_settings`, `gt_timer_profiles`, `gt_cloud_stats` |
| `react_desktop/src/lib/dateUtils.ts` | `toDateId(date)` → `"dd-mm-yyyy"`, `parseDateId(id)` → Unix ms |
| `react_desktop/src/context/TimerContext.tsx` | Timer state machine; dispatches session save on completion |
| `react_desktop/src/mutations/usePushToCloud.ts` | Aggregates local sessions → calls `upsertTimesheetEntry` + `pushAppHistoryEntry` |
| `react_desktop/src/mutations/useRefreshCloudStats.ts` | Fetches all Firestore timesheet entries → saves as `Session[]` to `gt_cloud_stats` |
| `react_desktop/src/pages/StatisticsPage.tsx` | Merges local + cloud sessions; "Refresh from Cloud" button |
| `react_desktop/server.cjs` | Zero-dependency Node HTTP server; `node server.cjs [port]` |
| `react_desktop/src-tauri/tauri.conf.json` | Window size, app identifier, build commands |
| `react_desktop/src-tauri/src/lib.rs` | Tauri app builder (plugins, setup) |
| `version.properties` | Android `VERSION_NAME` + `VERSION_CODE` |

---

## 11. CI/CD Pipelines

### Android APK (`build-release.yml`)

- **Trigger:** `git push origin v*` (e.g. `v3.1.0`)
- **What it does:** Auto-increments `VERSION_CODE`, builds `googleRelease` APK, publishes as GitHub Release with APK attached.

### Web Desktop Zip (`build-web-desktop.yml`)

- **Trigger:** `git push origin web-v*` (e.g. `web-v1.2.0`)
- **What it does:** `npm ci` → `npm run build` → zips `dist/` + `server.cjs` into `goodtime-pomodoro-desktop.zip` → attaches to GitHub Release.

### Tauri Native Installers (`build-tauri.yml`)

- **Trigger:** `git push origin desktop-v*` (e.g. `desktop-v1.0.0`)
- **What it does:** Runs 3 parallel jobs (Windows MSVC, macOS arm64, Ubuntu x86_64). Each installs Rust, installs platform deps, runs `npm ci`, then uses `tauri-apps/tauri-action@v0` to build and attach the installer to the release.
- **Outputs:** `.exe` (Windows NSIS), `.dmg` (macOS), `.AppImage` (Linux)

> All three pipelines create the GitHub Release automatically if it doesn't exist. You only need to push a tag.

---

## 12. Release Process

### Android

```bash
# Optional: bump version name in version.properties
# VERSION_NAME=3.2.0

git add version.properties
git commit -m "bump version to 3.2.0"
git push origin dev

git tag v3.2.0
git push origin v3.2.0
# CI builds and publishes the APK automatically
```

### Web Desktop (React zip)

```bash
git tag web-v1.3.0
git push origin web-v1.3.0
# CI builds goodtime-pomodoro-desktop.zip and publishes it
```

### Tauri Native Desktop

```bash
git tag desktop-v1.1.0
git push origin desktop-v1.1.0
# CI builds .exe, .dmg, .AppImage and publishes them
```

All three release types can coexist on the same commit — each uses a different tag prefix.

---

## 13. Adding Features — Checklists

### Add a new Firestore time-tracking field

- [ ] `tagMapping.ts` — add to `TAG_TO_FIELD` and `NUMERIC_FIELDS`
- [ ] `tagMapping.ts` — add to `DEFAULT_TAG_SNAPSHOT`
- [ ] `firestore.ts` — add to `buildDefaultFormData()` with value `0`
- [ ] `types/firestore.ts` — add field to `TimesheetFormData` interface
- [ ] If surfaced in Android: update `FirestoreRepository.kt`

### Add a new Settings field

- [ ] `types/settings.ts` — add to `AppSettings` interface + `DEFAULT_SETTINGS`
- [ ] `lib/localStorage.ts` — no change needed (serializes whole object)
- [ ] `mutations/useSaveSettings.ts` — include new field in mutation
- [ ] `pages/SettingsPage.tsx` — add UI control

### Add a new screen / page

- [ ] Create `src/pages/NewPage.tsx`
- [ ] Add route in `App.tsx`
- [ ] Add sidebar link in `App.tsx` sidebar nav

### Add a new TanStack Query hook

- [ ] Add query key to `queryKeys.ts`
- [ ] Create `src/queries/useNewThing.ts` (for reads)
  or `src/mutations/useNewAction.ts` (for writes)
- [ ] In the mutation's `onSuccess`, call `queryClient.invalidateQueries({ queryKey: queryKeys.newThing.all })`

---

## 14. Authentication Setup

The app uses **Firebase Authentication with Google Sign-In** across all platforms. Sessions are persisted automatically by the Firebase SDK — users stay signed in permanently across restarts.

### How it works

| Platform | Sign-in method | Session storage |
|---|---|---|
| Web (browser) | `signInWithPopup` | Firebase SDK → browser IndexedDB |
| Tauri (native) | `signInWithPopup` | Firebase SDK → app data directory |
| Android | `GoogleSignIn` activity → `signInWithCredential` | Firebase SDK → app secure storage |

On every app launch the Firebase SDK checks for a stored credential silently. If found the user goes straight to the app; if not, the login screen is shown.

### Web / Tauri — no setup required

Firebase Auth is wired up in `react_desktop/src/firebase.ts` and `react_desktop/src/hooks/useAuth.ts`. No additional configuration is needed — it works out of the box once Google Sign-In is enabled in the Firebase Console (see below).

### Android — one-time setup required

Google Sign-In on Android requires your app's signing certificate SHA-1 to be registered in Firebase. Without this, the Google sign-in dialog will fail silently.

**Step 1 — Enable Google Sign-In in Firebase Console**

1. Open [Firebase Console](https://console.firebase.google.com) → select the `timesheetkotlin` project
2. Authentication → Sign-in method → Google → toggle **Enable** → Save

**Step 2 — Get your debug SHA-1 fingerprint**

```bash
./gradlew :androidApp:signingReport
```

Look for the `debug` variant in the output:

```
Variant: debug
Config: debug
Store: .../.android/debug.keystore
Alias: AndroidDebugKey
MD5:  XX:XX:...
SHA1: AA:BB:CC:DD:...   ← copy this
SHA-256: ...
```

**Step 3 — Register the SHA-1 in Firebase**

1. Firebase Console → Project Settings (gear icon) → Your apps → Android app (`com.apps.adrcotfas.goodtime`)
2. Click **Add fingerprint** → paste the SHA-1 → Save
3. Click **Download google-services.json** and replace `androidApp/google-services.json` in the repo

> The Gradle Google Services plugin reads `google-services.json` and auto-generates `R.string.default_web_client_id`, which `LoginScreen.kt` uses to initialise the `GoogleSignInOptions`. If the file is stale or missing the web client entry, sign-in will crash.

**Step 4 — For release builds**

Release APKs use a different signing key than the debug keystore. Get the release SHA-1 with:

```bash
keytool -list -v -keystore your-release.keystore -alias your-alias
```

Register that SHA-1 in Firebase the same way. Both debug and release fingerprints can be registered simultaneously.

### Relevant source files

| File | Purpose |
|---|---|
| `react_desktop/src/firebase.ts` | Exports `auth` + `googleProvider` |
| `react_desktop/src/hooks/useAuth.ts` | `onAuthStateChanged` hook — `{ user, loading }` |
| `react_desktop/src/pages/LoginPage.tsx` | Web/Tauri login screen |
| `react_desktop/src/App.tsx` | Auth gate — spinner → login → app |
| `androidApp/src/main/java/.../auth/LoginScreen.kt` | Android Compose login screen |
| `androidApp/src/main/java/.../main/Destination.kt` | `LoginDest` route |
| `androidApp/src/main/java/.../MainActivity.kt` | Start destination picks `LoginDest` when `currentUser == null` |

---

## 15. Firestore Security Rules

### Current state (open — for testing)

During development and initial testing the Firestore rules are intentionally left open so auth can be verified without the rules blocking requests:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

This means anyone who finds the Firebase config in the public repo can read or write the database. **Change the rules once auth is confirmed working** (see below).

### Why the Firebase config being public is acceptable

The `apiKey` in `firebase.ts` and `google-services.json` is a **project identifier**, not an authentication credential. Google explicitly designs it to be public. The real security boundary is the Firestore Security Rules, not the key.

### Tighten rules after testing

Once you have confirmed that sign-in works on all platforms (web, Tauri, Android), go to:

**Firebase Console → Firestore Database → Rules**

Replace the current rule with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish**. From this point any request without a valid Firebase Auth token is rejected — the config being public no longer poses a risk.

### Lock to a specific account (optional, stricter)

If this is a single-user personal app, you can lock the database to only your Google account:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.token.email == "your-email@gmail.com";
    }
  }
}
```

This rejects any other Google account even if they somehow obtain the config and sign in.

### Rules do not require a code change or redeploy

Firestore Security Rules are evaluated server-side. Updating them in the Firebase Console takes effect immediately for all clients — no app update needed.
