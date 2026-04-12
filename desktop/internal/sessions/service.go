package sessions

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
)

// ListRequest defines filters for querying sessions.
type ListRequest struct {
	LabelNames  []string `json:"labelNames"`  // empty = all labels
	AfterMillis int64    `json:"afterMillis"`  // 0 = no filter
	OnlyWork    bool     `json:"onlyWork"`
	Limit       int      `json:"limit"`  // 0 = no limit
	Offset      int      `json:"offset"`
}

// UpdateRequest carries editable session fields.
type UpdateRequest struct {
	ID            int64  `json:"id"`
	Timestamp     int64  `json:"timestamp"`
	Duration      int64  `json:"duration"`
	Interruptions int64  `json:"interruptions"`
	LabelName     string `json:"labelName"`
	Notes         string `json:"notes"`
	IsWork        bool   `json:"isWork"`
}

// BulkEditRequest carries the new label and the set of session IDs to update.
type BulkEditRequest struct {
	IDs       []int64 `json:"ids"`
	LabelName string  `json:"labelName"`
}

// SummaryRequest specifies the time range for statistics.
type SummaryRequest struct {
	AfterMillis int64 `json:"afterMillis"`
}

// Summary holds aggregated statistics.
type Summary struct {
	TotalWorkMinutes  int64            `json:"totalWorkMinutes"`
	TotalBreakMinutes int64            `json:"totalBreakMinutes"`
	SessionCount      int              `json:"sessionCount"`
	PerLabel          map[string]int64 `json:"perLabel"` // label → work minutes
}

// TimelineRequest specifies grouping for the timeline view.
type TimelineRequest struct {
	LabelNames  []string `json:"labelNames"`
	AfterMillis int64    `json:"afterMillis"`
}

// TimelineEntry is one date+label aggregation row.
type TimelineEntry struct {
	DateMillis int64  `json:"dateMillis"` // midnight UTC of the date
	LabelName  string `json:"labelName"`
	Minutes    int64  `json:"minutes"`
}

// Service provides session management and statistics.
type Service struct {
	db *database.DB
}

// NewService creates a new Service backed by db.
func NewService(db *database.DB) *Service { return &Service{db: db} }

// SaveSession persists a new work session (called by the timer engine).
func (s *Service) SaveSession(ctx context.Context, durationMinutes int64, labelName string) error {
	if durationMinutes <= 0 {
		return nil
	}
	deviceName := deviceNameOnce()
	_, err := s.db.SQL().ExecContext(ctx, `
		INSERT INTO sessions (timestamp, duration, interruptions, label_name, notes, is_work, is_archived, device_name)
		VALUES (?, ?, 0, ?, '', 1, 0, ?)`,
		time.Now().UnixMilli(), durationMinutes, labelName, deviceName)
	return err
}

// List returns sessions matching the given filters.
func (s *Service) List(ctx context.Context, req ListRequest) ([]database.Session, error) {
	q := `SELECT id, timestamp, duration, interruptions, label_name, notes, is_work, is_archived, device_name
	      FROM sessions WHERE 1=1`
	args := []interface{}{}

	if len(req.LabelNames) > 0 {
		ph := placeholders(len(req.LabelNames))
		q += " AND label_name IN (" + ph + ")"
		for _, l := range req.LabelNames {
			args = append(args, l)
		}
	}
	if req.AfterMillis > 0 {
		q += " AND timestamp > ?"
		args = append(args, req.AfterMillis)
	}
	if req.OnlyWork {
		q += " AND is_work = 1"
	}
	q += " ORDER BY timestamp DESC"
	if req.Limit > 0 {
		q += fmt.Sprintf(" LIMIT %d OFFSET %d", req.Limit, req.Offset)
	}

	rows, err := s.db.SQL().QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []database.Session
	for rows.Next() {
		var sess database.Session
		var isWork, isArchived int
		if err := rows.Scan(
			&sess.ID, &sess.Timestamp, &sess.Duration, &sess.Interruptions,
			&sess.LabelName, &sess.Notes, &isWork, &isArchived, &sess.DeviceName,
		); err != nil {
			return nil, err
		}
		sess.IsWork = isWork == 1
		sess.IsArchived = isArchived == 1
		out = append(out, sess)
	}
	return out, rows.Err()
}

// Update modifies a session record.
func (s *Service) Update(ctx context.Context, req UpdateRequest) error {
	_, err := s.db.SQL().ExecContext(ctx, `
		UPDATE sessions SET timestamp=?, duration=?, interruptions=?, label_name=?, notes=?, is_work=?
		WHERE id=?`,
		req.Timestamp, req.Duration, req.Interruptions, req.LabelName, req.Notes,
		boolToInt(req.IsWork), req.ID)
	return err
}

// Delete removes sessions by their IDs.
func (s *Service) Delete(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	q := "DELETE FROM sessions WHERE id IN (" + placeholders(len(ids)) + ")"
	args := int64SliceToAny(ids)
	_, err := s.db.SQL().ExecContext(ctx, q, args...)
	return err
}

// BulkEditLabel updates the label on a set of sessions.
func (s *Service) BulkEditLabel(ctx context.Context, req BulkEditRequest) error {
	if len(req.IDs) == 0 {
		return nil
	}
	q := "UPDATE sessions SET label_name=? WHERE id IN (" + placeholders(len(req.IDs)) + ")"
	args := []interface{}{req.LabelName}
	for _, id := range req.IDs {
		args = append(args, id)
	}
	_, err := s.db.SQL().ExecContext(ctx, q, args...)
	return err
}

// InsertRaw inserts a session with full control over all fields (used by tests and import).
func (s *Service) InsertRaw(ctx context.Context, sess database.Session) error {
	_, err := s.db.SQL().ExecContext(ctx, `
		INSERT OR IGNORE INTO sessions
		(id, timestamp, duration, interruptions, label_name, notes, is_work, is_archived, device_name, synced_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
		sess.ID, sess.Timestamp, sess.Duration, sess.Interruptions,
		sess.LabelName, sess.Notes, boolToInt(sess.IsWork), boolToInt(sess.IsArchived), sess.DeviceName)
	return err
}

// ListUnsynced returns sessions that have not yet been pushed to Firestore.
func (s *Service) ListUnsynced(ctx context.Context) ([]database.Session, error) {
	rows, err := s.db.SQL().QueryContext(ctx, `
		SELECT id, timestamp, duration, interruptions, label_name, notes, is_work, is_archived, device_name
		FROM sessions WHERE synced_at = 0 ORDER BY timestamp ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []database.Session
	for rows.Next() {
		var sess database.Session
		var isWork, isArchived int
		if err := rows.Scan(
			&sess.ID, &sess.Timestamp, &sess.Duration, &sess.Interruptions,
			&sess.LabelName, &sess.Notes, &isWork, &isArchived, &sess.DeviceName,
		); err != nil {
			return nil, err
		}
		sess.IsWork = isWork == 1
		sess.IsArchived = isArchived == 1
		out = append(out, sess)
	}
	return out, rows.Err()
}

// MarkSynced sets synced_at = now for the given session IDs.
func (s *Service) MarkSynced(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	now := time.Now().UnixMilli()
	q := "UPDATE sessions SET synced_at=? WHERE id IN (" + placeholders(len(ids)) + ")"
	args := []interface{}{now}
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.SQL().ExecContext(ctx, q, args...)
	return err
}

// GetSummary returns aggregated statistics for sessions after the given time.
func (s *Service) GetSummary(ctx context.Context, req SummaryRequest) (Summary, error) {
	var sum Summary
	sum.PerLabel = make(map[string]int64)

	baseQuery := "FROM sessions WHERE is_archived=0"
	args := []interface{}{}
	if req.AfterMillis > 0 {
		baseQuery += " AND timestamp > ?"
		args = append(args, req.AfterMillis)
	}

	row := s.db.SQL().QueryRowContext(ctx,
		"SELECT COALESCE(SUM(CASE WHEN is_work=1 THEN duration ELSE 0 END),0), "+
			"COALESCE(SUM(CASE WHEN is_work=0 THEN duration ELSE 0 END),0), COUNT(*) "+baseQuery,
		args...)
	if err := row.Scan(&sum.TotalWorkMinutes, &sum.TotalBreakMinutes, &sum.SessionCount); err != nil {
		return sum, err
	}

	rows, err := s.db.SQL().QueryContext(ctx,
		"SELECT label_name, COALESCE(SUM(duration),0) "+baseQuery+" AND is_work=1 GROUP BY label_name",
		args...)
	if err != nil {
		return sum, err
	}
	defer rows.Close()
	for rows.Next() {
		var label string
		var mins int64
		if err := rows.Scan(&label, &mins); err != nil {
			return sum, err
		}
		sum.PerLabel[label] = mins
	}
	return sum, rows.Err()
}

// GetTimeline returns per-day, per-label minute aggregations.
func (s *Service) GetTimeline(ctx context.Context, req TimelineRequest) ([]TimelineEntry, error) {
	q := `
		SELECT
		  (timestamp / 86400000) * 86400000 AS day_millis,
		  label_name,
		  SUM(duration) AS minutes
		FROM sessions
		WHERE is_work=1 AND is_archived=0`
	args := []interface{}{}

	if len(req.LabelNames) > 0 {
		q += " AND label_name IN (" + placeholders(len(req.LabelNames)) + ")"
		for _, l := range req.LabelNames {
			args = append(args, l)
		}
	}
	if req.AfterMillis > 0 {
		q += " AND timestamp > ?"
		args = append(args, req.AfterMillis)
	}
	q += " GROUP BY day_millis, label_name ORDER BY day_millis DESC, label_name ASC"

	rows, err := s.db.SQL().QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []TimelineEntry
	for rows.Next() {
		var e TimelineEntry
		if err := rows.Scan(&e.DateMillis, &e.LabelName, &e.Minutes); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ExportJSON serialises all sessions to a JSON file at path.
func (s *Service) ExportJSON(ctx context.Context, path string) error {
	sessions, err := s.List(ctx, ListRequest{})
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(sessions, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// ImportJSON loads sessions from a JSON file into the database.
func (s *Service) ImportJSON(ctx context.Context, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var sessions []database.Session
	if err := json.Unmarshal(data, &sessions); err != nil {
		return fmt.Errorf("parse backup: %w", err)
	}
	tx, err := s.db.SQL().BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	for _, sess := range sessions {
		_, err := tx.ExecContext(ctx, `
			INSERT OR IGNORE INTO sessions
			(id, timestamp, duration, interruptions, label_name, notes, is_work, is_archived, device_name)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			sess.ID, sess.Timestamp, sess.Duration, sess.Interruptions,
			sess.LabelName, sess.Notes, boolToInt(sess.IsWork), boolToInt(sess.IsArchived), sess.DeviceName)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func placeholders(n int) string {
	if n == 0 {
		return ""
	}
	s := "?"
	for i := 1; i < n; i++ {
		s += ",?"
	}
	return s
}

func int64SliceToAny(ids []int64) []interface{} {
	out := make([]interface{}, len(ids))
	for i, id := range ids {
		out[i] = id
	}
	return out
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

var _deviceName string

func deviceNameOnce() string {
	if _deviceName != "" {
		return _deviceName
	}
	h, err := os.Hostname()
	if err != nil {
		h = "desktop"
	}
	_deviceName = h
	return _deviceName
}
