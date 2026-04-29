# React Desktop App Plan — Goodtime Pomodoro (React + TanStack Query + Firestore)

> **What this is:** A standalone React web app — separate from the Wails desktop app.
> No Go backend. Timer logic runs in the browser. Data persists to Firestore directly
> (same collections the Android app uses) plus localStorage for offline fallback.
>
> **Folder:** `react_desktop/` at repo root (standalone Vite project)
> **Stack:** React 18 · TypeScript · Vite · TanStack Query v5 · Tailwind CSS v3 · Firebase SDK v10
>
> **Does NOT touch:** `desktop/` (Wails app) — left 100% as-is.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Implemented |
| 🧪 | Tested (manually verified in browser) |
| ✔️ | **Complete** — committed & working |

---

## Phase 0 — Project Bootstrap
**Goal:** Vite scaffold + all deps installed + dev server runs.

- ⬜ `npm create vite@latest react_desktop -- --template react-ts`
- ⬜ Install TanStack Query v5: `@tanstack/react-query @tanstack/react-query-devtools`
- ⬜ Install Tailwind CSS v3: `tailwindcss postcss autoprefixer`
- ⬜ Install Firebase SDK v10: `firebase`
- ⬜ Install routing: `react-router-dom`
- ⬜ Install icons: `lucide-react`
- ⬜ Install dnd: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- ⬜ Install Recharts: `recharts`
- ⬜ `tailwind.config.js` — custom colors: `brand` (pink-violet) + `surface` (dark greys)
- ⬜ `src/firebase.ts` — initialize Firebase app from `google-services.json` values
- ⬜ `src/main.tsx` — `QueryClientProvider` wraps `RouterProvider`
- ⬜ `npm run dev` → dev server starts, blank dark page loads

**Commit:** `feat(react_desktop/p0): Vite scaffold + TanStack Query + Tailwind + Firebase`

---

## Phase 1 — App Shell & Routing
**Goal:** Sidebar layout with working page navigation.

### Window / layout
- ⬜ `index.html` — dark background, no scrollbar flash
- ⬜ `App.tsx` — two-column: `sidebar (220px) | <Outlet /> (flex-1)`
- ⬜ Sidebar: logo + app name at top, nav links, version at bottom
- ⬜ Active route: accent left-border + muted background
- ⬜ Routes: `/` (timer) · `/statistics` · `/labels` · `/settings`

### Pages (stub)
- ⬜ `TimerPage.tsx` — placeholder "Timer"
- ⬜ `StatisticsPage.tsx` — placeholder "Statistics"
- ⬜ `LabelsPage.tsx` — placeholder "Labels"
- ⬜ `SettingsPage.tsx` — placeholder "Settings"

### Tailwind tokens (in `tailwind.config.js`)
```js
brand: { 400: '#d975f7', 500: '#c54af0', 900: '#2d0a3f' }
surface: { 700: '#2a2a2a', 800: '#1e1e1e', 900: '#121212' }
```

**Commit:** `feat(react_desktop/p1): sidebar shell + routing`

---

## Phase 2 — Firebase & TanStack Query Data Layer ✔️
**Goal:** All Firestore reads/writes wrapped in typed query/mutation hooks.

### Firebase setup (`src/firebase.ts`)
- ✅ `initializeApp(firebaseConfig)` using values from `google-services.json`
- ✅ Export `db = getFirestore(app)`

### Query key factory (`src/queryKeys.ts`)
- ✅ `labels.all`, `labels.detail(id)`
- ✅ `settings.all`
- ✅ `timerProfiles.all`
- ✅ `sessions.all`, `sessions.byDate(date)`
- ✅ `cloud.timesheetEntry(date)`, `cloud.appHistory(date)`
- ✅ `statistics.overview()`

### Firestore helpers (`src/lib/firestore.ts`)
- ✅ `getTimesheetEntry(date)` → reads `timesheet_entries/{dd-mm-yyyy}`
- ✅ `upsertTimesheetEntry(date, fieldPatch)` → creates or merges (additive)
- ✅ `setTimesheetFields(date, fieldValues)` → creates or overwrites specific fields
- ✅ `getAppHistory(date)` → reads `pomodoro_app_history/{dd-mm-yyyy}`
- ✅ `pushAppHistoryEntry(date, entry)` → appends entry to cloud history

### Local storage helpers (`src/lib/localStorage.ts`)
- ✅ `getLabels()` / `saveLabels(labels)`
- ✅ `getSettings()` / `saveSettings(settings)`
- ✅ `getTimerProfiles()` / `saveTimerProfiles(profiles)`
- ✅ `getSessions()` / `appendSession(session)` / `updateSession()` / `deleteSession()`

### Supporting libs
- ✅ `src/lib/tagMapping.ts` — TAG_TO_FIELD map, DEFAULT_TAG_SNAPSHOT, buildFieldPatch()
- ✅ `src/lib/dateUtils.ts` — formatDateId, todayId, parseDateId, formatMmSs
- ✅ `src/types/` — label.ts, session.ts, settings.ts, firestore.ts

### Query hooks (`src/queries/`)
- ✅ `useLabels()` → reads from localStorage
- ✅ `useSettings()` → reads from localStorage
- ✅ `useTimerProfiles()` → reads from localStorage
- ✅ `useSessions()`, `useSessionsByDate(date)` → reads from localStorage
- ✅ `useTimesheetEntry(date)` → reads from Firestore
- ✅ `useCloudAppHistory(date)` → reads from Firestore

### Mutation hooks (`src/mutations/`)
- ✅ `useCreateLabel()` → saves to localStorage + invalidates `labels.all`
- ✅ `useUpdateLabel()` → saves to localStorage + invalidates `labels.all`
- ✅ `useDeleteLabel()` → saves to localStorage + invalidates `labels.all`
- ✅ `useSaveSettings()` → saves to localStorage + invalidates `settings.all`
- ✅ `useSaveTimerProfile()` / `useDeleteTimerProfile()` → localStorage + invalidates
- ✅ `usePushToCloud()` → groups sessions by date+label, resolves field via tagMapping, sets Firestore
- ✅ `usePullFromCloud()` → fetches entries by date, seeds query cache

**Commit:** `feat(react_desktop/p2): Firebase + TanStack Query data layer`

---

## Phase 3 — Timer Engine (TypeScript)
**Goal:** Full Pomodoro timer running in the browser.

### Timer store (`src/stores/timerStore.ts`) — using `useReducer` + `useContext`
- ⬜ State: `{ kind, timerType, remainingMs, totalMs, completedSessions, activeLabelName, profileName }`
- ⬜ Actions: `START | PAUSE | RESUME | STOP | SKIP | TICK | RESET_SESSIONS`
- ⬜ `kind`: `'RESET' | 'RUNNING' | 'PAUSED' | 'FINISHED'`
- ⬜ `timerType`: `'FOCUS' | 'BREAK' | 'LONG_BREAK'`

### Timer service (`src/lib/timer.ts`)
- ⬜ `startCountdown(durationMs, onTick, onFinish)` → returns cleanup fn
- ⬜ Uses `setInterval(1000)`, corrects for drift using `Date.now()`
- ⬜ Auto-start break when focus finishes (if setting enabled)
- ⬜ Long break after N sessions (from settings)
- ⬜ On FOCUS finish: append session to localStorage via `appendSession()`
- ⬜ On FOCUS finish: dispatch `usePushToCloud` mutation (tag → Firestore field mapping)

### Browser notifications
- ⬜ Request `Notification` permission on first timer start
- ⬜ Notify on focus finish: "Time for a break!"
- ⬜ Notify on break finish: "Back to work!"

### Page title updates
- ⬜ `document.title = `${mm:ss} — ${type} | Goodtime``

**Commit:** `feat(react_desktop/p3): JavaScript timer engine with auto-start + notifications`

---

## Phase 4 — Timer Page (Desktop UI)
**Goal:** Two-column layout with prominent ring on left, controls on right.

### Layout
- ⬜ Left column (55%): circular ring (320px), time digits (text-7xl mono), type badge
- ⬜ Right column (45%): label picker, start/pause/stop/skip buttons, session dots, profile badge

### Components
- ⬜ `CircularProgress.tsx` — SVG ring, size prop, smooth CSS transition
- ⬜ `TimerDisplay.tsx` — formats `remainingMs` as `MM:SS`
- ⬜ `LabelPicker.tsx` — searchable dropdown, color swatch, creates new label inline
- ⬜ `TimerControls.tsx` — icon buttons (Play/Pause/Stop/Skip), keyboard shortcuts
- ⬜ `SessionDots.tsx` — filled circles, click to reset count
- ⬜ `ProfileBadge.tsx` — pill showing active profile, click → popover to switch

### Keyboard shortcuts
- ⬜ `Space` → start / pause / resume
- ⬜ `Escape` → stop
- ⬜ `N` → skip

**Commit:** `feat(react_desktop/p4): timer page — two-column desktop layout`

---

## Phase 5 — Labels Page
**Goal:** Full-width labels management.

- ⬜ List of labels: color swatch + name + session count (from localStorage)
- ⬜ Inline edit row (click label → edit form expands in-place)
- ⬜ "New Label" button → inline form at top
- ⬜ Delete with popover confirmation
- ⬜ Drag-to-reorder using `@dnd-kit`
- ⬜ 24-color palette matching Android
- ⬜ All mutations via hooks from Phase 2

**Commit:** `feat(react_desktop/p5): labels page — inline edit + drag reorder`

---

## Phase 6 — Statistics Page
**Goal:** Charts driven by localStorage sessions + Firestore cloud data.

### Tabs
- ⬜ **Overview** — Today / This Week / This Month / Total cards
- ⬜ **Timeline** — bar chart (date × minutes per label), label filter
- ⬜ **App History** — raw sessions list from localStorage + cloud, device badge

### Components
- ⬜ `StatCard.tsx` — metric card (value + label)
- ⬜ `TimelineChart.tsx` — Recharts stacked BarChart, X=date, Y=minutes
- ⬜ `HeatmapGrid.tsx` — contribution-style heatmap (52 weeks × 7 days)
- ⬜ `PieChart.tsx` — label breakdown (Recharts PieChart)

### TanStack Query
- ⬜ Overview: computed from localStorage sessions
- ⬜ Timeline: `useTimesheetEntry` per date in range from Firestore
- ⬜ "Refresh from cloud" button → `invalidateQueries(['cloud'])`

**Commit:** `feat(react_desktop/p6): statistics — overview, timeline chart, heatmap`

---

## Phase 7 — Settings Page
**Goal:** Timer profiles, preferences, cloud sync controls.

### Sections
- ⬜ **Timer Profiles** — list, create, rename, delete, set as default, lock active
- ⬜ **General** — auto-start work, auto-start break, long break after N sessions
- ⬜ **Notifications** — toggle browser notifications
- ⬜ **Backup & Restore** — Export JSON (localStorage dump), Import JSON
- ⬜ **Cloud Sync** — "Save to Cloud" button + last-push timestamp, "Pull from Cloud" button

### Cloud sync logic (in `usePushToCloud`)
- ⬜ Follows CLAUDE.md tag-mapping: label name → `tagSnapshot` key → `formData` field
- ⬜ If date doc exists: update only the matched fields
- ⬜ If date doc missing: create full JSON structure from CLAUDE.md template
- ⬜ Error: show dialog "No tag found for label X"

**Commit:** `feat(react_desktop/p7): settings — profiles, backup, cloud sync`

---

## Phase 8 — Polish & UX
**Goal:** Production-quality feel.

- ⬜ Toast system (success / error / info) — custom lightweight, no extra library
- ⬜ Loading skeletons on initial data fetch
- ⬜ Error boundaries per page
- ⬜ Empty states: "No sessions yet" on statistics, "No labels" on labels page
- ⬜ TanStack Query DevTools in dev mode only (`import.meta.env.DEV`)
- ⬜ `npm run build` → zero errors, zero TS errors
- ⬜ `dist/` can be opened in a browser directly (or served by any static server)

**Commit:** `feat(react_desktop/p8): polish — toasts, skeletons, error boundaries`

---

## Phase 9 — Final Build & Verification
**Goal:** Everything working end-to-end, committed and tagged.

- ⬜ Timer: start/pause/stop/skip + auto-break + notifications
- ⬜ Labels: create/edit/delete/reorder persists across refresh
- ⬜ Settings: profiles save/apply changes active timer duration
- ⬜ Statistics: overview correct, timeline chart loads, heatmap renders
- ⬜ Cloud: Save to Cloud pushes correct data to Firestore `timesheet_entries`
- ⬜ Cloud: Pull from Cloud updates timeline with cloud data
- ⬜ `npm run build` clean
- ⬜ Final commit + git tag

**Commit:** `feat(react_desktop): production build verified — all features working`

---

## Architecture

```
react_desktop/                   ← standalone Vite project
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx                 ← QueryClientProvider + RouterProvider
    ├── App.tsx                  ← Sidebar shell + <Outlet />
    ├── firebase.ts              ← Firebase app init + db export
    ├── queryKeys.ts             ← Centralized query key factory
    ├── router.tsx               ← react-router-dom routes
    ├── types/
    │   ├── timer.ts             ← TimerState, TimerType, TimerKind
    │   ├── label.ts             ← Label, LabelColor
    │   ├── session.ts           ← Session, AppHistoryEntry
    │   ├── settings.ts          ← AppSettings, TimerProfile
    │   └── firestore.ts         ← TimesheetEntry, tagSnapshot shape
    ├── lib/
    │   ├── timer.ts             ← setInterval timer engine
    │   ├── localStorage.ts      ← typed localStorage helpers
    │   ├── firestore.ts         ← Firestore CRUD helpers
    │   ├── tagMapping.ts        ← label → Firestore field mapping (from CLAUDE.md)
    │   └── dateUtils.ts         ← date formatting, epoch helpers
    ├── context/
    │   └── TimerContext.tsx     ← useReducer timer state + dispatch
    ├── queries/                 ← useQuery hooks (read)
    │   ├── useLabels.ts
    │   ├── useSettings.ts
    │   ├── useTimerProfiles.ts
    │   ├── useSessions.ts
    │   └── useCloudData.ts
    ├── mutations/               ← useMutation hooks (write)
    │   ├── useCreateLabel.ts
    │   ├── useUpdateLabel.ts
    │   ├── useDeleteLabel.ts
    │   ├── useSaveSettings.ts
    │   ├── useSaveTimerProfile.ts
    │   └── usePushToCloud.ts
    ├── components/
    │   ├── Timer/
    │   │   ├── CircularProgress.tsx
    │   │   ├── TimerDisplay.tsx
    │   │   ├── TimerControls.tsx
    │   │   ├── LabelPicker.tsx
    │   │   ├── SessionDots.tsx
    │   │   └── ProfileBadge.tsx
    │   ├── Labels/
    │   │   ├── LabelRow.tsx
    │   │   └── ColorPicker.tsx
    │   ├── Stats/
    │   │   ├── StatCard.tsx
    │   │   ├── TimelineChart.tsx
    │   │   ├── HeatmapGrid.tsx
    │   │   └── PieChart.tsx
    │   └── ui/
    │       ├── Toast.tsx
    │       ├── Skeleton.tsx
    │       ├── ErrorBoundary.tsx
    │       └── Popover.tsx
    └── pages/
        ├── TimerPage.tsx
        ├── StatisticsPage.tsx
        ├── LabelsPage.tsx
        └── SettingsPage.tsx
```

---

## Progress Tracker

| Phase | Status | Commit |
|-------|--------|--------|
| 0 — Bootstrap | ✔️ | d880e680 |
| 1 — App Shell | ✔️ | d880e680 |
| 2 — Data Layer | ✔️ | — |
| 3 — Timer Engine | ⬜ | — |
| 4 — Timer Page | ⬜ | — |
| 5 — Labels Page | ⬜ | — |
| 6 — Statistics Page | ⬜ | — |
| 7 — Settings Page | ⬜ | — |
| 8 — Polish | ⬜ | — |
| 9 — Final Build | ⬜ | — |
