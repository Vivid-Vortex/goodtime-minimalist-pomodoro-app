[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/LewpXfTpi3aS6boHLDYQoZ/4tBEiBM7ZB48VxfWj2qfHi/tree/dev.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/circleci/LewpXfTpi3aS6boHLDYQoZ/4tBEiBM7ZB48VxfWj2qfHi/tree/dev) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/goodtime/localized.svg)](https://crowdin.com/project/goodtime)

# Pomodoro Auto (fork of Goodtime)

A minimalist but powerful productivity timer designed to keep you focused and free of distractions —
extended with Firestore cloud sync, detailed timesheet tracking, and personal productivity analytics.

---

## Releases & Downloads

APKs are built automatically via GitHub Actions and published as GitHub Releases.

**To download the latest APK:**
1. Go to the **Releases** tab of this repository
2. Download `PomodoroAuto-<version>-build<N>.apk`
3. Enable **Install from unknown sources** on your device and install

**To publish a new release:**
```bash
# 1. Edit version.properties at the project root (optional — only needed for version name changes)
#    VERSION_NAME=3.1.0   ← change for major/minor bumps
#    VERSION_CODE=345     ← leave this, CI auto-increments it

# 2. Push a version tag — this triggers the GitHub Actions build
git tag v3.1.0
git push origin dev
git push origin v3.1.0
```

GitHub Actions will:
- Auto-increment `VERSION_CODE`
- Build the `googleRelease` APK
- Create a GitHub Release with the APK attached for direct download

> **Version file:** `version.properties` (project root) — edit `VERSION_NAME` here for major/minor bumps.

---

## Features

### Timer
- Minimalist countdown / count-up timer with configurable profiles (72/5, 90/5, 25/5, custom)
- **Auto start break toggle** — small pill button on the timer screen to enable/disable automatic break start after a focus session
- Dial control gestures: swipe left/right to skip, swipe up to add 1 min, swipe down to reset

### Cloud Sync (Firestore)
- **Save to cloud** — manually push session data to Firestore under `timesheet_entries` and `pomodoro_app_history` collections
- **Auto push at midnight** — enable under Settings → Backup and restore; automatically completes any active timer session and pushes all data to cloud at 12:00 AM daily
- Multi-device support: each device writes its history with a device name badge; Timeline aggregates data intelligently across devices

### Statistics
- **Overview** — productivity summary based on combined timeline data
- **Combined App History** — full session log pulled from cloud (read-only, refresh on demand)
- **Combined Timeline** — aggregated minutes per tag per date, used for graphs and analytics
- Local device sections: App History and Timeline for current device

### Backup & Restore
- Export/import local SQLite backup
- Export CSV / JSON
- Auto local backup (configurable path)
- Auto cloud backup to Firestore (daily at midnight)

### Timer Profiles
- Profiles stored locally and in Firestore (`global_notes/timer_profile`)
- Default profiles: 72/5 (default), 90/5, 25/5
- User can add/rename/delete profiles; changes saved to cloud

---

## Firestore Data Structure

### `timesheet_entries/<dd-mm-yyyy>`
Aggregated work minutes per tag per date. Updated on every cloud push.

### `pomodoro_app_history/<dd-mm-yyyy>`
Raw session entries per device. Each entry includes tag, duration (minutes), device name, and timestamp.

### `global_notes/timer_profile`
Timer profile definitions (focus duration, break duration, name).

---

## Developer Guide

For a full technical reference — including what files to touch when adding a field, form, screen, label, or setting, plus an AI agent prompt template — see:

**[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)**

Covers:
- Complete data flow (Room → ViewModel → Compose → Firestore)
- tagSnapshot → formData mapping logic
- Per-change checklists (settings, Room columns, Firestore fields, new screens)
- File map of the entire codebase
- Agent prompt template for AI-assisted development

---

## Web Desktop App (React)

A standalone web build lives in `react_desktop/`. It runs in any browser and can be served locally with plain Node.js — **no Android device or JDK required**.

### Run locally (dev mode)

```bash
cd react_desktop
npm install
npm run dev          # opens http://localhost:5173
```

### Run locally (production build)

```bash
cd react_desktop
npm run start        # builds + serves at http://localhost:3000
# or, if already built:
npm run serve        # serves existing dist/ at http://localhost:3000
# custom port:
node server.cjs 8080
```

### Download a pre-built release

Pre-built zips are attached to GitHub Releases tagged `web-v*`.

1. Go to the **Releases** tab → find a release tagged `web-v*`
2. Download `goodtime-pomodoro-desktop.zip`
3. Unzip, then:
   ```bash
   node server.cjs          # opens http://localhost:3000 in your browser
   ```
   Only Node.js 18+ required — no extra dependencies.

### Publish a new web release

```bash
# Bump version if needed, then:
git tag web-v1.0.0
git push origin web-v1.0.0
```

GitHub Actions (`.github/workflows/build-web-desktop.yml`) will:
- Build the React app
- Zip `dist/ + server.cjs` into `goodtime-pomodoro-desktop.zip`
- Attach it to a GitHub Release automatically

### Create a local zip package

```bash
cd react_desktop
npm run package      # outputs goodtime-pomodoro-desktop.zip one level up
```

---

## Building Locally (Android)

Requirements: JDK 17, Android SDK (compile SDK 36)

```bash
# Debug build
./gradlew :androidApp:assembleGoogleDebug

# Install on connected device/emulator
./gradlew :androidApp:installGoogleDebug

# Release build (uses debug signing key by default)
./gradlew :androidApp:assembleGoogleRelease
```

---

## Trouble with the app getting killed by Android?

Different phone [OEMs](https://en.wikipedia.org/wiki/Original_equipment_manufacturer) have an aggressive approach to background apps to save battery.
Disable battery optimization for this app to ensure accurate alarms and midnight cloud push.

Read more: [www.dontkillmyapp.com](https://dontkillmyapp.com/)

---

## claude-auto-resume plugin docs

This repository includes documentation for integrating the claude-auto-resume utility (third-party) into your workflow. The docs are stored under /docs:

- docs/claude-auto-resume-readme.md — upstream README (adapted) with installation and quick setup steps
- docs/fix_Auto_Resume.md — session "cheat-sheet" containing the exact commands and PowerShell function replacements applied locally to fix Windows-specific issues

Follow docs/claude-auto-resume-readme.md for a step-by-step install and testing guide. If you applied local fixes (Windows), see docs/fix_Auto_Resume.md for the exact edits and commands used.

Note: These docs are informational only — the claude-auto-resume tool is a third-party project. See the original project at: https://github.com/terryso/claude-auto-resume
