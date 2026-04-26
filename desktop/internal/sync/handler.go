package sync

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/adrcotfas/goodtime/desktop/internal/database"
	"github.com/adrcotfas/goodtime/desktop/internal/sessions"
)

const (
	collectionTimesheet = "timesheet_entries"
	collectionHistory   = "pomodoro_app_history"
)

// SyncStatus is returned by Push to summarise what happened.
type SyncStatus struct {
	DocsUpdated int
	DocsCreated int
	Error       error
}

// Handler orchestrates Firestore sync operations.
type Handler struct {
	client  *Client
	sessSvc *sessions.Service
	db      *database.DB
	device  string // hostname shown in app-history
}

// NewHandler creates a SyncHandler.  credentialsJSON is the raw service-account.json.
func NewHandler(ctx context.Context, credJSON []byte, sessSvc *sessions.Service, db *database.DB) (*Handler, error) {
	client, err := NewClientFromJSON(ctx, credJSON)
	if err != nil {
		return nil, err
	}
	host, _ := os.Hostname()
	return &Handler{client: client, sessSvc: sessSvc, db: db, device: host}, nil
}

// newTestHandler creates a Handler for unit tests using a pre-built Client.
func newTestHandler(client *Client, sessSvc *sessions.Service, db *database.DB, device string) *Handler {
	return &Handler{client: client, sessSvc: sessSvc, db: db, device: device}
}

// CredentialsPath returns the expected location of the service-account.json.
func CredentialsPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "GoodtimePomodoro", "service-account.json"), nil
}

// CredentialsExist reports whether the service-account.json is present.
func CredentialsExist() bool {
	p, err := CredentialsPath()
	if err != nil {
		return false
	}
	_, err = os.Stat(p)
	return err == nil
}

// Push syncs all unsynced local sessions to Firestore.
//
// For each unique date, it:
//  1. Fetches the timesheet_entries/{DD-MM-YYYY} document (or creates a blank one).
//  2. Resolves each label name → formData field key via tagSnapshot.
//  3. Adds the accumulated minutes and writes the document back.
//
// Sessions are then marked as synced in SQLite.
func (h *Handler) Push(ctx context.Context) (SyncStatus, error) {
	var status SyncStatus

	// Fetch unsynced work sessions
	unsyncedSessions, err := h.sessSvc.ListUnsynced(ctx)
	if err != nil {
		return status, fmt.Errorf("list unsynced sessions: %w", err)
	}
	if len(unsyncedSessions) == 0 {
		return status, nil // nothing to do
	}

	// Group by date string (DD-MM-YYYY) and label
	type dateLabel struct{ date, label string }
	minutesByDateLabel := map[dateLabel]int64{}
	allIDs := []int64{}

	for _, s := range unsyncedSessions {
		if !s.IsWork {
			continue
		}
		dateStr := millisToDocID(s.Timestamp)
		minutesByDateLabel[dateLabel{dateStr, s.LabelName}] += s.Duration
		allIDs = append(allIDs, s.ID)
	}

	// Group by date so we do one read/write per date
	dateMap := map[string]map[string]int64{} // date → label → minutes
	for dl, mins := range minutesByDateLabel {
		if dateMap[dl.date] == nil {
			dateMap[dl.date] = map[string]int64{}
		}
		dateMap[dl.date][dl.label] += mins
	}

	// Push app-history entries
	for _, s := range unsyncedSessions {
		if err := h.pushHistorySession(ctx, s); err != nil {
			// Non-fatal — continue syncing timesheet
			_ = err
		}
	}

	// Sync timesheet_entries
	for dateStr, labelMins := range dateMap {
		isNew, err := h.syncTimesheetDoc(ctx, dateStr, labelMins)
		if err != nil {
			return status, fmt.Errorf("sync %s: %w", dateStr, err)
		}
		if isNew {
			status.DocsCreated++
		} else {
			status.DocsUpdated++
		}
	}

	// Mark sessions as synced
	if err := h.sessSvc.MarkSynced(ctx, allIDs); err != nil {
		return status, fmt.Errorf("mark synced: %w", err)
	}
	return status, nil
}

// syncTimesheetDoc reads/creates a timesheet_entries doc and adds minutesByLabel.
// Returns true if the doc was newly created.
func (h *Handler) syncTimesheetDoc(ctx context.Context, dateStr string, labelMins map[string]int64) (bool, error) {
	existing, err := h.client.GetDocument(ctx, collectionTimesheet, dateStr)
	isNew := existing == nil
	var doc map[string]interface{}

	if isNew {
		doc = buildBlankTimesheetDoc(dateStr)
	} else {
		if err != nil {
			return false, err
		}
		doc = existing
	}

	// Navigate into formData
	formData, ok := doc["formData"].(map[string]interface{})
	if !ok {
		formData = map[string]interface{}{}
		doc["formData"] = formData
	}
	tagSnapshot, _ := formData["tagSnapshot"].(map[string]interface{})

	// Resolve label → field key via tagSnapshot, then add minutes
	for labelName, mins := range labelMins {
		fieldKey := resolveFieldKey(tagSnapshot, labelName)
		if fieldKey == "" {
			// Label not found in tagSnapshot — skip (as per CLAUDE.md spec)
			continue
		}
		existing := int64(0)
		if v, ok := formData[fieldKey]; ok {
			switch n := v.(type) {
			case int64:
				existing = n
			case float64:
				existing = int64(n)
			case int:
				existing = int64(n)
			}
		}
		formData[fieldKey] = existing + mins
	}

	return isNew, h.client.SetDocument(ctx, collectionTimesheet, dateStr, doc)
}

// pushHistorySession appends one session to the pomodoro_app_history collection.
func (h *Handler) pushHistorySession(ctx context.Context, s database.Session) error {
	dateStr := millisToDocID(s.Timestamp)
	existing, _ := h.client.GetDocument(ctx, collectionHistory, dateStr)

	var doc map[string]interface{}
	if existing == nil {
		doc = map[string]interface{}{
			"id":       dateStr,
			"sessions": []interface{}{},
		}
	} else {
		doc = existing
	}

	entry := map[string]interface{}{
		"id":            s.ID,
		"timestamp":     s.Timestamp,
		"duration":      s.Duration,
		"labelName":     s.LabelName,
		"isWork":        s.IsWork,
		"deviceName":    h.device,
		"notes":         s.Notes,
		"interruptions": s.Interruptions,
	}

	arr, _ := doc["sessions"].([]interface{})
	arr = append(arr, entry)
	doc["sessions"] = arr

	return h.client.SetDocument(ctx, collectionHistory, dateStr, doc)
}

// ─── Pull API ─────────────────────────────────────────────────────────────────

// TimesheetDoc holds the parsed content of one timesheet_entries document.
type TimesheetDoc struct {
	DocID        string           // DD-MM-YYYY
	LabelMinutes map[string]int64 // label abbreviation → minutes
}

// HistoryEntry holds one session record from the pomodoro_app_history collection.
type HistoryEntry struct {
	DateMillis int64
	LabelName  string
	Minutes    int64
	DeviceName string
}

// ListTimesheetEntries fetches all documents from timesheet_entries and parses
// the label minutes from each document's formData/tagSnapshot.
func (h *Handler) ListTimesheetEntries(ctx context.Context) ([]TimesheetDoc, error) {
	docs, err := h.client.ListDocuments(ctx, collectionTimesheet)
	if err != nil {
		return nil, err
	}
	var result []TimesheetDoc
	for _, doc := range docs {
		docID, _ := doc["_id"].(string)
		formData, _ := doc["formData"].(map[string]interface{})
		if formData == nil {
			continue
		}
		tagSnapshot, _ := formData["tagSnapshot"].(map[string]interface{})
		if tagSnapshot == nil {
			continue
		}
		labelMins := map[string]int64{}
		// tagSnapshot: {fieldKey → abbreviation}, e.g. {"work1Main": "W1M"}
		// formData[fieldKey] is the minutes value
		for fieldKey, abbrevRaw := range tagSnapshot {
			abbrev, _ := abbrevRaw.(string)
			if abbrev == "" {
				continue
			}
			val := formData[fieldKey]
			var mins int64
			switch n := val.(type) {
			case int64:
				mins = n
			case float64:
				mins = int64(n)
			case int:
				mins = int64(n)
			}
			if mins > 0 {
				labelMins[abbrev] = mins
			}
		}
		if len(labelMins) > 0 {
			result = append(result, TimesheetDoc{DocID: docID, LabelMinutes: labelMins})
		}
	}
	return result, nil
}

// ListHistoryEntries fetches all session entries from pomodoro_app_history.
func (h *Handler) ListHistoryEntries(ctx context.Context) ([]HistoryEntry, error) {
	docs, err := h.client.ListDocuments(ctx, collectionHistory)
	if err != nil {
		return nil, err
	}
	var result []HistoryEntry
	for _, doc := range docs {
		docID, _ := doc["_id"].(string)
		dateMillis := DocIDToMidnightMillis(docID)
		sessions, _ := doc["sessions"].([]interface{})
		for _, raw := range sessions {
			entry, _ := raw.(map[string]interface{})
			if entry == nil {
				continue
			}
			label, _ := entry["labelName"].(string)
			device, _ := entry["deviceName"].(string)
			var mins int64
			switch n := entry["duration"].(type) {
			case int64:
				mins = n
			case float64:
				mins = int64(n)
			}
			isWork, _ := entry["isWork"].(bool)
			if isWork && mins > 0 {
				result = append(result, HistoryEntry{
					DateMillis: dateMillis,
					LabelName:  label,
					Minutes:    mins,
					DeviceName: device,
				})
			}
		}
	}
	return result, nil
}

// DocIDToMidnightMillis is the exported wrapper for docIDToMidnightMillis.
func DocIDToMidnightMillis(docID string) int64 { return docIDToMidnightMillis(docID) }

// ─── Timer profiles cloud sync ────────────────────────────────────────────────

const (
	collectionGlobalNotes  = "global_notes"
	docTimerProfiles       = "timer_profiles"
)

// TimerProfileDoc is a named timer profile as stored in Firestore.
type TimerProfileDoc struct {
	Name                    string `json:"name"`
	IsCountdown             bool   `json:"isCountdown"`
	WorkDuration            int    `json:"workDuration"`
	IsBreakEnabled          bool   `json:"isBreakEnabled"`
	BreakDuration           int    `json:"breakDuration"`
	IsLongBreakEnabled      bool   `json:"isLongBreakEnabled"`
	LongBreakDuration       int    `json:"longBreakDuration"`
	SessionsBeforeLongBreak int    `json:"sessionsBeforeLongBreak"`
	WorkBreakRatio          int    `json:"workBreakRatio"`
}

// PushTimerProfiles writes all local profiles to global_notes/timer_profiles.
func (h *Handler) PushTimerProfiles(ctx context.Context, profiles []TimerProfileDoc) error {
	doc := map[string]interface{}{
		"profiles":  profilesToIface(profiles),
		"updatedAt": time.Now().UnixMilli(),
	}
	return h.client.SetDocument(ctx, collectionGlobalNotes, docTimerProfiles, doc)
}

// PullTimerProfiles fetches timer profiles from global_notes/timer_profiles.
// Returns nil slice (no error) when the document doesn't exist yet.
func (h *Handler) PullTimerProfiles(ctx context.Context) ([]TimerProfileDoc, error) {
	doc, err := h.client.GetDocument(ctx, collectionGlobalNotes, docTimerProfiles)
	if doc == nil || err != nil {
		return nil, err
	}
	raw, _ := doc["profiles"].([]interface{})
	var out []TimerProfileDoc
	for _, item := range raw {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		p := TimerProfileDoc{
			Name:                    str(m, "name"),
			IsCountdown:             boolVal(m, "isCountdown"),
			WorkDuration:            intVal(m, "workDuration"),
			IsBreakEnabled:          boolVal(m, "isBreakEnabled"),
			BreakDuration:           intVal(m, "breakDuration"),
			IsLongBreakEnabled:      boolVal(m, "isLongBreakEnabled"),
			LongBreakDuration:       intVal(m, "longBreakDuration"),
			SessionsBeforeLongBreak: intVal(m, "sessionsBeforeLongBreak"),
			WorkBreakRatio:          intVal(m, "workBreakRatio"),
		}
		if p.Name != "" {
			out = append(out, p)
		}
	}
	return out, nil
}

func profilesToIface(ps []TimerProfileDoc) []interface{} {
	out := make([]interface{}, len(ps))
	for i, p := range ps {
		out[i] = map[string]interface{}{
			"name":                    p.Name,
			"isCountdown":             p.IsCountdown,
			"workDuration":            p.WorkDuration,
			"isBreakEnabled":          p.IsBreakEnabled,
			"breakDuration":           p.BreakDuration,
			"isLongBreakEnabled":      p.IsLongBreakEnabled,
			"longBreakDuration":       p.LongBreakDuration,
			"sessionsBeforeLongBreak": p.SessionsBeforeLongBreak,
			"workBreakRatio":          p.WorkBreakRatio,
		}
	}
	return out
}

func str(m map[string]interface{}, k string) string {
	s, _ := m[k].(string)
	return s
}

func boolVal(m map[string]interface{}, k string) bool {
	b, _ := m[k].(bool)
	return b
}

func intVal(m map[string]interface{}, k string) int {
	switch n := m[k].(type) {
	case int64:
		return int(n)
	case float64:
		return int(n)
	case int:
		return n
	}
	return 0
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// millisToDocID converts a Unix-millisecond timestamp to the Firestore doc-ID
// format used by timesheet_entries: DD-MM-YYYY.
func millisToDocID(ms int64) string {
	t := time.Unix(ms/1000, 0).UTC()
	return fmt.Sprintf("%02d-%02d-%04d", t.Day(), t.Month(), t.Year())
}

// resolveFieldKey scans tagSnapshot values for a match with labelName.
// tagSnapshot example: {"work1Main": "W1M", "ltg": "LTG", ...}
// If labelName is "W1M", the function returns "work1Main".
func resolveFieldKey(tagSnapshot map[string]interface{}, labelName string) string {
	for fieldKey, abbrev := range tagSnapshot {
		if s, ok := abbrev.(string); ok && s == labelName {
			return fieldKey
		}
	}
	return ""
}

// buildBlankTimesheetDoc creates a new document pre-filled with the canonical
// template from CLAUDE.md (New Json structure-v2).
func buildBlankTimesheetDoc(dateStr string) map[string]interface{} {
	// Convert DD-MM-YYYY → Unix millis (midnight UTC)
	ms := docIDToMidnightMillis(dateStr)

	return map[string]interface{}{
		"id":        dateStr,
		"createdAt": ms,
		"formData": map[string]interface{}{
			"entryDate": ms,
			"tagSnapshot": map[string]interface{}{
				"avdhanaMode":       "AV",
				"wcmn":              "WCMN",
				"work3":             "W3",
				"work4":             "W4",
				"work2":             "W2",
				"work5":             "W5",
				"ltg":               "LTG",
				"timeWasted":        "TW",
				"essentials":        "ESS",
				"finance":           "FIN",
				"others":            "OTH",
				"work1Main":         "W1M",
				"work1Misc":         "W1X",
				"projectManagement": "PM",
				"learning":          "LRN",
				"meditation":        "MED",
				"exercise":          "EXE",
			},
			"intoxNo":             "N/A",
			"mbtNo":               "N/A",
			"topPriorityTime":     "",
			"topPriorityThinking": "N/A",
			"playedFirstThingComesToMindGame": false,
			"thinking":              true,
			"issue":                 "NONE",
			"issueOtherText":        "",
			"onTimeSleep":           false,
			"mpvOfSleep":            false,
			"wakedUpAt4Am":          false,
			"selfAndSurroundingVastu": false,
			"twentyMinsLearning":    false,
			"thirtyMinsMeditation":  false,
			"sixtyMinsExercise":     false,
			"overallHealthStatus":   int64(1),
			"phase2Sleep":           false,
			"minimum270Min":         false,
			"dayProductivity":       "PRODUCTIVE",
			"timePocketFollowed":    false,
			"youtubeTimeUtilizerDocFollowed": false,
			"wastedMoreThan15Mins":  false,
			"approxWastedMinutes":   int64(0),
			"activity1":             "",
			"activity2":             "",
			"activity3":             "",
			"activity4":             "",
			"activity5":             "",
			"pomodoroFollowed":      false,
			"sprint":                int64(0),
			// Log-hours fields — all start at 0 (integer), per CLAUDE.md Section 4
			"avdhanaMode":       int64(0),
			"work1ToWork4Ikigai": int64(0),
			"work3Udemy":        int64(0),
			"work4TechWebsite":  int64(0),
			"work2Youtube":      int64(0),
			"work5OnlineSale":   int64(0),
			"ltgLongTermGoal":   int64(0),
			"timeWasted":        int64(0),
			"spentOnEssentials": int64(0),
			"finance":           int64(0),
			"others":            int64(0),
			"work1Main":         int64(0),
			"work1Misc":         int64(0),
			"projectManagement": int64(0),
			"learning":          int64(0),
			"meditation":        int64(0),
			"exercise":          int64(0),
			"mitsCompletedWithin270To360Mins": false,
			"total":                           "",
			"completed270MinsBeforeSixPm":     false,
			"ableToCompleteDaysMits":          false,
			"carpeMomentum1440FollowedToday":  false,
			"timePocketFollowedToday":         false,
			"productivityPointsSuccessDocFollowed": false,
			"anchorPoints":            false,
			"sitStraightFor2Sprints":  false,
			"didEverythingTimeBound":  false,
			"followed4To4Policy":      false,
			"ateBreakfastDistractionFree": false,
			"satOnTimeAfterDWT3":      false,
			"relaxationAfter2Sprints": "",
			"sleepPhase1":             "",
			"sleepPhase2":             "",
			"pppw":                    "",
			"tppw":                    "",
			"entertainment":           "",
		},
	}
}

// docIDToMidnightMillis converts DD-MM-YYYY to Unix millis at midnight UTC.
func docIDToMidnightMillis(dateStr string) int64 {
	var d, m, y int
	fmt.Sscanf(dateStr, "%02d-%02d-%04d", &d, &m, &y)
	t := time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
	return t.UnixMilli()
}
