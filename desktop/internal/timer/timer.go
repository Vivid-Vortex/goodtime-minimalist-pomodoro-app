// Package timer implements the Pomodoro timer engine.
//
// State machine:
//
//	RESET → Start() → RUNNING → Pause() → PAUSED → Resume() → RUNNING
//	RUNNING → (duration elapsed) → FINISHED → Start() → RUNNING (next segment)
//	RUNNING/PAUSED → Stop() → RESET
//	RUNNING → Skip() → FINISHED (immediately)
package timer

import (
	"context"
	"errors"
	"sync"
	"time"
)

// StateKind represents the current lifecycle state of the timer.
type StateKind string

const (
	StateReset    StateKind = "RESET"
	StateRunning  StateKind = "RUNNING"
	StatePaused   StateKind = "PAUSED"
	StateFinished StateKind = "FINISHED"
)

// TypeKind identifies which segment of the Pomodoro cycle is active.
type TypeKind string

const (
	TypeFocus     TypeKind = "FOCUS"
	TypeBreak     TypeKind = "BREAK"
	TypeLongBreak TypeKind = "LONG_BREAK"
)

// State is the snapshot emitted to the frontend every second.
type State struct {
	Kind              StateKind `json:"kind"`
	TimerType         TypeKind  `json:"timerType"`
	ElapsedSeconds    int64     `json:"elapsedSeconds"`
	TotalSeconds      int64     `json:"totalSeconds"`
	CompletedSessions int       `json:"completedSessions"`
	ActiveLabelName   string    `json:"activeLabelName"`
}

// Profile holds the active timer configuration.
type Profile struct {
	IsCountdown             bool
	WorkDurationMin         int
	IsBreakEnabled          bool
	BreakDurationMin        int
	IsLongBreakEnabled      bool
	LongBreakDurationMin    int
	SessionsBeforeLongBreak int
	WorkBreakRatio          int
}

// DefaultProfile returns sensible defaults (72-min focus, 5-min break).
func DefaultProfile() Profile {
	return Profile{
		IsCountdown:             true,
		WorkDurationMin:         72,
		IsBreakEnabled:          true,
		BreakDurationMin:        5,
		IsLongBreakEnabled:      false,
		LongBreakDurationMin:    15,
		SessionsBeforeLongBreak: 4,
		WorkBreakRatio:          3,
	}
}

// SessionSaver is called by the engine when a work session completes.
type SessionSaver interface {
	SaveSession(ctx context.Context, durationMinutes int64, labelName string) error
}

// TickHandler is called every second with the latest State.
type TickHandler func(State)

// Engine drives the Pomodoro timer.
type Engine struct {
	mu                sync.Mutex
	ctx               context.Context
	cancel            context.CancelFunc
	profile           Profile
	state             StateKind
	timerType         TypeKind
	startedAt         time.Time
	pausedAt          time.Time
	pausedDuration    time.Duration
	totalDuration     time.Duration
	completedSessions int
	activeLabelName   string
	saver             SessionSaver
	onTick            TickHandler
	// auto-start: when set, the engine automatically begins the next segment
	// 1 tick (≈1 s) after the current one finishes so the frontend sees FINISHED.
	autoStartWork  bool
	autoStartBreak bool
	pendingAutoStart bool // set after finish(), cleared when start fires
}

// NewEngine creates a ready-to-use engine.
//
//   - saver: called when a work segment finishes (may be nil for testing)
//   - onTick: called every second with the current State (may be nil)
func NewEngine(profile Profile, saver SessionSaver, onTick TickHandler) *Engine {
	ctx, cancel := context.WithCancel(context.Background())
	e := &Engine{
		ctx:             ctx,
		cancel:          cancel,
		profile:         profile,
		state:           StateReset,
		timerType:       TypeFocus,
		activeLabelName: "Default",
		saver:           saver,
		onTick:          onTick,
	}
	go e.loop()
	return e
}

// SetProfile updates the active timer profile (takes effect on next Start).
func (e *Engine) SetProfile(p Profile) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.profile = p
}

// SetActiveLabel updates the label used for the next recorded session.
func (e *Engine) SetActiveLabel(name string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.activeLabelName = name
}

// SetAutoStart configures whether the engine automatically begins the next
// segment after the current one finishes (autoWork = start focus after break;
// autoBreak = start break after focus).
func (e *Engine) SetAutoStart(autoWork, autoBreak bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.autoStartWork = autoWork
	e.autoStartBreak = autoBreak
}

// Start transitions from RESET (or FINISHED) to RUNNING.
func (e *Engine) Start() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.state == StateRunning || e.state == StatePaused {
		return errors.New("timer already active — pause or stop first")
	}
	e.startedAt = time.Now()
	e.pausedDuration = 0
	e.totalDuration = e.segmentDuration()
	e.state = StateRunning
	return nil
}

// Pause transitions from RUNNING to PAUSED.
func (e *Engine) Pause() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.state != StateRunning {
		return errors.New("timer is not running")
	}
	e.pausedAt = time.Now()
	e.state = StatePaused
	return nil
}

// Resume transitions from PAUSED back to RUNNING.
func (e *Engine) Resume() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.state != StatePaused {
		return errors.New("timer is not paused")
	}
	e.pausedDuration += time.Since(e.pausedAt)
	e.state = StateRunning
	return nil
}

// Stop saves (if work segment) and resets to RESET, back at the focus phase.
func (e *Engine) Stop() error {
	e.mu.Lock()
	elapsed := e.elapsed()
	wasWork := e.timerType == TypeFocus
	label := e.activeLabelName
	e.resetLocked()
	e.pendingAutoStart = false // cancel any pending auto-start
	e.mu.Unlock()

	if wasWork && elapsed >= time.Minute && e.saver != nil {
		_ = e.saver.SaveSession(context.Background(), int64(elapsed.Minutes()), label)
	}
	return nil
}

// Skip marks the current segment as finished immediately.
func (e *Engine) Skip() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.state != StateRunning && e.state != StatePaused {
		return errors.New("timer is not active")
	}
	e.finish()
	return nil
}

// GetState returns a snapshot of the current timer state.
func (e *Engine) GetState() State {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.snapshot()
}

// Shutdown stops the internal goroutine.
func (e *Engine) Shutdown() {
	e.cancel()
}

// ─── internal helpers ────────────────────────────────────────────────────────

func (e *Engine) loop() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-e.ctx.Done():
			return
		case <-ticker.C:
			e.tick()
		}
	}
}

func (e *Engine) tick() {
	e.mu.Lock()
	if e.state == StateRunning {
		if e.profile.IsCountdown && e.elapsed() >= e.totalDuration {
			// Determine now whether we should auto-start the NEXT segment.
			// We record this before finish() advances the timerType.
			prevType := e.timerType
			e.finish()
			switch prevType {
			case TypeFocus:
				if e.autoStartBreak && e.profile.IsBreakEnabled {
					e.pendingAutoStart = true
				}
			case TypeBreak, TypeLongBreak:
				// Auto-start focus after break if either flag is on — enabling
				// "auto start break" implies the user wants the full cycle.
				if e.autoStartWork || e.autoStartBreak {
					e.pendingAutoStart = true
				}
			}
		}
	} else if e.state == StateFinished && e.pendingAutoStart {
		// One tick has elapsed showing FINISHED — now auto-start the next segment.
		e.pendingAutoStart = false
		e.startLocked()
	}
	snap := e.snapshot()
	e.mu.Unlock()

	if e.onTick != nil {
		e.onTick(snap)
	}
}

// finish handles the end of a segment — saves work sessions and advances cycle.
// Caller must hold e.mu.
func (e *Engine) finish() {
	elapsed := e.elapsed()
	wasWork := e.timerType == TypeFocus
	label := e.activeLabelName

	if wasWork {
		e.completedSessions++
		if e.saver != nil {
			go func() {
				_ = e.saver.SaveSession(context.Background(), int64(elapsed.Minutes()), label)
			}()
		}
		// Advance to break type
		if e.profile.IsBreakEnabled {
			if e.profile.IsLongBreakEnabled && e.completedSessions%e.profile.SessionsBeforeLongBreak == 0 {
				e.timerType = TypeLongBreak
			} else {
				e.timerType = TypeBreak
			}
		}
	} else {
		// After a break, go back to focus
		e.timerType = TypeFocus
	}

	e.state = StateFinished
}

// resetLocked resets timer state. Caller must hold e.mu.
func (e *Engine) resetLocked() {
	e.state = StateReset
	e.timerType = TypeFocus
	e.pausedDuration = 0
}

// startLocked transitions from FINISHED to RUNNING. Caller must hold e.mu.
func (e *Engine) startLocked() {
	e.startedAt = time.Now()
	e.pausedDuration = 0
	e.totalDuration = e.segmentDuration()
	e.state = StateRunning
}

// elapsed returns how much time has been actively running (excluding pauses).
// Caller must hold e.mu.
func (e *Engine) elapsed() time.Duration {
	if e.state == StateReset || e.state == StateFinished {
		return 0
	}
	total := time.Since(e.startedAt) - e.pausedDuration
	if e.state == StatePaused {
		total = e.pausedAt.Sub(e.startedAt) - e.pausedDuration
	}
	if total < 0 {
		return 0
	}
	return total
}

// segmentDuration returns the configured duration for the current segment.
// Caller must hold e.mu.
func (e *Engine) segmentDuration() time.Duration {
	switch e.timerType {
	case TypeBreak:
		return time.Duration(e.profile.BreakDurationMin) * time.Minute
	case TypeLongBreak:
		return time.Duration(e.profile.LongBreakDurationMin) * time.Minute
	default:
		return time.Duration(e.profile.WorkDurationMin) * time.Minute
	}
}

// snapshot builds a State from current locked fields.
// Caller must hold e.mu.
func (e *Engine) snapshot() State {
	elapsed := e.elapsed()
	totalSecs := int64(e.totalDuration.Seconds())
	if e.state == StateReset {
		// In RESET the timer hasn't started, so totalDuration is 0.
		// Return the would-be segment duration so the UI can show e.g. "72:00".
		totalSecs = int64(e.segmentDuration().Seconds())
	}
	return State{
		Kind:              e.state,
		TimerType:         e.timerType,
		ElapsedSeconds:    int64(elapsed.Seconds()),
		TotalSeconds:      totalSecs,
		CompletedSessions: e.completedSessions,
		ActiveLabelName:   e.activeLabelName,
	}
}
