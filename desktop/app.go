package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/labels"
	"github.com/adrcotfas/goodtime/desktop/internal/sessions"
	"github.com/adrcotfas/goodtime/desktop/internal/settings"
	cloudsync "github.com/adrcotfas/goodtime/desktop/internal/sync"
	"github.com/adrcotfas/goodtime/desktop/internal/timer"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const EventTimerTick = "timer:tick"

// CloudSyncStatus is returned to the frontend after a sync attempt.
type CloudSyncStatus struct {
	DocsCreated   int    `json:"docsCreated"`
	DocsUpdated   int    `json:"docsUpdated"`
	Error         string `json:"error"`
	CredsMissing  bool   `json:"credsMissing"`
}

// App holds all application state and exposes the Go API to the frontend via Wails bindings.
type App struct {
	ctx context.Context

	db             *database.DB
	timerBridge    *timer.WailsBridge
	labelService   *labels.Service
	sessionService *sessions.Service
	settingService *settings.Service
	syncHandler    *cloudsync.Handler // nil until credentials are loaded

	schedulerStop chan struct{} // closed to stop the background scheduler goroutine
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	dbPath, err := resolveDBPath()
	if err != nil {
		runtime.LogFatalf(ctx, "failed to resolve DB path: %v", err)
		return
	}
	db, err := database.Open(dbPath)
	if err != nil {
		runtime.LogFatalf(ctx, "failed to open database: %v", err)
		return
	}
	a.db = db

	a.labelService = labels.NewService(db)
	a.sessionService = sessions.NewService(db)
	a.settingService = settings.NewService(db)

	if err := a.labelService.SeedDefaults(ctx); err != nil {
		runtime.LogWarningf(ctx, "seed defaults: %v", err)
	}

	a.timerBridge = timer.NewWailsBridge(ctx, a.sessionService, a.settingService, func(s timer.State) {
		runtime.EventsEmit(ctx, EventTimerTick, s)
	})

	// Try to init the sync handler if credentials are present
	if credPath, err := cloudsync.CredentialsPath(); err == nil {
		if credJSON, err := os.ReadFile(credPath); err == nil {
			if h, err := cloudsync.NewHandler(ctx, credJSON, a.sessionService, a.db); err == nil {
				a.syncHandler = h
			} else {
				runtime.LogWarningf(ctx, "sync handler init: %v", err)
			}
		}
	}

	// Start background scheduler for scheduled cloud push
	a.schedulerStop = make(chan struct{})
	go a.runScheduler()
}

// shutdown is called when the app is about to quit.
func (a *App) shutdown(_ context.Context) {
	if a.schedulerStop != nil {
		close(a.schedulerStop)
	}
	a.timerBridge.Shutdown()
	if a.db != nil {
		_ = a.db.Close()
	}
}

// ─── Timer API ────────────────────────────────────────────────────────────────

func (a *App) StartTimer() error           { return a.timerBridge.Start() }
func (a *App) PauseTimer() error           { return a.timerBridge.Pause() }
func (a *App) ResumeTimer() error          { return a.timerBridge.Resume() }
func (a *App) StopTimer() error            { return a.timerBridge.StopAndSave() }
func (a *App) SkipTimer() error            { return a.timerBridge.Skip() }
func (a *App) GetTimerState() timer.State  { return a.timerBridge.GetState() }

// ─── Label API ────────────────────────────────────────────────────────────────

func (a *App) GetLabels() ([]database.Label, error) { return a.labelService.GetAll(a.ctx) }
func (a *App) CreateLabel(req labels.CreateRequest) (database.Label, error) {
	return a.labelService.Create(a.ctx, req)
}
func (a *App) UpdateLabel(req labels.UpdateRequest) error { return a.labelService.Update(a.ctx, req) }
func (a *App) DeleteLabel(name string) error              { return a.labelService.Delete(a.ctx, name) }
func (a *App) ArchiveLabel(name string) error             { return a.labelService.Archive(a.ctx, name) }
func (a *App) UnarchiveLabel(name string) error           { return a.labelService.Unarchive(a.ctx, name) }
func (a *App) ReorderLabels(names []string) error         { return a.labelService.Reorder(a.ctx, names) }
func (a *App) SetActiveLabel(name string) error           { return a.settingService.SetActiveLabel(a.ctx, name) }

// ─── Session API ──────────────────────────────────────────────────────────────

func (a *App) GetSessions(req sessions.ListRequest) ([]database.Session, error) {
	return a.sessionService.List(a.ctx, req)
}
func (a *App) UpdateSession(req sessions.UpdateRequest) error {
	return a.sessionService.Update(a.ctx, req)
}
func (a *App) DeleteSessions(ids []int64) error { return a.sessionService.Delete(a.ctx, ids) }
func (a *App) BulkEditLabel(req sessions.BulkEditRequest) error {
	return a.sessionService.BulkEditLabel(a.ctx, req)
}

// ─── Statistics API ───────────────────────────────────────────────────────────

func (a *App) GetStatisticsSummary(req sessions.SummaryRequest) (sessions.Summary, error) {
	return a.sessionService.GetSummary(a.ctx, req)
}
func (a *App) GetTimelineData(req sessions.TimelineRequest) ([]sessions.TimelineEntry, error) {
	return a.sessionService.GetTimeline(a.ctx, req)
}

// ─── Settings API ─────────────────────────────────────────────────────────────

func (a *App) GetSettings() (database.AppSettings, error)   { return a.settingService.Get(a.ctx) }
func (a *App) UpdateSettings(req settings.UpdateRequest) error {
	return a.settingService.Update(a.ctx, req)
}
func (a *App) GetTimerProfiles() ([]database.TimerProfile, error) {
	return a.settingService.GetTimerProfiles(a.ctx)
}
func (a *App) SaveTimerProfile(p database.TimerProfile) error {
	return a.settingService.SaveTimerProfile(a.ctx, p)
}
func (a *App) DeleteTimerProfile(name string) error {
	return a.settingService.DeleteTimerProfile(a.ctx, name)
}

// ─── Cloud Sync API ───────────────────────────────────────────────────────────

// SaveToCloud pushes all unsynced sessions to Firestore.
func (a *App) SaveToCloud() CloudSyncStatus {
	if !cloudsync.CredentialsExist() {
		credPath, _ := cloudsync.CredentialsPath()
		return CloudSyncStatus{
			CredsMissing: true,
			Error: "service-account.json not found.\n\nPlace it at:\n" + credPath +
				"\n\nDownload from Firebase Console → Project Settings → Service Accounts.",
		}
	}
	if a.syncHandler == nil {
		// Try to init now (user may have dropped credentials after startup)
		credPath, _ := cloudsync.CredentialsPath()
		credJSON, err := os.ReadFile(credPath)
		if err != nil {
			return CloudSyncStatus{Error: err.Error()}
		}
		h, err := cloudsync.NewHandler(a.ctx, credJSON, a.sessionService, a.db)
		if err != nil {
			return CloudSyncStatus{Error: "Failed to initialise sync: " + err.Error()}
		}
		a.syncHandler = h
	}
	status, err := a.syncHandler.Push(a.ctx)
	result := CloudSyncStatus{DocsCreated: status.DocsCreated, DocsUpdated: status.DocsUpdated}
	if err != nil {
		result.Error = err.Error()
	} else {
		_ = a.settingService.SetLastSyncTimestamp(a.ctx, time.Now().UnixMilli())
	}
	return result
}

// GetCredentialsPath returns where the user should put service-account.json.
func (a *App) GetCredentialsPath() string {
	p, _ := cloudsync.CredentialsPath()
	return p
}

// CloudSyncEnabled reports whether credentials are present.
func (a *App) CloudSyncEnabled() bool { return cloudsync.CredentialsExist() }

// GetCloudSyncSchedule returns the scheduled daily push time ("HH:MM" or "").
func (a *App) GetCloudSyncSchedule() string {
	return a.settingService.GetCloudSyncSchedule(a.ctx)
}

// SetCloudSyncSchedule sets (or clears) the daily auto-push time.
// Pass "" to disable, "HH:MM" (24h) to enable.
func (a *App) SetCloudSyncSchedule(schedule string) error {
	return a.settingService.SetCloudSyncSchedule(a.ctx, schedule)
}

// runScheduler is a background goroutine that fires SaveToCloud at the
// user-configured daily time.  It wakes up every 30 seconds to check.
func (a *App) runScheduler() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	var lastFiredDate string // "YYYY-MM-DD" of the last successful auto-push

	for {
		select {
		case <-a.schedulerStop:
			return
		case now := <-ticker.C:
			schedule := a.settingService.GetCloudSyncSchedule(a.ctx)
			if schedule == "" {
				continue
			}
			// Parse HH:MM
			var hh, mm int
			if _, err := fmt.Sscanf(schedule, "%d:%d", &hh, &mm); err != nil {
				continue
			}
			// Check if current time matches and we haven't already fired today
			today := now.Format("2006-01-02")
			if now.Hour() == hh && now.Minute() == mm && lastFiredDate != today {
				lastFiredDate = today
				runtime.LogInfof(a.ctx, "scheduler: auto-push triggered at %s", schedule)
				result := a.SaveToCloud()
				if result.Error != "" {
					runtime.LogWarningf(a.ctx, "scheduler: auto-push error: %s", result.Error)
				} else {
					runtime.LogInfof(a.ctx, "scheduler: auto-push ok — created=%d updated=%d",
						result.DocsCreated, result.DocsUpdated)
				}
			}
		}
	}
}

// ─── Combined Cloud Data API ──────────────────────────────────────────────────

// CloudHistoryEntry is one cached entry from the pomodoro_app_history collection.
type CloudHistoryEntry struct {
	DateMillis int64  `json:"dateMillis"`
	LabelName  string `json:"labelName"`
	Minutes    int64  `json:"minutes"`
	DeviceName string `json:"deviceName"`
	FetchedAt  int64  `json:"fetchedAt"`
}

// CloudTimelineEntry is one cached entry from the timesheet_entries collection.
type CloudTimelineEntry struct {
	DateMillis int64  `json:"dateMillis"`
	LabelName  string `json:"labelName"`
	Minutes    int64  `json:"minutes"`
	FetchedAt  int64  `json:"fetchedAt"`
}

// RefreshCloudData fetches timesheet_entries + pomodoro_app_history from Firestore
// and caches them in the local SQLite cloud_*_cache tables.
func (a *App) RefreshCloudData() error {
	if !cloudsync.CredentialsExist() {
		return fmt.Errorf("service-account.json not found — place it at the path shown in Settings")
	}
	if a.syncHandler == nil {
		credPath, _ := cloudsync.CredentialsPath()
		credJSON, err := os.ReadFile(credPath)
		if err != nil {
			return err
		}
		h, err := cloudsync.NewHandler(a.ctx, credJSON, a.sessionService, a.db)
		if err != nil {
			return fmt.Errorf("init sync: %w", err)
		}
		a.syncHandler = h
	}

	fetchedAt := time.Now().UnixMilli()
	db := a.db.SQL()

	// ── Timeline: parse timesheet_entries ──────────────────────────────────────
	timelineDocs, err := a.syncHandler.ListTimesheetEntries(a.ctx)
	if err != nil {
		return fmt.Errorf("fetch timesheet_entries: %w", err)
	}
	if _, err := db.ExecContext(a.ctx, "DELETE FROM cloud_timeline_cache"); err != nil {
		return err
	}
	for _, doc := range timelineDocs {
		dateMillis := cloudsync.DocIDToMidnightMillis(doc.DocID)
		for label, mins := range doc.LabelMinutes {
			if mins == 0 {
				continue
			}
			_, err := db.ExecContext(a.ctx,
				`INSERT OR REPLACE INTO cloud_timeline_cache (date_millis, label_name, minutes, fetched_at)
				 VALUES (?, ?, ?, ?)`, dateMillis, label, mins, fetchedAt)
			if err != nil {
				return err
			}
		}
	}

	// ── History: parse pomodoro_app_history ───────────────────────────────────
	historyDocs, err := a.syncHandler.ListHistoryEntries(a.ctx)
	if err != nil {
		return fmt.Errorf("fetch pomodoro_app_history: %w", err)
	}
	if _, err := db.ExecContext(a.ctx, "DELETE FROM cloud_history_cache"); err != nil {
		return err
	}
	for _, entry := range historyDocs {
		_, err := db.ExecContext(a.ctx,
			`INSERT INTO cloud_history_cache (date_millis, label_name, minutes, device_name, fetched_at)
			 VALUES (?, ?, ?, ?, ?)`,
			entry.DateMillis, entry.LabelName, entry.Minutes, entry.DeviceName, fetchedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

// GetCombinedHistory returns all cached entries from cloud_history_cache (newest first).
func (a *App) GetCombinedHistory() ([]CloudHistoryEntry, error) {
	rows, err := a.db.SQL().QueryContext(a.ctx,
		`SELECT date_millis, label_name, minutes, device_name, fetched_at
		 FROM cloud_history_cache ORDER BY date_millis DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CloudHistoryEntry
	for rows.Next() {
		var e CloudHistoryEntry
		if err := rows.Scan(&e.DateMillis, &e.LabelName, &e.Minutes, &e.DeviceName, &e.FetchedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// GetCombinedTimeline returns all cached entries from cloud_timeline_cache (newest first).
func (a *App) GetCombinedTimeline() ([]CloudTimelineEntry, error) {
	rows, err := a.db.SQL().QueryContext(a.ctx,
		`SELECT date_millis, label_name, minutes, fetched_at
		 FROM cloud_timeline_cache ORDER BY date_millis DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CloudTimelineEntry
	for rows.Next() {
		var e CloudTimelineEntry
		if err := rows.Scan(&e.DateMillis, &e.LabelName, &e.Minutes, &e.FetchedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ─── Backup API ────────────────────────────────────────────────────────────────

func (a *App) ExportBackup() (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export Backup",
		DefaultFilename: "goodtime-backup.json",
		Filters:         []runtime.FileFilter{{DisplayName: "JSON Files", Pattern: "*.json"}},
	})
	if err != nil || path == "" {
		return "", err
	}
	return path, a.sessionService.ExportJSON(a.ctx, path)
}

func (a *App) ImportBackup() error {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Import Backup",
		Filters: []runtime.FileFilter{{DisplayName: "JSON Files", Pattern: "*.json"}},
	})
	if err != nil || path == "" {
		return err
	}
	return a.sessionService.ImportJSON(a.ctx, path)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


func resolveDBPath() (string, error) {
	dataDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("UserConfigDir: %w", err)
	}
	dir := filepath.Join(dataDir, "GoodtimePomodoro")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("MkdirAll: %w", err)
	}
	return filepath.Join(dir, "goodtime.db"), nil
}
