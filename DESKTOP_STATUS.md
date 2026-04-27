# Desktop App — Status & Pickup Notes

## What was fixed in this session

| # | Problem | Fix |
|---|---------|-----|
| 1 | `wails build` failed with `json: cannot unmarshal string into Go struct field jsonVersionInfo.info` | Updated `build/windows/info.json` to wrap strings under language-code key `"0409"` as required by Wails v2.12 / winres |
| 2 | App crashed on startup: `duplicate column name: cloud_sync_schedule` | Fixed `isDuplicateColumnErr` in `db.go` — was checking `msg[:21] == "duplicate column name"` but SQLite prefixes errors with `"SQL logic error: "`, so check never matched. Changed to `strings.Contains` |
| 3 | Window could be maximised to 1920×1080, making tiny content float in a black void | Added `MaxWidth: 460, MaxHeight: 860` in `main.go` to prevent maximising |
| 4 | `wails dev` had same build error | Covered by fix #1 |

**Commit:** `9f67f46b` on branch `dev`

---

## Outstanding issue — UI is still too small

Even at the constrained 460×860 window, the fonts and controls feel small on a 1080p monitor at 100% DPI.

### Root cause
The UI was designed mobile-first (420×780 viewport, Tailwind `text-sm`, `text-[10px]` etc.). On a desktop monitor these sizes are too small for comfortable use at a normal viewing distance.

### Options to fix (pick one)

**Option A — ZoomFactor (quickest, no layout changes)**
In `desktop/main.go` → `Windows.ZoomFactor`:
- Set `1.3` → 30% bigger text, CSS viewport shrinks to ~354×660 px
- Set `1.5` → 50% bigger, viewport ~307×573 px (layout may clip at bottom)
- Combine with taller window (e.g. `Height: 1000`, `MaxHeight: 1000`) to recover vertical space

```go
// main.go — try this first
Width:     460,
Height:    1000,
MaxWidth:  460,
MaxHeight: 1000,
// Windows options:
ZoomFactor: 1.3,
```

**Option B — Larger base font size (proper fix, small CSS change)**
In `desktop/frontend/src/styles.css`, add:
```css
html { font-size: 18px; }   /* up from default 16px */
```
Everything using `rem` units scales automatically. Fixed-px values (SVG circle size=260, icon sizes) need manual adjustment.

**Option C — Redesign layout for desktop (most work)**
Make the app wider (650-800px), use a two-column layout on the timer page, increase the circular progress ring size prop from 260 → 360.

### Recommendation
Start with **Option A** (ZoomFactor 1.3 + MaxHeight 1000). If that clips the settings/stats pages, switch to **Option B**.

---

## How to build & run

```bash
# From desktop/ directory:
wails build          # produces build/bin/GoodtimePomodoro.exe
# Then double-click the exe, or:
Start-Process "desktop\build\bin\GoodtimePomodoro.exe"
```

> Note: `build/windows/info.json` must have the `"0409"` language-code wrapper or `wails build` fails.
> This file is gitignored — if lost, recreate it from the format in this doc:
> ```json
> { "fixed": { ... }, "info": { "0409": { "company_name": "...", ... } } }
> ```

---

## Key file locations

| File | Purpose |
|------|---------|
| `desktop/main.go` | Window size, ZoomFactor, Wails options |
| `desktop/app.go` | Go API surface, SetMiniMode sizes |
| `desktop/internal/database/db.go` | SQLite migrations, `isDuplicateColumnErr` |
| `desktop/build/windows/info.json` | Windows exe version info (gitignored) |
| `desktop/frontend/src/pages/TimerPage.tsx` | Timer UI, CircularProgress size prop |
| `desktop/frontend/src/styles.css` | Global CSS, base font size |
