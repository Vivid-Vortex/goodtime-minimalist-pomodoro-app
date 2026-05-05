# User Guide — Zen Mode

> Zen Mode — a minimalist productivity timer with Firestore cloud sync, label-based time tracking, and cross-device statistics.

---

## Table of Contents

1. [Choose Your Platform](#1-choose-your-platform)
2. [Android App](#2-android-app)
3. [Native Desktop App (Wails)](#3-native-desktop-app-wails)
4. [Web App](#4-web-app)
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
| **Android APK** | Phone / tablet | [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) → `ZenMode-*.apk` |
| **Native Desktop** | Windows, low RAM (~20–50 MB) | [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) → `ZenMode-*.exe` |
| **Web App** | Any browser, no install | `cd react_desktop && npm run dev` |

All platforms share the same Firestore database — data syncs across devices when you push/pull.

---

## 2. Android App

### Install
1. Go to **Releases** → download `ZenMode-<version>-build<N>.apk`
2. On your device: **Settings → Install unknown apps** → enable for your browser
3. Open the downloaded APK and install

### Keep it running
Android aggressively kills background apps. To prevent the timer from stopping:
- **Settings → Battery → App battery usage** → find Zen Mode → set to **Unrestricted**
- Or follow device-specific instructions at [dontkillmyapp.com](https://dontkillmyapp.com)

---

## 3. Native Desktop App (Wails)

Uses Windows' built-in **WebView2** runtime — no browser bundled, no Node required.

| | Web App | Desktop App |
|---|---|---|
| RAM | ~150 MB (browser) | ~20–50 MB |
| Requires Node | Yes | No |
| Requires browser | Yes | No |

### Install
1. Download `ZenMode-<version>.exe` from [Releases](https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app/releases) (tagged `desktop-v*`)
2. Run the `.exe` — no installer needed
3. Windows may show a SmartScreen warning → click **More info → Run anyway**

---

## 4. Web App

### Run locally
```bash
cd react_desktop
npm install
npm run dev      # opens http://localhost:5173
```

### Install as PWA (feels like a native app)
1. Open the app in Chrome
2. Click the **install icon** (⊕) in the address bar, or Chrome menu → **Install Zen Mode**
3. The app opens in its own window

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
**Settings → Timer Profiles** → tap the profile you want. It applies immediately to the local timer without requiring a cloud save.

### Editing a profile
1. Tap the chevron (›) to expand a profile
2. Adjust focus, short break, long break duration, and long break interval
3. Toggle **Auto-start break** / **Auto-start work**
4. Tap **Save** — saves locally and syncs to Firestore

### Creating a profile
Tap **+ New Profile** at the bottom of the list, enter a name, and save.

---

## 8. Cloud Sync

All data is saved **locally first**. Cloud sync is manual — you push when ready.

### Push to cloud (Android)
**Settings → Cloud Sync → Save to Cloud**

Sends all unsynced session data to Firestore:
- `timesheet_entries/<dd-mm-yyyy>` — aggregated minutes per tag per date (additive — adds to existing cloud values)
- `pomodoro_app_history/<dd-mm-yyyy>` — raw session log with device name

### Review before push (desktop)
The desktop app shows a **Review & Push** modal before sending data. You can uncheck, edit, or delete individual sessions before they go to cloud.

### Force sync
**Statistics → Force Sync** — overwrites cloud values with your current local totals. Use this to correct cloud data that got out of sync.

### Pull from cloud (Statistics)
**Statistics → Refresh from Cloud**

Downloads all `timesheet_entries` documents and merges them with your local sessions. The result persists across restarts — you only need to refresh when you want fresh cloud data.

### Multi-device
Each device writes its history with its own device name badge. The cloud stores additive totals — if two devices recorded W1M time on the same date, their minutes are merged when pushed.

---

## 9. Statistics

### Overview tab
Stat cards showing today, this week, this month, and all-time focus minutes. A date range picker filters all cards and charts to a custom window. Pie chart shows breakdown by label. Combines local + cloud data.

> Press **Refresh from Cloud** in the header if the Overview is empty — it needs cloud data loaded at least once.

### Timeline tab
Stacked bar chart with a **custom date range picker** (From / To date inputs). Preset quick-range buttons (7d / 14d / 30d / 90d / All) for fast switching. Each bar is broken down by label, colour-coded. Correct date sorting across month boundaries.

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

**Desktop app won't open on Windows**
→ Ensure WebView2 runtime is installed. Download from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

**Push to cloud sent 0 minutes for a tag**
→ Use **Force Sync** in the Statistics page to overwrite cloud values with your local totals.
