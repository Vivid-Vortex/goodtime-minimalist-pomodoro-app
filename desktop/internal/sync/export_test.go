// export_test.go — package sync (NOT sync_test).
// Exports unexported identifiers for use by external _test packages.
package sync

import (
	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/sessions"
)

// NewTestClientForTest creates a Client pointed at a test HTTP server with no auth.
func NewTestClientForTest(doer HTTPDoer, projectID, baseURL string) *Client {
	return newTestClient(doer, projectID, baseURL)
}

// NewTestHandlerForTest creates a Handler with a pre-built Client (no real Firestore).
func NewTestHandlerForTest(client *Client, sessSvc *sessions.Service, db *database.DB, device string) *Handler {
	return newTestHandler(client, sessSvc, db, device)
}

// ExportedMillisToDocID exposes millisToDocID for tests.
func ExportedMillisToDocID(ms int64) string { return millisToDocID(ms) }

// ExportedDocIDToMidnightMillis exposes docIDToMidnightMillis for tests.
func ExportedDocIDToMidnightMillis(dateStr string) int64 { return docIDToMidnightMillis(dateStr) }

// ExportedResolveFieldKey exposes resolveFieldKey for tests.
func ExportedResolveFieldKey(tagSnapshot map[string]interface{}, labelName string) string {
	return resolveFieldKey(tagSnapshot, labelName)
}
