package sessions_test

import (
	"context"
	"testing"
	"time"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/sessions"
)

func setup(t *testing.T) (*sessions.Service, context.Context) {
	t.Helper()
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return sessions.NewService(db), context.Background()
}

func TestSaveSession_Persists(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.SaveSession(ctx, 25, "Default"); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}
	list, err := svc.List(ctx, sessions.ListRequest{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("want 1 session, got %d", len(list))
	}
	if list[0].Duration != 25 {
		t.Errorf("want duration 25, got %d", list[0].Duration)
	}
}

func TestSaveSession_ZeroDuration_NotSaved(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 0, "Default")
	list, _ := svc.List(ctx, sessions.ListRequest{})
	if len(list) != 0 {
		t.Error("zero-duration session should not be saved")
	}
}

func TestList_FilterByLabel(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 10, "A")
	_ = svc.SaveSession(ctx, 20, "B")

	list, err := svc.List(ctx, sessions.ListRequest{LabelNames: []string{"A"}})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 || list[0].LabelName != "A" {
		t.Errorf("expected 1 session with label A, got %v", list)
	}
}

func TestList_FilterByTimestamp(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 10, "X")
	future := time.Now().Add(time.Hour).UnixMilli()
	_ = svc.SaveSession(ctx, 20, "X")

	list, _ := svc.List(ctx, sessions.ListRequest{AfterMillis: future})
	if len(list) != 0 {
		t.Errorf("expected no sessions after future timestamp, got %d", len(list))
	}
}

func TestUpdate_ChangesFields(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 30, "Default")
	all, _ := svc.List(ctx, sessions.ListRequest{})
	id := all[0].ID

	err := svc.Update(ctx, sessions.UpdateRequest{
		ID:        id,
		Timestamp: all[0].Timestamp,
		Duration:  45,
		LabelName: "Focus",
		IsWork:    true,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}

	updated, _ := svc.List(ctx, sessions.ListRequest{})
	if updated[0].Duration != 45 {
		t.Errorf("want duration 45, got %d", updated[0].Duration)
	}
	if updated[0].LabelName != "Focus" {
		t.Errorf("want label Focus, got %s", updated[0].LabelName)
	}
}

func TestDelete_RemovesSessions(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 10, "A")
	_ = svc.SaveSession(ctx, 20, "B")
	all, _ := svc.List(ctx, sessions.ListRequest{})
	if len(all) != 2 {
		t.Fatalf("want 2 sessions before delete, got %d", len(all))
	}

	if err := svc.Delete(ctx, []int64{all[0].ID}); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	after, _ := svc.List(ctx, sessions.ListRequest{})
	if len(after) != 1 {
		t.Errorf("want 1 session after delete, got %d", len(after))
	}
}

func TestDelete_EmptyIDs_NoError(t *testing.T) {
	svc, ctx := setup(t)
	if err := svc.Delete(ctx, []int64{}); err != nil {
		t.Fatalf("Delete with empty ids: %v", err)
	}
}

func TestBulkEditLabel(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 10, "A")
	_ = svc.SaveSession(ctx, 20, "A")
	all, _ := svc.List(ctx, sessions.ListRequest{})

	ids := []int64{all[0].ID, all[1].ID}
	if err := svc.BulkEditLabel(ctx, sessions.BulkEditRequest{IDs: ids, LabelName: "B"}); err != nil {
		t.Fatalf("BulkEditLabel: %v", err)
	}
	updated, _ := svc.List(ctx, sessions.ListRequest{})
	for _, s := range updated {
		if s.LabelName != "B" {
			t.Errorf("expected all labels to be B, got %s", s.LabelName)
		}
	}
}

func TestGetSummary_CalculatesCorrectly(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 25, "Focus")
	_ = svc.SaveSession(ctx, 30, "Focus")

	sum, err := svc.GetSummary(ctx, sessions.SummaryRequest{})
	if err != nil {
		t.Fatalf("GetSummary: %v", err)
	}
	if sum.TotalWorkMinutes != 55 {
		t.Errorf("want 55 total work minutes, got %d", sum.TotalWorkMinutes)
	}
	if sum.SessionCount != 2 {
		t.Errorf("want 2 sessions, got %d", sum.SessionCount)
	}
	if sum.PerLabel["Focus"] != 55 {
		t.Errorf("want 55 minutes for Focus label, got %d", sum.PerLabel["Focus"])
	}
}

func TestGetSummary_AfterFilter(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 25, "A")
	future := time.Now().Add(time.Hour).UnixMilli()

	sum, _ := svc.GetSummary(ctx, sessions.SummaryRequest{AfterMillis: future})
	if sum.TotalWorkMinutes != 0 {
		t.Errorf("expected 0 after future cutoff, got %d", sum.TotalWorkMinutes)
	}
}

func TestGetTimeline_GroupsByDayAndLabel(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 25, "W1M")
	_ = svc.SaveSession(ctx, 10, "W1M")
	_ = svc.SaveSession(ctx, 15, "LTG")

	entries, err := svc.GetTimeline(ctx, sessions.TimelineRequest{})
	if err != nil {
		t.Fatalf("GetTimeline: %v", err)
	}
	totals := map[string]int64{}
	for _, e := range entries {
		totals[e.LabelName] += e.Minutes
	}
	if totals["W1M"] != 35 {
		t.Errorf("want 35 mins for W1M, got %d", totals["W1M"])
	}
	if totals["LTG"] != 15 {
		t.Errorf("want 15 mins for LTG, got %d", totals["LTG"])
	}
}

func TestExportImport_RoundTrip(t *testing.T) {
	svc, ctx := setup(t)
	_ = svc.SaveSession(ctx, 50, "Export")

	tmpFile := t.TempDir() + "/backup.json"
	if err := svc.ExportJSON(ctx, tmpFile); err != nil {
		t.Fatalf("ExportJSON: %v", err)
	}

	// Import into a fresh DB
	db2, _ := database.OpenInMemory()
	t.Cleanup(func() { db2.Close() })
	svc2 := sessions.NewService(db2)

	if err := svc2.ImportJSON(ctx, tmpFile); err != nil {
		t.Fatalf("ImportJSON: %v", err)
	}

	imported, _ := svc2.List(ctx, sessions.ListRequest{})
	if len(imported) != 1 {
		t.Errorf("want 1 session after import, got %d", len(imported))
	}
	if imported[0].LabelName != "Export" {
		t.Errorf("want label Export, got %s", imported[0].LabelName)
	}
}
