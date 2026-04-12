package database

// Session represents a completed work or break Pomodoro session.
type Session struct {
	ID            int64  `json:"id"`
	Timestamp     int64  `json:"timestamp"`     // Unix millis — when the session ended
	Duration      int64  `json:"duration"`      // minutes
	Interruptions int64  `json:"interruptions"` // minutes of interruptions
	LabelName     string `json:"labelName"`
	Notes         string `json:"notes"`
	IsWork        bool   `json:"isWork"`
	IsArchived    bool   `json:"isArchived"`
	DeviceName    string `json:"deviceName"`
}

// Label represents a work category used to tag sessions.
type Label struct {
	Name               string       `json:"name"`
	ColorIndex         int          `json:"colorIndex"`
	OrderIndex         int          `json:"orderIndex"`
	UseDefaultProfile  bool         `json:"useDefaultProfile"`
	TimerProfile       TimerProfile `json:"timerProfile"`
	IsArchived         bool         `json:"isArchived"`
}

// TimerProfile holds a named Pomodoro timer configuration.
type TimerProfile struct {
	Name                   string `json:"name"`
	IsCountdown            bool   `json:"isCountdown"`
	WorkDuration           int    `json:"workDuration"`           // minutes
	IsBreakEnabled         bool   `json:"isBreakEnabled"`
	BreakDuration          int    `json:"breakDuration"`          // minutes
	IsLongBreakEnabled     bool   `json:"isLongBreakEnabled"`
	LongBreakDuration      int    `json:"longBreakDuration"`      // minutes
	SessionsBeforeLongBreak int   `json:"sessionsBeforeLongBreak"`
	WorkBreakRatio         int    `json:"workBreakRatio"` // for count-up mode
}

// AppSettings holds user preferences persisted in SQLite.
type AppSettings struct {
	ActiveLabelName        string `json:"activeLabelName"`
	DefaultTimerProfileName string `json:"defaultTimerProfileName"`
	Theme                  string `json:"theme"` // "dark" | "light" | "system"
	WorkFinishedSound      string `json:"workFinishedSound"`
	BreakFinishedSound     string `json:"breakFinishedSound"`
	AutoStartWork          bool   `json:"autoStartWork"`
	AutoStartBreak         bool   `json:"autoStartBreak"`
	EnableDesktopNotifications bool `json:"enableDesktopNotifications"`
	CloudBackupEnabled     bool   `json:"cloudBackupEnabled"`
	LastSyncTimestamp      int64  `json:"lastSyncTimestamp"`
}

// DefaultTimerProfile returns the built-in 72/5 profile.
func DefaultTimerProfile() TimerProfile {
	return TimerProfile{
		Name:                   "72/5",
		IsCountdown:            true,
		WorkDuration:           72,
		IsBreakEnabled:         true,
		BreakDuration:          5,
		IsLongBreakEnabled:     false,
		LongBreakDuration:      15,
		SessionsBeforeLongBreak: 4,
		WorkBreakRatio:         3,
	}
}

// DefaultLabel returns the built-in default label.
func DefaultLabel() Label {
	return Label{
		Name:              "Default",
		ColorIndex:        0,
		OrderIndex:        0,
		UseDefaultProfile: true,
		TimerProfile:      DefaultTimerProfile(),
		IsArchived:        false,
	}
}

const (
	DefaultLabelName        = "Default"
	DefaultTimerProfileName = "72/5"
)
