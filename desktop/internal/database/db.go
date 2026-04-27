package database

import (
	"database/sql"
	"fmt"
	"strings"

	_ "modernc.org/sqlite" // pure-Go SQLite driver, no CGO required
)

// DB wraps the raw *sql.DB and exposes typed repository accessors.
type DB struct {
	sql *sql.DB
}

// Open opens (or creates) the SQLite database at the given path and runs migrations.
func Open(path string) (*DB, error) {
	sqlDB, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("sql.Open: %w", err)
	}
	// SQLite requires a single connection when using WAL mode from the same process.
	sqlDB.SetMaxOpenConns(1)
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}
	// Set pragmas explicitly — more reliable than DSN query params across drivers.
	for _, p := range []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	} {
		if _, err := sqlDB.Exec(p); err != nil {
			return nil, fmt.Errorf("pragma %q: %w", p, err)
		}
	}

	db := &DB{sql: sqlDB}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

// OpenInMemory opens an in-memory SQLite database (for tests).
func OpenInMemory() (*DB, error) {
	return Open(":memory:")
}

// Close closes the underlying connection.
func (db *DB) Close() error { return db.sql.Close() }

// SQL returns the raw *sql.DB (use sparingly — prefer typed methods).
func (db *DB) SQL() *sql.DB { return db.sql }

// migrate creates all tables if they do not already exist and runs additive ALTER TABLE migrations.
func (db *DB) migrate() error {
	const schema = `
CREATE TABLE IF NOT EXISTS timer_profiles (
    name                     TEXT PRIMARY KEY,
    is_countdown             INTEGER NOT NULL DEFAULT 1,
    work_duration            INTEGER NOT NULL DEFAULT 72,
    is_break_enabled         INTEGER NOT NULL DEFAULT 1,
    break_duration           INTEGER NOT NULL DEFAULT 5,
    is_long_break_enabled    INTEGER NOT NULL DEFAULT 0,
    long_break_duration      INTEGER NOT NULL DEFAULT 15,
    sessions_before_lb       INTEGER NOT NULL DEFAULT 4,
    work_break_ratio         INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS labels (
    name                TEXT PRIMARY KEY,
    color_index         INTEGER NOT NULL DEFAULT 0,
    order_index         INTEGER NOT NULL DEFAULT 0,
    use_default_profile INTEGER NOT NULL DEFAULT 1,
    timer_profile_name  TEXT NOT NULL DEFAULT '72/5',
    is_archived         INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (timer_profile_name) REFERENCES timer_profiles(name)
);

CREATE TABLE IF NOT EXISTS sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp      INTEGER NOT NULL,
    duration       INTEGER NOT NULL DEFAULT 0,
    interruptions  INTEGER NOT NULL DEFAULT 0,
    label_name     TEXT    NOT NULL DEFAULT 'Default',
    notes          TEXT    NOT NULL DEFAULT '',
    is_work        INTEGER NOT NULL DEFAULT 1,
    is_archived    INTEGER NOT NULL DEFAULT 0,
    device_name    TEXT    NOT NULL DEFAULT '',
    synced_at      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
    id                          INTEGER PRIMARY KEY CHECK (id = 1),
    active_label_name           TEXT    NOT NULL DEFAULT 'Default',
    default_timer_profile_name  TEXT    NOT NULL DEFAULT '72/5',
    theme                       TEXT    NOT NULL DEFAULT 'dark',
    work_finished_sound         TEXT    NOT NULL DEFAULT '',
    break_finished_sound        TEXT    NOT NULL DEFAULT '',
    auto_start_work             INTEGER NOT NULL DEFAULT 0,
    auto_start_break            INTEGER NOT NULL DEFAULT 0,
    enable_desktop_notifications INTEGER NOT NULL DEFAULT 1,
    cloud_backup_enabled        INTEGER NOT NULL DEFAULT 0,
    last_sync_timestamp         INTEGER NOT NULL DEFAULT 0
);

-- Ensure there is always exactly one settings row
INSERT OR IGNORE INTO app_settings (id) VALUES (1);
`
	if _, err := db.sql.Exec(schema); err != nil {
		return err
	}

	// Additive migrations — safe to run on existing databases.
	additiveMigrations := []string{
		// v2: scheduled cloud push time (e.g. "23:30" in HH:MM 24h format, empty = disabled)
		`ALTER TABLE app_settings ADD COLUMN cloud_sync_schedule TEXT NOT NULL DEFAULT ''`,
	}

	// One-shot table creation migrations (idempotent via IF NOT EXISTS).
	tableCreations := []string{
		// Cloud history cache: all entries fetched from pomodoro_app_history collection.
		`CREATE TABLE IF NOT EXISTS cloud_history_cache (
		    id          INTEGER PRIMARY KEY AUTOINCREMENT,
		    date_millis INTEGER NOT NULL,
		    label_name  TEXT    NOT NULL DEFAULT '',
		    minutes     INTEGER NOT NULL DEFAULT 0,
		    device_name TEXT    NOT NULL DEFAULT '',
		    fetched_at  INTEGER NOT NULL DEFAULT 0
		)`,
		// Cloud timeline cache: aggregated per-label per-date from timesheet_entries.
		`CREATE TABLE IF NOT EXISTS cloud_timeline_cache (
		    id          INTEGER PRIMARY KEY AUTOINCREMENT,
		    date_millis INTEGER NOT NULL,
		    label_name  TEXT    NOT NULL DEFAULT '',
		    minutes     INTEGER NOT NULL DEFAULT 0,
		    fetched_at  INTEGER NOT NULL DEFAULT 0,
		    UNIQUE(date_millis, label_name)
		)`,
	}
	for _, stmt := range tableCreations {
		if _, err := db.sql.Exec(stmt); err != nil {
			return err
		}
	}
	for _, stmt := range additiveMigrations {
		if _, err := db.sql.Exec(stmt); err != nil {
			// "duplicate column name" is expected on databases that already have the column.
			if !isDuplicateColumnErr(err) {
				return err
			}
		}
	}
	return nil
}

// isDuplicateColumnErr reports whether the SQLite error is "duplicate column name".
func isDuplicateColumnErr(err error) bool {
	return err != nil && strings.Contains(err.Error(), "duplicate column name")
}
