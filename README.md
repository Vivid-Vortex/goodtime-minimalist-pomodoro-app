[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/LewpXfTpi3aS6boHLDYQoZ/4tBEiBM7ZB48VxfWj2qfHi/tree/dev.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/circleci/LewpXfTpi3aS6boHLDYQoZ/4tBEiBM7ZB48VxfWj2qfHi/tree/dev)

# Pomodoro Auto

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
Download `PomodoroAuto-*.apk` from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) and install.

### Web App (any browser, needs Node.js 18+)
```bash
# Download goodtime-pomodoro-desktop.zip from Releases (tagged web-v*)
node server.cjs          # opens http://localhost:3000
```

### Native Desktop (Windows / macOS / Linux, ~20–50 MB RAM)
Download the installer from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) (tagged `desktop-v*`). No Node, no browser required.

### Dev mode (React)
```bash
cd react_desktop && npm install && npm run dev
```

---

## Features

- **Timer** — countdown with configurable profiles (72/5, 90/5, 25/5, custom); auto-start break/work; dial gestures on Android
- **Labels** — tag focus sessions (W1M, ESS, LTG, …) to see where your time goes
- **Cloud sync** — manual push/pull to Firestore; multi-device with per-device history badges
- **Statistics** — overview cards, 14-day stacked bar chart, full session log; merges local + cloud data
- **Timer profiles** — stored locally and in Firestore (`global_notes/timer_profile`); unlimited profiles
- **Backup & restore** — SQLite export, CSV/JSON export, scheduled cloud push

---

## Releases

| Platform | Tag prefix | Asset |
|---|---|---|
| Android APK | `v*` | `PomodoroAuto-*.apk` |
| Web App zip | `web-v*` | `goodtime-pomodoro-desktop.zip` |
| Native desktop | `desktop-v*` | `.exe` / `.dmg` / `.AppImage` |

### Publish a release

```bash
# Android
git tag v3.2.0 && git push origin v3.2.0

# Web App
git tag web-v1.3.0 && git push origin web-v1.3.0

# Native desktop (builds Windows + macOS + Linux on CI)
git tag desktop-v1.1.0 && git push origin desktop-v1.1.0
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

## claude-auto-resume

This repo includes local docs for the claude-auto-resume utility under `/docs`:

- `docs/claude-auto-resume-readme.md` — installation and setup
- `docs/fix_Auto_Resume.md` — Windows-specific fixes applied locally

Original project: [github.com/terryso/claude-auto-resume](https://github.com/terryso/claude-auto-resume)
