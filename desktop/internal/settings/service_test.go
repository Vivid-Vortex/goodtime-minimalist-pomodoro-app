package settings_test

import (
	"context"
	"testing"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/labels"
	"github.com/adrcotfas/goodtime/desktop/internal/settings"
)

func setup(t *testing.T) (*settings.Service, context.Context) {
	t.Helper()
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	// Seed defaults so label/profile FK constraints are satisfied
	lblSvc := labels.NewService(db)
	ctx := context.Background()
	if err := lblSvc.SeedDefaults(ctx); err != nil {
		t.Fatalf("SeedDefaults: %v", err)
	}
	return settings.NewService(db), ctx
}

func TestGet_ReturnsDefaults(t *testing.T) {
	svc, ctx := setup(t)
	st, err := svc.Get(ctx)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if st.ActiveLabelName != database.DefaultLabelName {
		t.Errorf("want default label, got %s", st.ActiveLabelName)
	}
	if st.Theme != "dark" {
		t.Errorf("want theme=dark, got %s", st.Theme)
	}
}

func TestUpdate_PersistsChanges(t *testing.T) {
	svc, ctx := setup(t)
	err := svc.Update(ctx, settings.UpdateRequest{
		Theme:                      "light",
		AutoStartWork:              true,
		EnableDesktopNotifications: false,
		DefaultTimerProfileName:    database.DefaultTimerProfileName,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	st, _ := svc.Get(ctx)
	if st.Theme != "light" {
		t.Errorf("want theme=light, got %s", st.Theme)
	}
	if !st.AutoStartWork {
		t.Error("want AutoStartWork=true")
	}
}

func TestSetActiveLabel_Persists(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.SetActiveLabel(ctx, "W1M"); err != nil {
		t.Fatalf("SetActiveLabel: %v", err)
	}
	name, err := svc.GetActiveLabel(ctx)
	if err != nil {
		t.Fatalf("GetActiveLabel: %v", err)
	}
	if name != "W1M" {
		t.Errorf("want W1M, got %s", name)
	}
}

func TestGetTimerProfiles_ReturnsSeededProfiles(t *testing.T) {
	svc, ctx := setup(t)
	profiles, err := svc.GetTimerProfiles(ctx)
	if err != nil {
		t.Fatalf("GetTimerProfiles: %v", err)
	}
	if len(profiles) == 0 {
		t.Error("expected at least one seeded profile")
	}
	found := false
	for _, p := range profiles {
		if p.Name == database.DefaultTimerProfileName {
			found = true
		}
	}
	if !found {
		t.Errorf("default profile %q not found", database.DefaultTimerProfileName)
	}
}

func TestSaveTimerProfile_AddsProfile(t *testing.T) {
	svc, ctx := setup(t)
	p := database.TimerProfile{
		Name:         "Custom/15",
		IsCountdown:  true,
		WorkDuration: 90,
		BreakDuration: 15,
		IsBreakEnabled: true,
	}
	if err := svc.SaveTimerProfile(ctx, p); err != nil {
		t.Fatalf("SaveTimerProfile: %v", err)
	}
	profiles, _ := svc.GetTimerProfiles(ctx)
	found := false
	for _, pr := range profiles {
		if pr.Name == "Custom/15" && pr.WorkDuration == 90 {
			found = true
		}
	}
	if !found {
		t.Error("saved profile not found")
	}
}

func TestSaveTimerProfile_EmptyName_Error(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.SaveTimerProfile(ctx, database.TimerProfile{Name: ""}); err == nil {
		t.Error("expected error for empty profile name")
	}
}

func TestSaveTimerProfile_UpdatesExisting(t *testing.T) {
	svc, ctx := setup(t)
	p := database.TimerProfile{
		Name:         database.DefaultTimerProfileName,
		IsCountdown:  true,
		WorkDuration: 50,
		IsBreakEnabled: true,
		BreakDuration: 5,
	}
	if err := svc.SaveTimerProfile(ctx, p); err != nil {
		t.Fatalf("SaveTimerProfile update: %v", err)
	}
	profiles, _ := svc.GetTimerProfiles(ctx)
	for _, pr := range profiles {
		if pr.Name == database.DefaultTimerProfileName && pr.WorkDuration == 50 {
			return // pass
		}
	}
	t.Error("updated work duration not found")
}

func TestDeleteTimerProfile_Removes(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveTimerProfile(ctx, database.TimerProfile{Name: "ToDelete", IsCountdown: true, WorkDuration: 30})
	if err := svc.DeleteTimerProfile(ctx, "ToDelete"); err != nil {
		t.Fatalf("DeleteTimerProfile: %v", err)
	}
	profiles, _ := svc.GetTimerProfiles(ctx)
	for _, p := range profiles {
		if p.Name == "ToDelete" {
			t.Error("deleted profile still present")
		}
	}
}

func TestDeleteTimerProfile_DefaultProfile_Error(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.DeleteTimerProfile(ctx, database.DefaultTimerProfileName); err == nil {
		t.Error("expected error deleting default profile")
	}
}

func TestSetLastSyncTimestamp_Persists(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.SetLastSyncTimestamp(ctx, 12345678); err != nil {
		t.Fatalf("SetLastSyncTimestamp: %v", err)
	}
	st, _ := svc.Get(ctx)
	if st.LastSyncTimestamp != 12345678 {
		t.Errorf("want 12345678, got %d", st.LastSyncTimestamp)
	}
}

func TestGetActiveProfile_ReturnsDefault_WhenLabelNotFound(t *testing.T) {
	svc, ctx := setup(t)
	// Set an active label that doesn't exist in labels table
	_ = svc.SetActiveLabel(ctx, "NonExistent")
	p, err := svc.GetActiveProfile(ctx)
	if err != nil {
		t.Fatalf("GetActiveProfile: %v", err)
	}
	// Should fall back to default
	if p.WorkDurationMin == 0 {
		t.Error("expected non-zero default work duration")
	}
}
