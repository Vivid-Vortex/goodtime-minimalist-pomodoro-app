# Desktop App — Status & Pickup Notes

> **Context:** The main activity in recent sessions has been the Android app (Sections 14-20 of CLAUDE.md).
> The desktop app is a separate Wails/Go app under `desktop/`. All desktop work below is independent of the Android work.
> Branch: `dev`

---

## Last desktop commit

**`9f67f46b`** — "fix(desktop): resolve startup crash and window sizing issues"

| # | Problem | Fix |
|---|---------|-----|
| 1 | `wails build` failed with `json: cannot unmarshal string into ...` | Updated `build/windows/info.json` to use `"0409"` language-code wrapper |
| 2 | Crash on startup: `duplicate column name: cloud_sync_schedule` | Fixed `isDuplicateColumnErr` in `db.go` to use `strings.Contains` instead of prefix slice |
| 3 | Window maximised to full screen, tiny content in black void | Added `MaxWidth: 460, MaxHeight: 860` in `main.go` |

---

## Open issue — fonts too small / poor readability

**Status: NOT YET FIXED.** This is the primary UX problem to address next.

### Current settings (`desktop/main.go`)
```go
Width:     460,
Height:    860,
MinWidth:  400,
MaxWidth:  460,
MinHeight: 700,
MaxHeight: 860,
// Windows options:
ZoomFactor: 1.0,   // ← no zoom applied yet
```

### Root cause
The frontend was designed mobile-first. Font classes used throughout:
- `text-[10px]` — navigation tab labels (`App.tsx:79`, `SettingsPage.tsx:86`) — **critically small**
- `text-xs` — (12px) helper text, timestamps (`LabelsPage.tsx:90`, `SettingsPage.tsx:91`)  
- `text-sm` — (14px) most body text — acceptable but still small on desktop at 100% DPI
- Base `font-size` in `styles.css` is default **16px** with no desktop override

### Recommended fix — Option A first (5 min, no layout risk)

In `desktop/main.go`, bump `ZoomFactor` and `MaxHeight`:
```go
Width:     460,
Height:    1000,
MinWidth:  400,
MaxWidth:  460,
MinHeight: 700,
MaxHeight: 1000,
// Windows options:
ZoomFactor: 1.3,
```
This makes everything 30% larger without touching CSS. The CSS viewport shrinks to ~354×770 px — verify the timer ring, labels list, and settings page don't clip.

### Option B — CSS base font (proper fix, ~15 min)

In `desktop/frontend/src/styles.css`, after the existing `html, body, #root` block:
```css
/* Desktop scaling — makes all rem-based text larger */
html { font-size: 18px; }
```
Everything using `rem` / Tailwind `text-sm` etc. scales automatically.
Items that still need manual adjustment:
- `CircularProgress.tsx` — `size` prop is fixed px (currently 260)
- SVG `strokeWidth` values
- `text-[10px]` hardcoded classes in `App.tsx` and `SettingsPage.tsx` — change to `text-xs` or `text-sm`

### Option C — Wider window + layout redesign (most work, best result)
Make the window 650–800 px wide, two-column layout on timer page, ring size 260 → 380.

### Recommendation
**Start with Option A** (ZoomFactor 1.3 + MaxHeight 1000). If any page clips vertically, combine with Option B's `font-size: 18px` tweak and replace `text-[10px]` with `text-xs` in two places.

---

## How to build & run

```bash
# From repo root:
cd desktop
wails dev          # hot-reload dev mode (needs wails CLI installed)
wails build        # produces desktop/build/bin/GoodtimePomodoro.exe
```

Or from PowerShell (repo root):
```powershell
Start-Process "desktop\build\bin\GoodtimePomodoro.exe"
```

> **Important:** `build/windows/info.json` is gitignored. If it's missing after a fresh clone, recreate it:
> ```json
> {
>   "fixed": {
>     "file_version": "1.0.0.0",
>     "product_version": "1.0.0.0"
>   },
>   "info": {
>     "0409": {
>       "CompanyName": "Vivid-Vortex",
>       "FileDescription": "Goodtime Pomodoro",
>       "FileVersion": "1.0.0",
>       "InternalName": "GoodtimePomodoro",
>       "LegalCopyright": "Copyright 2025",
>       "OriginalFilename": "GoodtimePomodoro.exe",
>       "ProductName": "Goodtime Pomodoro",
>       "ProductVersion": "1.0.0"
>     }
>   }
> }
> ```

---

## Key file locations

| File | Purpose |
|------|---------|
| `desktop/main.go` | Window size, ZoomFactor, Wails app config |
| `desktop/app.go` | Go API surface exposed to frontend, SetMiniMode resize logic |
| `desktop/internal/database/db.go` | SQLite migrations, `isDuplicateColumnErr` |
| `desktop/internal/database/models.go` | DB schema structs |
| `desktop/build/windows/info.json` | Windows exe version info **(gitignored — must recreate)** |
| `desktop/frontend/src/styles.css` | Global CSS — edit `font-size` here for Option B |
| `desktop/frontend/src/main.go` | Wails entry point, window options |
| `desktop/frontend/src/App.tsx` | Nav tabs — `text-[10px]` label on line 79 |
| `desktop/frontend/src/pages/TimerPage.tsx` | Main timer UI |
| `desktop/frontend/src/components/Timer/CircularProgress.tsx` | Ring — `size` prop is fixed px |
| `desktop/frontend/src/pages/SettingsPage.tsx` | Timer profiles, cloud sync — `text-[10px]` on line 86 |
| `desktop/frontend/src/pages/StatisticsPage.tsx` | Stats/overview |
| `desktop/frontend/src/stores/timerStore.ts` | Zustand timer state |
| `desktop/frontend/src/stores/appStore.ts` | Zustand app/label state |

---

## Android session context (do NOT touch these in a desktop session)

The Android app (`androidApp/` + `shared/`) is on the same `dev` branch and is actively developed. Recent Android commits: `5ea99802` (Section 20 overview UX), `8b2c11ad` (notifications), `d6b128da` (floating widget), `11859d43` (timer profiles). When working on desktop, ignore the `androidApp/` and `shared/` directories entirely — they are KMP/Compose code and have no relation to the Wails/Go desktop app.
