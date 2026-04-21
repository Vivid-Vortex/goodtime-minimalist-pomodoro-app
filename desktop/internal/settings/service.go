package settings

import (
	"context"
	"fmt"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/timer"
)

// UpdateRequest carries settings fields that the user may change.
type UpdateRequest struct {
	Theme                      string `json:"theme"`
	WorkFinishedSound          string `json:"workFinishedSound"`
	BreakFinishedSound         string `json:"breakFinishedSound"`
	AutoStartWork              bool   `json:"autoStartWork"`
	AutoStartBreak             bool   `json:"autoStartBreak"`
	EnableDesktopNotifications bool   `json:"enableDesktopNotifications"`
	CloudBackupEnabled         bool   `json:"cloudBackupEnabled"`
	DefaultTimerProfileName    string `json:"defaultTimerProfileName"`
}

// Service provides settings management operations.
type Service struct {
	db *database.DB
}

// NewService creates a new Service.
func NewService(db *database.DB) *Service { return &Service{db: db} }

// Get reads the singleton settings row.
func (s *Service) Get(ctx context.Context) (database.AppSettings, error) {
	var st database.AppSettings
	var autoWork, autoBreak, notif, cloud int
	row := s.db.SQL().QueryRowContext(ctx, `
		SELECT active_label_name, default_timer_profile_name, theme,
		       work_finished_sound, break_finished_sound,
		       auto_start_work, auto_start_break,
		       enable_desktop_notifications, cloud_backup_enabled, last_sync_timestamp,
		       cloud_sync_schedule
		FROM app_settings WHERE id=1`)
	err := row.Scan(
		&st.ActiveLabelName, &st.DefaultTimerProfileName, &st.Theme,
		&st.WorkFinishedSound, &st.BreakFinishedSound,
		&autoWork, &autoBreak, &notif, &cloud, &st.LastSyncTimestamp,
		&st.CloudSyncSchedule,
	)
	if err != nil {
		return st, err
	}
	st.AutoStartWork = autoWork == 1
	st.AutoStartBreak = autoBreak == 1
	st.EnableDesktopNotifications = notif == 1
	st.CloudBackupEnabled = cloud == 1
	return st, nil
}

// Update saves changed settings.
func (s *Service) Update(ctx context.Context, req UpdateRequest) error {
	_, err := s.db.SQL().ExecContext(ctx, `
		UPDATE app_settings SET
		  theme=?, work_finished_sound=?, break_finished_sound=?,
		  auto_start_work=?, auto_start_break=?,
		  enable_desktop_notifications=?, cloud_backup_enabled=?,
		  default_timer_profile_name=?
		WHERE id=1`,
		req.Theme, req.WorkFinishedSound, req.BreakFinishedSound,
		boolToInt(req.AutoStartWork), boolToInt(req.AutoStartBreak),
		boolToInt(req.EnableDesktopNotifications), boolToInt(req.CloudBackupEnabled),
		req.DefaultTimerProfileName)
	return err
}

// SetActiveLabel persists the currently selected label.
func (s *Service) SetActiveLabel(ctx context.Context, name string) error {
	_, err := s.db.SQL().ExecContext(ctx,
		"UPDATE app_settings SET active_label_name=? WHERE id=1", name)
	return err
}

// GetActiveLabel returns the currently active label name.
func (s *Service) GetActiveLabel(ctx context.Context) (string, error) {
	var name string
	err := s.db.SQL().QueryRowContext(ctx,
		"SELECT active_label_name FROM app_settings WHERE id=1").Scan(&name)
	return name, err
}

// GetAutoStart returns the auto-start-work and auto-start-break flags.
// Returns (false, false) on any DB error so the caller gets safe defaults.
func (s *Service) GetAutoStart(ctx context.Context) (autoWork, autoBreak bool) {
	var w, b int
	_ = s.db.SQL().QueryRowContext(ctx,
		"SELECT auto_start_work, auto_start_break FROM app_settings WHERE id=1").Scan(&w, &b)
	return w == 1, b == 1
}

// GetCloudSyncSchedule returns the scheduled push time ("HH:MM" or "").
func (s *Service) GetCloudSyncSchedule(ctx context.Context) string {
	var schedule string
	_ = s.db.SQL().QueryRowContext(ctx,
		"SELECT cloud_sync_schedule FROM app_settings WHERE id=1").Scan(&schedule)
	return schedule
}

// SetCloudSyncSchedule persists the scheduled push time ("HH:MM" or "" to disable).
func (s *Service) SetCloudSyncSchedule(ctx context.Context, schedule string) error {
	_, err := s.db.SQL().ExecContext(ctx,
		"UPDATE app_settings SET cloud_sync_schedule=? WHERE id=1", schedule)
	return err
}

// SetLastSyncTimestamp records when the last cloud sync occurred.
func (s *Service) SetLastSyncTimestamp(ctx context.Context, ts int64) error {
	_, err := s.db.SQL().ExecContext(ctx,
		"UPDATE app_settings SET last_sync_timestamp=? WHERE id=1", ts)
	return err
}

// ─── Timer profile management ─────────────────────────────────────────────────

// GetTimerProfiles returns all saved timer profiles.
func (s *Service) GetTimerProfiles(ctx context.Context) ([]database.TimerProfile, error) {
	rows, err := s.db.SQL().QueryContext(ctx, `
		SELECT name, is_countdown, work_duration, is_break_enabled, break_duration,
		       is_long_break_enabled, long_break_duration, sessions_before_lb, work_break_ratio
		FROM timer_profiles ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []database.TimerProfile
	for rows.Next() {
		var p database.TimerProfile
		var isCountdown, isBreak, isLongBreak int
		if err := rows.Scan(
			&p.Name, &isCountdown, &p.WorkDuration, &isBreak, &p.BreakDuration,
			&isLongBreak, &p.LongBreakDuration, &p.SessionsBeforeLongBreak, &p.WorkBreakRatio,
		); err != nil {
			return nil, err
		}
		p.IsCountdown = isCountdown == 1
		p.IsBreakEnabled = isBreak == 1
		p.IsLongBreakEnabled = isLongBreak == 1
		out = append(out, p)
	}
	return out, rows.Err()
}

// SaveTimerProfile upserts a timer profile.
func (s *Service) SaveTimerProfile(ctx context.Context, p database.TimerProfile) error {
	if p.Name == "" {
		return fmt.Errorf("timer profile name cannot be empty")
	}
	_, err := s.db.SQL().ExecContext(ctx, `
		INSERT INTO timer_profiles
		(name, is_countdown, work_duration, is_break_enabled, break_duration,
		 is_long_break_enabled, long_break_duration, sessions_before_lb, work_break_ratio)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(name) DO UPDATE SET
		  is_countdown=excluded.is_countdown,
		  work_duration=excluded.work_duration,
		  is_break_enabled=excluded.is_break_enabled,
		  break_duration=excluded.break_duration,
		  is_long_break_enabled=excluded.is_long_break_enabled,
		  long_break_duration=excluded.long_break_duration,
		  sessions_before_lb=excluded.sessions_before_lb,
		  work_break_ratio=excluded.work_break_ratio`,
		p.Name, boolToInt(p.IsCountdown), p.WorkDuration,
		boolToInt(p.IsBreakEnabled), p.BreakDuration,
		boolToInt(p.IsLongBreakEnabled), p.LongBreakDuration,
		p.SessionsBeforeLongBreak, p.WorkBreakRatio)
	return err
}

// DeleteTimerProfile removes a timer profile (cannot delete the default).
func (s *Service) DeleteTimerProfile(ctx context.Context, name string) error {
	if name == database.DefaultTimerProfileName {
		return fmt.Errorf("cannot delete the default timer profile")
	}
	_, err := s.db.SQL().ExecContext(ctx, "DELETE FROM timer_profiles WHERE name=?", name)
	return err
}

// GetActiveProfile resolves the active timer profile for the engine.
// If the active label uses the default profile, the app's defaultTimerProfileName
// setting is used — so changing the default profile in Settings takes effect
// immediately on the next timer start.
func (s *Service) GetActiveProfile(ctx context.Context) (timer.Profile, error) {
	st, err := s.Get(ctx)
	if err != nil {
		return timer.DefaultProfile(), nil
	}

	// Determine which profile name to load
	var useDefault int
	var labelProfileName string
	err = s.db.SQL().QueryRowContext(ctx,
		"SELECT use_default_profile, timer_profile_name FROM labels WHERE name=?",
		st.ActiveLabelName).Scan(&useDefault, &labelProfileName)
	if err != nil {
		return timer.DefaultProfile(), nil
	}
	profileName := labelProfileName
	if useDefault == 1 {
		profileName = st.DefaultTimerProfileName
	}

	var (isCountdown, isBreak, isLongBreak int; p timer.Profile)
	err = s.db.SQL().QueryRowContext(ctx, `
		SELECT is_countdown, work_duration, is_break_enabled, break_duration,
		       is_long_break_enabled, long_break_duration, sessions_before_lb, work_break_ratio
		FROM timer_profiles WHERE name=?`, profileName).Scan(
		&isCountdown, &p.WorkDurationMin, &isBreak, &p.BreakDurationMin,
		&isLongBreak, &p.LongBreakDurationMin, &p.SessionsBeforeLongBreak, &p.WorkBreakRatio)
	if err != nil {
		return timer.DefaultProfile(), nil
	}
	p.IsCountdown = isCountdown == 1
	p.IsBreakEnabled = isBreak == 1
	p.IsLongBreakEnabled = isLongBreak == 1
	return p, nil
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
