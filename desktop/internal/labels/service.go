package labels

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
)

// CreateRequest holds fields for creating a new label.
type CreateRequest struct {
	Name              string               `json:"name"`
	ColorIndex        int                  `json:"colorIndex"`
	UseDefaultProfile bool                 `json:"useDefaultProfile"`
	TimerProfile      database.TimerProfile `json:"timerProfile"`
}

// UpdateRequest holds fields that may be changed on an existing label.
type UpdateRequest struct {
	Name              string               `json:"name"`
	ColorIndex        int                  `json:"colorIndex"`
	UseDefaultProfile bool                 `json:"useDefaultProfile"`
	TimerProfile      database.TimerProfile `json:"timerProfile"`
}

// Service provides label management operations.
type Service struct {
	db *database.DB
}

// NewService creates a new Service backed by db.
func NewService(db *database.DB) *Service { return &Service{db: db} }

// SeedDefaults inserts the default label and timer profile if they don't exist.
func (s *Service) SeedDefaults(ctx context.Context) error {
	db := s.db.SQL()

	// Seed default timer profile
	_, err := db.ExecContext(ctx, `
		INSERT OR IGNORE INTO timer_profiles
		(name, is_countdown, work_duration, is_break_enabled, break_duration,
		 is_long_break_enabled, long_break_duration, sessions_before_lb, work_break_ratio)
		VALUES (?, 1, 72, 1, 5, 0, 15, 4, 3)`, database.DefaultTimerProfileName)
	if err != nil {
		return fmt.Errorf("seed timer profile: %w", err)
	}

	// Seed default label
	_, err = db.ExecContext(ctx, `
		INSERT OR IGNORE INTO labels (name, color_index, order_index, use_default_profile, timer_profile_name, is_archived)
		VALUES (?, 0, 0, 1, ?, 0)`, database.DefaultLabelName, database.DefaultTimerProfileName)
	if err != nil {
		return fmt.Errorf("seed label: %w", err)
	}

	// Seed built-in extra profiles
	extras := []database.TimerProfile{
		{Name: "90/5", IsCountdown: true, WorkDuration: 90, IsBreakEnabled: true, BreakDuration: 5, SessionsBeforeLongBreak: 4, WorkBreakRatio: 3},
		{Name: "25/5", IsCountdown: true, WorkDuration: 25, IsBreakEnabled: true, BreakDuration: 5, IsLongBreakEnabled: true, LongBreakDuration: 15, SessionsBeforeLongBreak: 4, WorkBreakRatio: 3},
	}
	for _, p := range extras {
		_, err = db.ExecContext(ctx, `
			INSERT OR IGNORE INTO timer_profiles
			(name, is_countdown, work_duration, is_break_enabled, break_duration,
			 is_long_break_enabled, long_break_duration, sessions_before_lb, work_break_ratio)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			p.Name, boolToInt(p.IsCountdown), p.WorkDuration,
			boolToInt(p.IsBreakEnabled), p.BreakDuration,
			boolToInt(p.IsLongBreakEnabled), p.LongBreakDuration,
			p.SessionsBeforeLongBreak, p.WorkBreakRatio)
		if err != nil {
			return fmt.Errorf("seed profile %s: %w", p.Name, err)
		}
	}
	return nil
}

// GetAll returns all non-archived labels ordered by order_index.
func (s *Service) GetAll(ctx context.Context) ([]database.Label, error) {
	return s.query(ctx, "WHERE l.is_archived = 0 ORDER BY l.order_index ASC")
}

// GetArchived returns archived labels.
func (s *Service) GetArchived(ctx context.Context) ([]database.Label, error) {
	return s.query(ctx, "WHERE l.is_archived = 1 ORDER BY l.name ASC")
}

// Create inserts a new label.
func (s *Service) Create(ctx context.Context, req CreateRequest) (database.Label, error) {
	if strings.TrimSpace(req.Name) == "" {
		return database.Label{}, fmt.Errorf("label name cannot be empty")
	}

	profileName := req.TimerProfile.Name
	if req.UseDefaultProfile {
		profileName = database.DefaultTimerProfileName
	} else {
		// Upsert the embedded timer profile
		if err := s.upsertProfile(ctx, req.TimerProfile); err != nil {
			return database.Label{}, err
		}
	}

	var maxOrder int
	_ = s.db.SQL().QueryRowContext(ctx, "SELECT COALESCE(MAX(order_index),0) FROM labels").Scan(&maxOrder)

	_, err := s.db.SQL().ExecContext(ctx, `
		INSERT INTO labels (name, color_index, order_index, use_default_profile, timer_profile_name, is_archived)
		VALUES (?, ?, ?, ?, ?, 0)`,
		req.Name, req.ColorIndex, maxOrder+1, boolToInt(req.UseDefaultProfile), profileName)
	if err != nil {
		return database.Label{}, fmt.Errorf("insert label: %w", err)
	}
	labels, err := s.query(ctx, "WHERE l.name = ?", req.Name)
	if err != nil || len(labels) == 0 {
		return database.Label{}, fmt.Errorf("fetch created label: %w", err)
	}
	return labels[0], nil
}

// Update updates mutable fields of an existing label.
func (s *Service) Update(ctx context.Context, req UpdateRequest) error {
	profileName := req.TimerProfile.Name
	if req.UseDefaultProfile {
		profileName = database.DefaultTimerProfileName
	} else {
		if err := s.upsertProfile(ctx, req.TimerProfile); err != nil {
			return err
		}
	}
	_, err := s.db.SQL().ExecContext(ctx, `
		UPDATE labels SET color_index=?, use_default_profile=?, timer_profile_name=?
		WHERE name=?`,
		req.ColorIndex, boolToInt(req.UseDefaultProfile), profileName, req.Name)
	return err
}

// Delete removes a label by name (cannot delete the default label).
func (s *Service) Delete(ctx context.Context, name string) error {
	if name == database.DefaultLabelName {
		return fmt.Errorf("cannot delete the default label")
	}
	_, err := s.db.SQL().ExecContext(ctx, "DELETE FROM labels WHERE name=?", name)
	return err
}

// Archive soft-deletes a label.
func (s *Service) Archive(ctx context.Context, name string) error {
	if name == database.DefaultLabelName {
		return fmt.Errorf("cannot archive the default label")
	}
	_, err := s.db.SQL().ExecContext(ctx, "UPDATE labels SET is_archived=1 WHERE name=?", name)
	return err
}

// Unarchive restores an archived label.
func (s *Service) Unarchive(ctx context.Context, name string) error {
	_, err := s.db.SQL().ExecContext(ctx, "UPDATE labels SET is_archived=0 WHERE name=?", name)
	return err
}

// Reorder updates order_index for each label according to the given slice order.
func (s *Service) Reorder(ctx context.Context, names []string) error {
	tx, err := s.db.SQL().BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	for i, name := range names {
		if _, err := tx.ExecContext(ctx, "UPDATE labels SET order_index=? WHERE name=?", i, name); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func (s *Service) query(ctx context.Context, where string, args ...interface{}) ([]database.Label, error) {
	q := `
		SELECT l.name, l.color_index, l.order_index, l.use_default_profile,
		       tp.name, tp.is_countdown, tp.work_duration, tp.is_break_enabled,
		       tp.break_duration, tp.is_long_break_enabled, tp.long_break_duration,
		       tp.sessions_before_lb, tp.work_break_ratio, l.is_archived
		FROM labels l
		JOIN timer_profiles tp ON tp.name = l.timer_profile_name ` + where

	rows, err := s.db.SQL().QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []database.Label
	for rows.Next() {
		var l database.Label
		var tp database.TimerProfile
		var useDefault, isCountdown, isBreakEnabled, isLongBreak, isArchived int
		if err := rows.Scan(
			&l.Name, &l.ColorIndex, &l.OrderIndex, &useDefault,
			&tp.Name, &isCountdown, &tp.WorkDuration, &isBreakEnabled,
			&tp.BreakDuration, &isLongBreak, &tp.LongBreakDuration,
			&tp.SessionsBeforeLongBreak, &tp.WorkBreakRatio, &isArchived,
		); err != nil {
			return nil, err
		}
		l.UseDefaultProfile = useDefault == 1
		tp.IsCountdown = isCountdown == 1
		tp.IsBreakEnabled = isBreakEnabled == 1
		tp.IsLongBreakEnabled = isLongBreak == 1
		l.IsArchived = isArchived == 1
		l.TimerProfile = tp
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *Service) upsertProfile(ctx context.Context, p database.TimerProfile) error {
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

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// GetByName returns a single label (used internally).
func (s *Service) GetByName(ctx context.Context, name string) (*database.Label, error) {
	ls, err := s.query(ctx, "WHERE l.name = ?", name)
	if err != nil {
		return nil, err
	}
	if len(ls) == 0 {
		return nil, sql.ErrNoRows
	}
	return &ls[0], nil
}
