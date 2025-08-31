[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/LewpXfTpi3aS6boHLDYQoZ/4tBEiBM7ZB48VxfWj2qfHi/tree/dev.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/circleci/LewpXfTpi3aS6boHLDYQoZ/4tBEiBM7ZB48VxfWj2qfHi/tree/dev) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/goodtime/localized.svg)](https://crowdin.com/project/goodtime)

# Goodtime

A minimalist but powerful productivity timer designed to keep you focused and free of distractions.

## 🚀 Available Platforms

### 📱 Android App
Native Android application with full Pomodoro timer functionality.

[<img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
    alt="Get it on Google Play"
    height="60">](https://play.google.com/store/apps/details?id=com.apps.adrcotfas.goodtime&utm_source=global_co&utm_medium=prtnr&utm_content=Mar2515&utm_campaign=PartBadge&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1)
[<img src="https://fdroid.gitlab.io/artwork/badge/get-it-on.png"
    alt="Get it on F-Droid"
    height="60">](https://f-droid.org/packages/com.apps.adrcotfas.goodtime)

### 🌐 Web/Desktop App (PWA)
Cross-platform web application that can be installed as a desktop app with **full data persistence**.

**✨ New Features:**
- 💾 **Persistent Data Storage** - All sessions, labels, and settings saved permanently in IndexedDB
- 📊 **Advanced Statistics** - Complete session history and productivity analytics
- 📤 **Data Export/Import** - JSON export for backup and data portability
- 🔄 **Cross-session Persistence** - Data survives browser restarts and updates

**Quick Start:**
```bash
cd webApp
npm install
npm run dev
```

📖 **[Complete Web App Setup Guide →](webApp/README.md)**

## 🏗️ Project Structure

This is a monorepo containing multiple applications:

```
goodtime-productivity/
├── androidApp/          # Native Android application
├── shared/             # Kotlin Multiplatform shared code
├── webApp/             # Web/PWA application (React + TypeScript)
└── README.md           # This file
```

*TODO: improve the description and add screenshots*

## Trouble with Goodtime getting killed by Android?
Different phone [OEMs](https://en.wikipedia.org/wiki/Original_equipment_manufacturer) (phone vendors) have an aggressive take towards apps that rely on background work and alarms to save some battery life.
It is recommended that you disable the battery optimization for this app in order to get accurate alarms.
In the worst case, if you still have issues, try to keep the phone plugged in and/or the screen on while working.

Read more about this topic on [www.dontkillmyapp.com](https://dontkillmyapp.com/)