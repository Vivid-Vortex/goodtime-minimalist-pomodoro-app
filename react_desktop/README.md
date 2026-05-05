# Zen Mode — React Desktop

React + TypeScript + Vite frontend. Used in two ways:
- **Wails shell** — bundled inside `desktop/` for the native Windows app
- **Dev/web mode** — run standalone via `npm run dev` for rapid iteration

---

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/ (picked up by wails build)
npm test         # Vitest unit tests
```

---

## Architecture

```
react_desktop/src/
├── pages/
│   ├── TimerPage.tsx          ← timer UI + label picker
│   ├── LabelsPage.tsx         ← label CRUD
│   ├── StatisticsPage.tsx     ← Overview / Timeline / History tabs
│   └── SettingsPage.tsx       ← timer profiles, cloud sync
├── queries/                   ← TanStack Query data fetchers
│   ├── useSessions.ts
│   ├── useLabels.ts
│   └── useCloudStats.ts
├── mutations/                 ← TanStack Query mutations
│   ├── usePushToCloud.ts      ← delta push (only unsynced sessions)
│   ├── useForceSync.ts        ← overwrite cloud with local totals
│   ├── useRefreshCloudStats.ts
│   └── useSaveTimerProfile.ts
├── lib/
│   ├── firestore.ts           ← Firebase SDK helpers
│   ├── localStorage.ts        ← session storage + markSessionsSynced
│   ├── tagMapping.ts          ← label code → Firestore field mapping
│   └── dateUtils.ts
└── types/
    ├── session.ts             ← Session { id, labelName, date, durationMinutes, synced? }
    ├── label.ts
    └── settings.ts
```

---

## Cloud sync model

Sessions are stored locally with `synced: false`. On **Push to Cloud**, only unsynced sessions are sent (additive merge via `upsertTimesheetEntry`). After a successful push, sessions are marked `synced: true` via `markSessionsSynced`. **Force Sync** overwrites cloud values with local totals using `setTimesheetFields`.

---

## Key dependencies

| Package | Purpose |
|---|---|
| `react` + `vite` | UI framework + build tool |
| `@tanstack/react-query` | Server state / cache |
| `firebase` | Firestore SDK |
| `recharts` | Charts (bar, pie) |
| `lucide-react` | Icons |
| `tailwindcss` | Styling |
