# User Guide — Pomodoro Auto

> A minimalist productivity timer with Firestore cloud sync, label-based time tracking, and cross-device statistics.

---

## Table of Contents

1. [Choose Your Platform](#1-choose-your-platform)
2. [Android App](#2-android-app)
3. [Web Desktop App](#3-web-desktop-app)
4. [Native Desktop App (Tauri)](#4-native-desktop-app-tauri)
5. [Timer Basics](#5-timer-basics)
6. [Labels](#6-labels)
7. [Timer Profiles](#7-timer-profiles)
8. [Cloud Sync](#8-cloud-sync)
9. [Statistics](#9-statistics)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Choose Your Platform

| Platform | Best for | Download |
|---|---|---|
| **Android APK** | Phone / tablet | [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) → `PomodoroAuto-*.apk` |
| **Web App** | Any browser, low-friction | [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) → `goodtime-pomodoro-desktop.zip` |
| **Native Desktop** | Windows / macOS / Linux, least RAM | [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) → `desktop-v*` |

All platforms share the same Firestore database — data syncs across devices when you push/pull.

---

## 2. Android App

### Install
1. Go to **Releases** → download `PomodoroAuto-<version>-build<N>.apk`
2. On your device: **Settings → Install unknown apps** → enable for your browser
3. Open the downloaded APK and install

### Keep it running
Android aggressively kills background apps. To prevent the timer from stopping:
- **Settings → Battery → App battery usage** → find Pomodoro Auto → set to **Unrestricted**
- Or follow device-specific instructions at [dontkillmyapp.com](https://dontkillmyapp.com)

---

## 3. Web Desktop App

### Option A — Download and run (no install)
1. Download `goodtime-pomodoro-desktop.zip` from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) (tagged `web-v*`)
2. Unzip anywhere
3. Run:
   ```bash
   node server.cjs
   ```
4. Opens at **http://localhost:3000** — your browser launches automatically

**Requires:** Node.js 18+ only. No other dependencies.

### Option B — Install as PWA (feels like a native app)
1. Open the app in Chrome
2. Click the **install icon** (⊕) in the address bar, or Chrome menu → **Install Pomodoro Auto**
3. The app opens in its own window — no browser chrome, no tabs

### Custom port
```bash
node server.cjs 8080    # runs at http://localhost:8080
```

---

## 4. Native Desktop App (Tauri)

Uses Windows' built-in WebView2 / macOS WKWebView — no browser bundled.

| | Web App | Tauri App |
|---|---|---|
| RAM | ~150 MB (Node + browser) | ~20–50 MB |
| Requires Node | Yes | No |
| Requires browser | Yes | No |

### Install
1. Download from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) (tagged `desktop-v*`)
   - Windows: `.exe` installer
   - macOS: `.dmg` — open and drag to Applications
   - Linux: `.AppImage` — make executable (`chmod +x`) and run
2. Launch like any desktop app

---

## 5. Timer Basics

### Starting a session
1. Select a **label** (e.g. W1M, ESS) from the label picker — this tags your focus time
2. Press **Start** (or Space bar on desktop)
3. The timer counts down for the focus duration defined by your active profile

### Controls (keyboard shortcuts — desktop)
| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `Esc` | Stop (saves session) |
| `N` | Skip to next phase |

### Session flow
Focus → Short Break → Focus → Short Break → Focus → Short Break → Focus → **Long Break** → repeat

The bottom-right counter tracks completed focus sessions. Tap/click it to reset.

### No label selected?
You'll see a warning before the timer starts. You can:
- Pick a label and start
- Continue without a label (saved under **OTH**)

---

## 6. Labels

Labels tag your focus time so you can see where your hours go in Statistics.

### Creating a label
1. Go to **Labels** page
2. Tap **New Label**, type a name (e.g. `W1M`, `ESS`, `LRN`)
3. Pick a colour and tap **Create**

### Reordering
Drag the grip handle (⠿) to reorder labels — the order is reflected in the timer picker.

### Built-in tag abbreviations
These map to Firestore fields when you sync to cloud:

| Label | Abbreviation | Cloud field |
|---|---|---|
| Work 1 Main | W1M | `work1Main` |
| Essentials | ESS | `spentOnEssentials` |
| Finance | FIN | `finance` |
| Learning | LRN | `learning` |
| Meditation | MED | `meditation` |
| Exercise | EXE | `exercise` |
| Long-term Goal | LTG | `ltgLongTermGoal` |
| Others | OTH | `others` |

---

## 7. Timer Profiles

Profiles let you switch between different focus/break durations.

### Default profiles
- **72/5** — 72 min focus, 5 min break (default)
- **90/5** — 90 min focus, 5 min break
- **25/5** — classic Pomodoro

### Switching profiles
**Settings → Timer Profiles** → tap **Use** next to the profile you want.

### Editing a profile
1. Tap the chevron (›) to expand a profile
2. Adjust focus, short break, long break duration, and long break interval
3. Toggle **Auto-start break** / **Auto-start work**
4. Tap **Save**

### Creating a profile
Tap **+ New Profile** at the bottom of the list, enter a name, and save.

---

## 8. Cloud Sync

All data is saved **locally first**. Cloud sync is manual — you push when ready.

### Push to cloud
**Settings → Cloud Sync → Save to Cloud**

This sends all local session data to Firestore under:
- `timesheet_entries/<dd-mm-yyyy>` — aggregated minutes per tag per date
- `pomodoro_app_history/<dd-mm-yyyy>` — raw session log with device name

### Pull from cloud (Statistics)
**Statistics → Refresh from Cloud**

Downloads all `timesheet_entries` documents and merges them with your local sessions. The result persists across restarts — you only need to refresh when you want fresh cloud data.

### Multi-device
Each device that runs the app writes its history with its own device name badge. The cloud aggregates totals — if two devices recorded W1M time on the same date, their minutes are added together when pushed.

---

## 9. Statistics

### Overview tab
Stat cards showing today, this week, this month, and all-time focus minutes. Pie chart shows breakdown by label. Combines local + cloud data.

> Press **Refresh from Cloud** in the header if the Overview is empty — it needs cloud data loaded at least once.

### Timeline tab
Stacked bar chart of the last 14 days, grouped by label. Uses the merged local + cloud dataset.

### History tab
Reverse-chronological log of every session. Cloud-sourced entries are badged **cloud** in purple.

---

## 10. Troubleshooting

**Timer stops when I lock my phone**
→ Disable battery optimisation for the app. See [dontkillmyapp.com](https://dontkillmyapp.com).

**Statistics shows no data**
→ Press **Refresh from Cloud** in the Statistics header.

**"No tag found" error when saving to cloud**
→ Your label name doesn't match any known tag abbreviation. Create a label using one of the standard abbreviations (W1M, ESS, LRN, etc.).

**Web app port already in use**
→ Run `node server.cjs 3001` to use a different port.

**Tauri app won't open on Windows**
→ Ensure WebView2 runtime is installed. Download from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
