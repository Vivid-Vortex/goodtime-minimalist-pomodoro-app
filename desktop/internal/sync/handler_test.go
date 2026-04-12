package sync_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/labels"
	"github.com/adrcotfas/goodtime/desktop/internal/sessions"
	"github.com/adrcotfas/goodtime/desktop/internal/sync"
)

// ─── test helpers ─────────────────────────────────────────────────────────────

func setupDB(t *testing.T) (*database.DB, *sessions.Service) {
	t.Helper()
	db, err := database.OpenInMemory()
	if err != nil {
		t.Fatalf("OpenInMemory: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	lblSvc := labels.NewService(db)
	_ = lblSvc.SeedDefaults(context.Background())
	return db, sessions.NewService(db)
}

// mockServer builds an httptest.Server that records PATCH bodies and returns canned GET responses.
type mockServer struct {
	getResponse  map[string]string // docID → raw JSON body (nil = 404)
	patchBodies  map[string]string // docID → last received PATCH body
	server       *httptest.Server
}

func newMockServer() *mockServer {
	ms := &mockServer{
		getResponse: map[string]string{},
		patchBodies: map[string]string{},
	}
	ms.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract last path segment as the doc ID
		parts := strings.Split(r.URL.Path, "/")
		docID := parts[len(parts)-1]

		switch r.Method {
		case http.MethodGet:
			if body, ok := ms.getResponse[docID]; ok {
				w.Header().Set("Content-Type", "application/json")
				w.Write([]byte(body))
			} else {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte(`{"error":{"code":404}}`))
			}
		case http.MethodPatch:
			var buf strings.Builder
			if r.Body != nil {
				dec := json.NewDecoder(r.Body)
				var m interface{}
				_ = dec.Decode(&m)
				b, _ := json.Marshal(m)
				buf.Write(b)
			}
			ms.patchBodies[docID] = buf.String()
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"name":"projects/test/documents/x/` + docID + `"}`))
		}
	}))
	return ms
}

func (ms *mockServer) close() { ms.server.Close() }

// wrapClient creates a sync.Client pointing at the mock server (exported via test helper).
func wrapClient(ms *mockServer) *http.Client {
	return ms.server.Client()
}

// ─── unit tests: millisToDocID ────────────────────────────────────────────────

func TestMillisToDocID_BasicConversion(t *testing.T) {
	// Oct 29, 2025 midnight UTC = 1761696000000 ms
	got := sync.ExportedMillisToDocID(1761696000000)
	if got != "29-10-2025" {
		t.Errorf("want 29-10-2025, got %s", got)
	}
}

// suppress unused import
var _ = time.Now

// ─── unit tests: Firestore value conversion ───────────────────────────────────

func TestFirestoreConversion_RoundTrip(t *testing.T) {
	// We test via the internal exported function (package-level test).
	// Access via the exported newTestClient path.
	ms := newMockServer()
	defer ms.close()

	// Prime a GET response for "doc1" with a known Firestore-format doc
	docBody := `{
		"fields": {
			"name":   {"stringValue": "hello"},
			"count":  {"integerValue": "42"},
			"active": {"booleanValue": true},
			"nested": {"mapValue": {"fields": {"x": {"integerValue": "7"}}}}
		}
	}`
	ms.getResponse["doc1"] = docBody

	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	doc, err := client.GetDocument(context.Background(), "col", "doc1")
	if err != nil {
		t.Fatalf("GetDocument: %v", err)
	}
	if doc["name"] != "hello" {
		t.Errorf("string: want hello, got %v", doc["name"])
	}
	if doc["count"] != int64(42) {
		t.Errorf("int: want 42, got %v (%T)", doc["count"], doc["count"])
	}
	if doc["active"] != true {
		t.Errorf("bool: want true, got %v", doc["active"])
	}
	nested, ok := doc["nested"].(map[string]interface{})
	if !ok || nested["x"] != int64(7) {
		t.Errorf("nested map: want x=7, got %v", nested)
	}
}

func TestGetDocument_NotFound_ReturnsNil(t *testing.T) {
	ms := newMockServer()
	defer ms.close()
	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	doc, err := client.GetDocument(context.Background(), "col", "missing")
	if err != nil {
		t.Fatalf("unexpected error for 404: %v", err)
	}
	if doc != nil {
		t.Error("expected nil doc for 404")
	}
}

func TestSetDocument_SendsPATCH(t *testing.T) {
	ms := newMockServer()
	defer ms.close()
	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)

	data := map[string]interface{}{"key": "val", "num": int64(5)}
	if err := client.SetDocument(context.Background(), "col", "docX", data); err != nil {
		t.Fatalf("SetDocument: %v", err)
	}
	body := ms.patchBodies["docX"]
	if body == "" {
		t.Error("expected PATCH body, got empty string")
	}
	if !strings.Contains(body, "stringValue") {
		t.Errorf("expected Firestore wire format in body, got: %s", body)
	}
}

// ─── integration-style tests: Handler.Push ────────────────────────────────────

func TestPush_NoUnsyncedSessions_NoOp(t *testing.T) {
	db, sessSvc := setupDB(t)
	ms := newMockServer()
	defer ms.close()
	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	handler := sync.NewTestHandlerForTest(client, sessSvc, db, "testdevice")

	status, err := handler.Push(context.Background())
	if err != nil {
		t.Fatalf("Push: %v", err)
	}
	if status.DocsCreated != 0 || status.DocsUpdated != 0 {
		t.Errorf("expected no docs touched, got created=%d updated=%d", status.DocsCreated, status.DocsUpdated)
	}
	if len(ms.patchBodies) != 0 {
		t.Error("expected no PATCH calls for empty sync")
	}
}

func TestPush_NewDoc_CreatesTimesheetEntry(t *testing.T) {
	db, sessSvc := setupDB(t)
	ctx := context.Background()

	// Save a session timestamped to 2025-10-29
	ts := int64(1761696000000 + 3600*1000) // 01:00 UTC on 2025-10-29
	if err := sessSvc.InsertRaw(ctx, database.Session{
		Timestamp: ts, Duration: 72, LabelName: "W1M", IsWork: true,
	}); err != nil {
		t.Fatalf("InsertRaw: %v", err)
	}

	ms := newMockServer()
	defer ms.close()
	// No GET response → 404 → create new doc
	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	handler := sync.NewTestHandlerForTest(client, sessSvc, db, "testdevice")

	status, err := handler.Push(ctx)
	if err != nil {
		t.Fatalf("Push: %v", err)
	}
	if status.DocsCreated != 1 {
		t.Errorf("want 1 new doc, got created=%d", status.DocsCreated)
	}

	// The PATCH body should contain the timesheet doc with work1Main=72
	body := ms.patchBodies["29-10-2025"]
	if body == "" {
		t.Fatal("expected PATCH for 29-10-2025, not found")
	}
	if !strings.Contains(body, "72") {
		t.Errorf("expected 72 minutes in PATCH body, got: %s", body)
	}
}

func TestPush_ExistingDoc_AddsToExistingMinutes(t *testing.T) {
	db, sessSvc := setupDB(t)
	ctx := context.Background()

	ts := int64(1761696000000 + 3600*1000)
	_ = sessSvc.InsertRaw(ctx, database.Session{Timestamp: ts, Duration: 30, LabelName: "LTG", IsWork: true})

	ms := newMockServer()
	defer ms.close()
	// Existing doc with ltg = 50 (from another device).
	// Note: resolveFieldKey returns the tagSnapshot key ("ltg"), so minutes are
	// stored under that same key in formData, not under "ltgLongTermGoal".
	existingDoc := `{
		"fields": {
			"id":        {"stringValue": "29-10-2025"},
			"createdAt": {"integerValue": "1761696000000"},
			"formData": {"mapValue": {"fields": {
				"ltg": {"integerValue": "50"},
				"tagSnapshot": {"mapValue": {"fields": {
					"ltg": {"stringValue": "LTG"}
				}}}
			}}}
		}
	}`
	ms.getResponse["29-10-2025"] = existingDoc

	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	handler := sync.NewTestHandlerForTest(client, sessSvc, db, "testdevice")

	status, err := handler.Push(ctx)
	if err != nil {
		t.Fatalf("Push: %v", err)
	}
	if status.DocsUpdated != 1 {
		t.Errorf("want 1 updated doc, got %d", status.DocsUpdated)
	}

	body := ms.patchBodies["29-10-2025"]
	// 50 + 30 = 80 should appear
	if !strings.Contains(body, "80") {
		t.Errorf("expected 80 (50+30) in PATCH body, got: %s", body)
	}
}

func TestPush_MultipleLabelsAndDates(t *testing.T) {
	db, sessSvc := setupDB(t)
	ctx := context.Background()

	day1 := int64(1761696000000 + 1000) // 2025-10-29
	day2 := int64(1761782400000 + 1000) // 2025-10-30

	_ = sessSvc.InsertRaw(ctx, database.Session{ID: 1, Timestamp: day1, Duration: 25, LabelName: "W1M", IsWork: true})
	_ = sessSvc.InsertRaw(ctx, database.Session{ID: 2, Timestamp: day1, Duration: 15, LabelName: "LTG", IsWork: true})
	_ = sessSvc.InsertRaw(ctx, database.Session{ID: 3, Timestamp: day2, Duration: 40, LabelName: "W1M", IsWork: true})

	ms := newMockServer()
	defer ms.close()

	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	handler := sync.NewTestHandlerForTest(client, sessSvc, db, "testdevice")

	status, err := handler.Push(ctx)
	if err != nil {
		t.Fatalf("Push: %v", err)
	}
	if status.DocsCreated != 2 {
		t.Errorf("want 2 docs created, got %d", status.DocsCreated)
	}
	if ms.patchBodies["29-10-2025"] == "" {
		t.Error("missing PATCH for 29-10-2025")
	}
	if ms.patchBodies["30-10-2025"] == "" {
		t.Error("missing PATCH for 30-10-2025")
	}
}

func TestPush_SessionsMarkedSyncedAfterPush(t *testing.T) {
	db, sessSvc := setupDB(t)
	ctx := context.Background()

	ts := int64(1761696000000 + 1000)
	_ = sessSvc.InsertRaw(ctx, database.Session{Timestamp: ts, Duration: 10, LabelName: "W1M", IsWork: true})

	ms := newMockServer()
	defer ms.close()
	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	handler := sync.NewTestHandlerForTest(client, sessSvc, db, "testdevice")

	_, _ = handler.Push(ctx)

	unsynced, _ := sessSvc.ListUnsynced(ctx)
	if len(unsynced) != 0 {
		t.Errorf("expected 0 unsynced sessions after push, got %d", len(unsynced))
	}
}

func TestPush_BreakSessions_NotSynced(t *testing.T) {
	db, sessSvc := setupDB(t)
	ctx := context.Background()

	ts := int64(1761696000000 + 1000)
	_ = sessSvc.InsertRaw(ctx, database.Session{Timestamp: ts, Duration: 5, LabelName: "W1M", IsWork: false})

	ms := newMockServer()
	defer ms.close()
	client := sync.NewTestClientForTest(ms.server.Client(), "test-project", ms.server.URL)
	handler := sync.NewTestHandlerForTest(client, sessSvc, db, "testdevice")

	status, err := handler.Push(ctx)
	if err != nil {
		t.Fatalf("Push: %v", err)
	}
	// Break sessions should not create timesheet docs
	if status.DocsCreated != 0 || status.DocsUpdated != 0 {
		t.Errorf("break sessions should not update timesheet, got created=%d updated=%d",
			status.DocsCreated, status.DocsUpdated)
	}
}

func TestDocIDToMidnightMillis(t *testing.T) {
	// 29-10-2025 midnight UTC = 1761696000000
	got := sync.ExportedDocIDToMidnightMillis("29-10-2025")
	want := int64(1761696000000)
	if got != want {
		t.Errorf("want %d, got %d", want, got)
	}
}

func TestResolveFieldKey(t *testing.T) {
	tagSnapshot := map[string]interface{}{
		"work1Main": "W1M",
		"ltg":       "LTG",
		"essentials": "ESS",
	}
	tests := []struct{ label, want string }{
		{"W1M", "work1Main"},
		{"LTG", "ltg"},
		{"ESS", "essentials"},
		{"XXX", ""},
	}
	for _, tc := range tests {
		got := sync.ExportedResolveFieldKey(tagSnapshot, tc.label)
		if got != tc.want {
			t.Errorf("label %s: want %q, got %q", tc.label, tc.want, got)
		}
	}
}

func TestMillisToDocIDConversion(t *testing.T) {
	tests := []struct {
		ms   int64
		want string
	}{
		{1761696000000, "29-10-2025"}, // 2025-10-29 midnight UTC
		{1761782400000, "30-10-2025"}, // 2025-10-30 midnight UTC
		{1767225600000, "01-01-2026"}, // 2026-01-01 midnight UTC
	}
	for _, tc := range tests {
		got := sync.ExportedMillisToDocID(tc.ms)
		if got != tc.want {
			t.Errorf("ms=%d: want %q, got %q", tc.ms, tc.want, got)
		}
	}
}
