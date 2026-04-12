# Desktop App Plan — Goodtime Pomodoro (Wails + Go + React + Tailwind)

Cross-platform desktop app mirroring the Android Goodtime Pomodoro app.
**Stack:** Go · Wails v2 · React · TypeScript · Tailwind CSS · SQLite · Firebase/Firestore

---

## Prerequisites (one-time setup — not a commit)

- [ ] Install Go 1.21+ → https://go.dev/dl/
- [ ] Install Wails v2 → `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- [ ] Node.js 18+ already installed ✅
- [ ] Verify: `wails doctor`

---

## Commits / Steps

### Step 1 — Project Scaffold & Foundation
**Commit:** `feat(desktop): initialize Wails project with Go + React + Tailwind CSS`

- [ ] `desktop/` directory created at repo root
- [ ] Go module: `github.com/adrcotfas/goodtime/desktop`
- [ ] Wails v2 project initialised (React + TypeScript template)
- [ ] Tailwind CSS + PostCSS configured
- [ ] Basic navigation shell: Timer / Statistics / Labels / Settings tabs
- [ ] App icon matches Android (pink-violet tint)
- [ ] `wails build` succeeds for host platform

---

### Step 2 — Local Data Layer (Go + SQLite)
**Commit:** `feat(desktop): add SQLite data layer with Session, Label and TimerProfile models`

- [ ] `internal/database/` package — SQLite via `modernc.org/sqlite` (pure-Go, no CGO)
- [ ] Models: `Session`, `Label`, `TimerProfile`, `AppSettings`
- [ ] Repository interfaces + SQLite implementations
  - `SessionRepository` — CRUD, filter by label/date
  - `LabelRepository` — CRUD, reorder
  - `TimerProfileRepository` — CRUD
  - `SettingsRepository` — single-row key-value store
- [ ] Database migrations via embedded SQL files
- [ ] **Unit tests** for every repository method (100 % coverage)

---

### Step 3 — Timer Engine (Go)
**Commit:** `feat(desktop): implement Pomodoro timer engine with work/break/long-break logic`

- [ ] `internal/timer/` package
- [ ] `TimerState`: RESET · RUNNING · PAUSED · FINISHED
- [ ] `TimerType`: FOCUS · BREAK · LONG_BREAK
- [ ] `TimerEngine` struct
  - Start / Pause / Resume / Stop / Skip
  - Count-down mode (fixed duration)
  - Count-up mode (work:break ratio)
  - Auto-start work/break toggle
  - Long-break after N sessions
  - Break-budget accumulation (count-up mode)
- [ ] Wails event emission each second (`runtime.EventsEmit`)
- [ ] Persists completed sessions to `SessionRepository`
- [ ] **Unit tests** — all state transitions, edge cases, long-break trigger

---

### Step 4 — Timer UI (React + Tailwind)
**Commit:** `feat(desktop): build timer screen UI mirroring Android layout`

- [ ] `frontend/src/pages/TimerPage.tsx`
- [ ] Circular progress ring (SVG) matching Android style
- [ ] Countdown / count-up display (MM:SS)
- [ ] Start · Pause · Stop · Skip buttons
- [ ] Label selector dropdown
- [ ] Current session info (type badge: Focus / Break / Long Break)
- [ ] Wails event listener updates display in real-time
- [ ] Responsive layout; dark-mode support (matches Android theme)
- [ ] **Component tests** (Vitest + React Testing Library)

---

### Step 5 — Labels Management
**Commit:** `feat(desktop): add label management with color picker and per-label timer profiles`

- [ ] Go API: `GetLabels`, `CreateLabel`, `UpdateLabel`, `DeleteLabel`, `ReorderLabels`
- [ ] `frontend/src/pages/LabelsPage.tsx`
  - List view with color swatches
  - Create / Edit modal (name, color, timer profile override)
  - Drag-to-reorder
  - Archive / unarchive
- [ ] 24-color palette matching Android palette
- [ ] **Unit tests** (Go service + React components)

---

### Step 6 — Session History (Local Data)
**Commit:** `feat(desktop): add session history list with edit and delete support`

- [ ] Go API: `GetSessions`, `UpdateSession`, `DeleteSessions`, `BulkEditLabel`
- [ ] `frontend/src/pages/LocalDataPage.tsx`
  - Paginated session list (date · label · duration · notes)
  - Multi-select for bulk delete / bulk label edit
  - Inline edit dialog
- [ ] Date-range filter + label filter
- [ ] **Unit tests** (Go service + React components)

---

### Step 7 — Statistics & Analytics
**Commit:** `feat(desktop): add statistics screen with overview, timeline and app history tabs`

- [ ] Go API: `GetStatisticsSummary`, `GetTimelineData`, `GetAppHistory`
- [ ] `frontend/src/pages/StatisticsPage.tsx` with three tabs:
  - **Overview** — Today / Week / Month / Total, per-label breakdown, pie chart (Recharts)
  - **Timeline** — Aggregated sessions per date+label, bar/line chart, label filter
  - **App History** — Raw session list from all devices, device-name badge
- [ ] Productive hours heatmap
- [ ] **Unit tests**

---

### Step 8 — Settings
**Commit:** `feat(desktop): add settings screen with timer profiles and preferences`

- [ ] Go API: `GetSettings`, `UpdateSettings`, `GetTimerProfiles`, `SaveTimerProfile`, `DeleteTimerProfile`
- [ ] `frontend/src/pages/SettingsPage.tsx`
  - **Timer Profiles** — create/rename/delete profiles, set as default
  - **Notifications** — desktop notifications (OS native via Wails)
  - **Theme** — light / dark / system
  - **Sounds** — work-finished / break-finished audio (embedded)
  - **Backup** — local file backup (export/import JSON)
- [ ] **Unit tests**

---

### Step 9 — Firestore Cloud Sync
**Commit:** `feat(desktop): integrate Firestore cloud sync matching Android data model`

- [ ] `internal/sync/` package using `cloud.google.com/go/firestore`
- [ ] Reads `google-services.json` (or equivalent service-account credentials)
- [ ] Sync strategy matching Android:
  - `timesheet_entries` — aggregate minutes per tag per date
  - `pomodoro_app_history` — raw sessions with device name
- [ ] `SyncHandler.Push()` — compute diff, update cloud doc
- [ ] `SyncHandler.Pull()` — fetch cloud timeline + app history
- [ ] UI: "Save to Cloud" button in Settings · Backup section
- [ ] **Unit tests** using Firestore emulator or mock client

---

### Step 10 — Windows Build & Packaging
**Commit:** `feat(desktop/windows): add Windows build config, NSIS installer and CI job`

- [ ] `desktop/build/windows/` — app icon (.ico), NSIS installer script
- [ ] `wails.json` Windows-specific metadata (ProductName, FileDescription, etc.)
- [ ] Cross-compile instructions documented
- [ ] `.github/workflows/desktop-windows.yml` — builds on `windows-latest` runner, uploads `.exe` artifact
- [ ] All existing Go tests pass on Windows runner
- [ ] README section: Windows installation

---

### Step 11 — macOS Build & Packaging
**Commit:** `feat(desktop/macos): add macOS build config, app bundle and CI job`

- [ ] `desktop/build/darwin/` — app icon (.icns), Info.plist overrides
- [ ] `wails.json` macOS-specific metadata (LSApplicationCategoryType, NSHumanReadableCopyright)
- [ ] Code-signing notes in README (ad-hoc for dev, notarize for distribution)
- [ ] `.github/workflows/desktop-macos.yml` — builds on `macos-latest` runner, uploads `.app.zip` artifact
- [ ] All existing Go tests pass on macOS runner
- [ ] README section: macOS installation

---

## Architecture Overview

```
desktop/
├── main.go                     # Wails entry point
├── app.go                      # Wails app struct — Go→JS API surface
├── wails.json                  # Wails project config
├── go.mod / go.sum
├── build/
│   ├── windows/                # icon.ico, NSIS installer
│   └── darwin/                 # icon.icns, Info.plist
├── internal/
│   ├── database/               # SQLite models + repositories
│   ├── timer/                  # Timer engine
│   ├── labels/                 # Label service
│   ├── sessions/               # Session service
│   ├── settings/               # Settings service
│   └── sync/                   # Firestore sync handler
└── frontend/
    ├── src/
    │   ├── components/         # Reusable UI atoms
    │   ├── pages/              # Full-screen pages
    │   ├── hooks/              # Custom React hooks
    │   ├── stores/             # Zustand state stores
    │   └── types/              # TypeScript types mirroring Go models
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

## UI Design Principles

- Color palette: Pink-to-violet gradient (matching updated Android icon)
- Dark mode by default (matches Android Goodtime dark theme)
- Minimal chrome — timer is the hero element
- System font stack
- Smooth transitions via Tailwind `transition-*` utilities

## Progress Tracker

| Step | Status | Commit |
|------|--------|--------|
| Prerequisites | ⚠️ Manual | Install Go + Wails (see below) |
| 1 — Scaffold | ✅ Done | `70cbc7f6` |
| 2 — Data Layer | ✅ Done | `70cbc7f6` |
| 3 — Timer Engine | ✅ Done | `70cbc7f6` |
| 4 — Timer UI | ✅ Done | `e56dc2b7` |
| 5 — Labels | ✅ Done | `e56dc2b7` |
| 6 — Session History | ✅ Done | `e56dc2b7` |
| 7 — Statistics | ✅ Done | `e56dc2b7` |
| 8 — Settings | ✅ Done | `e56dc2b7` |
| 9 — Firestore Sync | ✅ Done | pending commit |
| 10 — Windows Build | ✅ Done | `8e77a645` |
| 11 — macOS Build | ✅ Done | `8e77a645` |

## To run locally (after installing Go + Wails)

```bash
# 1. Install prerequisites
winget install GoLang.Go          # or https://go.dev/dl/
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 2. Dev mode (hot-reload)
cd desktop
wails dev

# 3. Production build (Windows)
wails build -platform windows/amd64

# 4. Run Go backend tests only (no Wails needed)
go test ./internal/... -v

# 5. Run frontend tests only (Node only)
cd frontend && npm test
```
