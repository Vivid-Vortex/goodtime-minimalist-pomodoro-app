package labels_test

import (
	"context"
	"testing"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/labels"
)

func setup(t *testing.T) (*labels.Service, context.Context) {
	t.Helper()
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	svc := labels.NewService(db)
	ctx := context.Background()

	if err := svc.SeedDefaults(ctx); err != nil {
		t.Fatalf("SeedDefaults: %v", err)
	}
	return svc, ctx
}

func TestSeedDefaults_CreatesDefaultLabel(t *testing.T) {
	svc, ctx := setup(t)
	lbls, err := svc.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll: %v", err)
	}
	if len(lbls) == 0 {
		t.Error("expected at least one label after seeding")
	}
	found := false
	for _, l := range lbls {
		if l.Name == database.DefaultLabelName {
			found = true
		}
	}
	if !found {
		t.Errorf("default label %q not found", database.DefaultLabelName)
	}
}

func TestCreate_AddsLabel(t *testing.T) {
	svc, ctx := setup(t)
	lbl, err := svc.Create(ctx, labels.CreateRequest{
		Name:              "Work",
		ColorIndex:        3,
		UseDefaultProfile: true,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if lbl.Name != "Work" {
		t.Errorf("want name Work, got %s", lbl.Name)
	}
	if lbl.ColorIndex != 3 {
		t.Errorf("want colorIndex 3, got %d", lbl.ColorIndex)
	}
}

func TestCreate_EmptyName_ReturnsError(t *testing.T) {
	svc, ctx := setup(t)
	if _, err := svc.Create(ctx, labels.CreateRequest{Name: ""}); err == nil {
		t.Error("expected error for empty name")
	}
}

func TestGetAll_ExcludesArchived(t *testing.T) {
	svc, ctx := setup(t)
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "Visible", UseDefaultProfile: true})
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "Hidden", UseDefaultProfile: true})
	_ = svc.Archive(ctx, "Hidden")

	lbls, err := svc.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll: %v", err)
	}
	for _, l := range lbls {
		if l.Name == "Hidden" {
			t.Error("archived label should not appear in GetAll")
		}
	}
}

func TestGetArchived_ReturnsArchivedLabels(t *testing.T) {
	svc, ctx := setup(t)
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "Arch", UseDefaultProfile: true})
	_ = svc.Archive(ctx, "Arch")

	archived, err := svc.GetArchived(ctx)
	if err != nil {
		t.Fatalf("GetArchived: %v", err)
	}
	found := false
	for _, l := range archived {
		if l.Name == "Arch" {
			found = true
			if !l.IsArchived {
				t.Error("label should have IsArchived=true")
			}
		}
	}
	if !found {
		t.Error("archived label not found in GetArchived")
	}
}

func TestUnarchive_RestoresLabel(t *testing.T) {
	svc, ctx := setup(t)
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "Restore", UseDefaultProfile: true})
	_ = svc.Archive(ctx, "Restore")
	_ = svc.Unarchive(ctx, "Restore")

	lbls, err := svc.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll: %v", err)
	}
	found := false
	for _, l := range lbls {
		if l.Name == "Restore" {
			found = true
		}
	}
	if !found {
		t.Error("unarchived label not visible in GetAll")
	}
}

func TestDelete_RemovesLabel(t *testing.T) {
	svc, ctx := setup(t)
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "Temp", UseDefaultProfile: true})
	if err := svc.Delete(ctx, "Temp"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	lbls, _ := svc.GetAll(ctx)
	for _, l := range lbls {
		if l.Name == "Temp" {
			t.Error("deleted label still present")
		}
	}
}

func TestDelete_DefaultLabel_ReturnsError(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.Delete(ctx, database.DefaultLabelName); err == nil {
		t.Error("expected error deleting default label")
	}
}

func TestArchive_DefaultLabel_ReturnsError(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.Archive(ctx, database.DefaultLabelName); err == nil {
		t.Error("expected error archiving default label")
	}
}

func TestUpdate_ChangesColor(t *testing.T) {
	svc, ctx := setup(t)
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "Color", ColorIndex: 1, UseDefaultProfile: true})
	if err := svc.Update(ctx, labels.UpdateRequest{
		Name:              "Color",
		ColorIndex:        7,
		UseDefaultProfile: true,
	}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	l, err := svc.GetByName(ctx, "Color")
	if err != nil {
		t.Fatalf("GetByName: %v", err)
	}
	if l.ColorIndex != 7 {
		t.Errorf("want colorIndex 7, got %d", l.ColorIndex)
	}
}

func TestReorder_UpdatesOrderIndex(t *testing.T) {
	svc, ctx := setup(t)
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "A", UseDefaultProfile: true})
	_, _ = svc.Create(ctx, labels.CreateRequest{Name: "B", UseDefaultProfile: true})
	_ = svc.Reorder(ctx, []string{"B", "A", database.DefaultLabelName})

	lbls, _ := svc.GetAll(ctx)
	// "B" should now come first
	if len(lbls) > 0 && lbls[0].Name != "B" {
		t.Errorf("expected B first after reorder, got %s", lbls[0].Name)
	}
}

func TestCreate_WithCustomProfile(t *testing.T) {
	svc, ctx := setup(t)
	profile := database.TimerProfile{
		Name:         "Custom/10",
		IsCountdown:  true,
		WorkDuration: 45,
		BreakDuration: 10,
		IsBreakEnabled: true,
	}
	lbl, err := svc.Create(ctx, labels.CreateRequest{
		Name:              "CustomWork",
		UseDefaultProfile: false,
		TimerProfile:      profile,
	})
	if err != nil {
		t.Fatalf("Create with custom profile: %v", err)
	}
	if lbl.UseDefaultProfile {
		t.Error("expected UseDefaultProfile=false")
	}
	if lbl.TimerProfile.WorkDuration != 45 {
		t.Errorf("want work duration 45, got %d", lbl.TimerProfile.WorkDuration)
	}
}
