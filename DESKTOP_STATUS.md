# Desktop App — Status

> The desktop app is a Wails v2 (Go + React/Vite) app under `desktop/`. The React frontend lives in `desktop/frontend/` and is built by Wails at release time.
> Branch: `dev`

---

## Current state

**Latest desktop tag:** `desktop-v3.1.5`

All known startup crashes and sizing issues are resolved. The desktop app builds cleanly via `wails build` and via CI (`desktop-release.yml`).

### Recent desktop commits
- `cfc4738a` — feat(desktop): review-before-push cloud sync modal (ReviewSyncModal + Go handlers)
- `a6b3107b` — feat(desktop): portrait layout with 2x zoom and larger fonts
- `9f67f46b` — fix(desktop): resolve startup crash and window sizing issues

---

## How to build & run

```bash
# Dev mode (hot-reload):
cd desktop
wails dev

# Production build:
cd desktop
wails build
# Output: desktop/build/bin/GoodtimePomodoro.exe
```

Or from PowerShell (repo root):
```powershell
Start-Process "desktop\build\bin\GoodtimePomodoro.exe"
```

> **Note:** `build/windows/info.json` is gitignored. If missing after a fresh clone, recreate it:
> ```json
> {
>   "fixed": { "file_version": "1.0.0.0", "product_version": "1.0.0.0" },
>   "info": {
>     "0409": {
>       "CompanyName": "Vivid-Vortex",
>       "FileDescription": "Zen Mode",
>       "FileVersion": "1.0.0",
>       "InternalName": "ZenMode",
>       "LegalCopyright": "Copyright 2025",
>       "OriginalFilename": "ZenMode.exe",
>       "ProductName": "Zen Mode",
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
| `desktop/app.go` | Go API surface (bindings exposed to frontend) |
| `desktop/internal/sync/handler.go` | Cloud sync logic, ReviewSyncModal data |
| `desktop/internal/database/db.go` | SQLite migrations |
| `desktop/internal/database/models.go` | DB schema structs |
| `desktop/build/windows/info.json` | Windows exe version info **(gitignored — must recreate)** |
| `desktop/frontend/src/pages/TimerPage.tsx` | Main timer UI |
| `desktop/frontend/src/pages/SettingsPage.tsx` | Timer profiles, cloud sync (ReviewSyncModal trigger) |
| `desktop/frontend/src/pages/StatisticsPage.tsx` | Stats/overview with date range pickers |
| `desktop/frontend/src/components/ReviewSyncModal.tsx` | Review-before-push modal |
| `desktop/frontend/src/wailsjs/go/main/App.ts` | Auto-generated Go bindings (do not edit manually) |

---

## CI / Release

Releases are triggered by `desktop-v*` tags via `.github/workflows/desktop-release.yml`.

To release a new desktop version:
```bash
# Option A — auto-increment via GitHub Actions:
# GitHub → Actions → Bump Version Tag → type=desktop, bump=patch → Run

# Option B — manual:
git tag desktop-v3.1.6 && git push origin desktop-v3.1.6
```
