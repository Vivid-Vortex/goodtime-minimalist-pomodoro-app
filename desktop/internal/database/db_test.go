package database_test

import (
	"testing"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
)

func TestOpenInMemory(t *testing.T) {
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	defer db.Close()

	if err := db.SQL().Ping(); err != nil {
		t.Fatalf("Ping after open: %v", err)
	}
}

func TestMigration_TablesExist(t *testing.T) {
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	defer db.Close()

	tables := []string{"timer_profiles", "labels", "sessions", "app_settings"}
	for _, table := range tables {
		var name string
		row := db.SQL().QueryRow(
			"SELECT name FROM sqlite_master WHERE type='table' AND name=?", table,
		)
		if err := row.Scan(&name); err != nil {
			t.Errorf("table %q not found: %v", table, err)
		}
	}
}

func TestMigration_SettingsRowExists(t *testing.T) {
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	defer db.Close()

	var count int
	if err := db.SQL().QueryRow("SELECT COUNT(*) FROM app_settings").Scan(&count); err != nil {
		t.Fatalf("count settings: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 settings row, got %d", count)
	}
}

func TestMigration_Idempotent(t *testing.T) {
	// Opening the same in-memory DB twice (different connections) should not error
	db1, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("first open: %v", err)
	}
	defer db1.Close()

	db2, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("second open: %v", err)
	}
	defer db2.Close()
}
