[![Build and Release APK](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/actions/workflows/build-release.yml/badge.svg)](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/actions/workflows/build-release.yml)
[![Desktop Release](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/actions/workflows/desktop-release.yml/badge.svg)](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/actions/workflows/desktop-release.yml)

# Zen Mode

A minimalist productivity timer with Firestore cloud sync, label-based time tracking, and cross-device statistics. Fork of [Goodtime](https://github.com/adrcotfas/goodtime).

---

## Documentation

| | |
|---|---|
| **[User Guide](docs/USER_GUIDE.md)** | Install, timer basics, labels, profiles, cloud sync, statistics |
| **[Developer Guide](docs/DEVELOPER_GUIDE.md)** | Architecture, tech stack, first-time setup, data model, CI/CD |

---

## Quick Start

### Android
Download `ZenMode-*.apk` from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) and install.

### Native Desktop (Windows — Wails app, ~20–50 MB RAM)
Download `ZenMode-*.exe` from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) (tagged `desktop-v*`). No Node, no browser required.

### Web App (any browser, needs Node.js 18+)
```bash
cd react_desktop && npm install && npm run dev
```

---

## Features

- **Timer** — countdown with configurable profiles (72/5, 90/5, 25/5, custom); auto-start break/work; dial gestures on Android
- **Labels** — tag focus sessions (W1M, ESS, LTG, …) to see where your time goes
- **Cloud sync** — delta push to Firestore (only unsynced sessions); review modal before push; multi-device safe
- **Force sync** — overwrite cloud totals with local data when needed
- **Statistics** — overview cards, stacked bar chart with date range pickers, full session log; merges local + cloud data
- **Timer profiles** — stored locally and in Firestore (`global_notes/timer_profile`); unlimited profiles; immediate local apply on selection
- **Backup & restore** — SQLite export, scheduled cloud push
- **Desktop widget** — floating overlay for inconspicuous control

---

## Releases

| Platform | Tag prefix | Asset | Latest |
|---|---|---|---|
| Android APK | `v*` | `ZenMode-*.apk` | v3.1.7 |
| Native desktop (Windows) | `desktop-v*` | `ZenMode-*.exe` | desktop-v3.1.5 |

### Release a new version (auto-increment)

**Recommended — GitHub Actions (no manual tagging):**
1. GitHub → Actions → **Bump Version Tag** → Run workflow
2. Choose: `android`, `desktop`, or `both`
3. Choose: `patch`, `minor`, or `major`
4. The workflow creates the next tag and triggers the build automatically

**Manual tagging:**
```bash
# Android
git tag v3.1.8 && git push origin v3.1.8

# Desktop
git tag desktop-v3.1.6 && git push origin desktop-v3.1.6
```

GitHub Actions builds and attaches all assets automatically.

---

## Firestore Collections

| Collection | Document ID | Purpose |
|---|---|---|
| `timesheet_entries` | `dd-mm-yyyy` | Aggregated minutes per tag per date |
| `pomodoro_app_history` | `dd-mm-yyyy` | Raw session log with device name |
| `global_notes` | `timer_profile` | Timer profile definitions |

---

## Android — Keep it running

Android aggressively kills background apps. Set the app to **Unrestricted** battery usage, or follow your device's instructions at [dontkillmyapp.com](https://dontkillmyapp.com).

---

## Development

```bash
# Android
./gradlew :androidApp:assembleDebug

# Desktop (Wails — requires Go 1.22 + wails CLI)
cd desktop && wails dev          # hot-reload
cd desktop && wails build        # produces desktop/build/bin/ZenMode-*.exe

# React web (dev mode)
cd react_desktop && npm install && npm run dev
```
