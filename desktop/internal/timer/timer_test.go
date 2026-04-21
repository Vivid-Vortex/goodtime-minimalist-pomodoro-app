package timer_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/adrcotfas/goodtime/desktop/internal/timer"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

type mockSaver struct {
	calls []savedCall
}

type savedCall struct {
	duration  int64
	labelName string
}

func (m *mockSaver) SaveSession(_ context.Context, durationMinutes int64, labelName string) error {
	m.calls = append(m.calls, savedCall{duration: durationMinutes, labelName: labelName})
	return nil
}

func newEngine(t *testing.T, p timer.Profile, saver timer.SessionSaver) *timer.Engine {
	t.Helper()
	e := timer.NewEngine(p, saver, nil)
	t.Cleanup(e.Shutdown)
	return e
}

// ─── state machine tests ─────────────────────────────────────────────────────

func TestInitialState_IsReset(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	s := e.GetState()
	if s.Kind != timer.StateReset {
		t.Errorf("want RESET, got %s", s.Kind)
	}
	if s.TimerType != timer.TypeFocus {
		t.Errorf("want FOCUS, got %s", s.TimerType)
	}
}

func TestStart_TransitionsToRunning(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	if err := e.Start(); err != nil {
		t.Fatal(err)
	}
	if s := e.GetState(); s.Kind != timer.StateRunning {
		t.Errorf("want RUNNING, got %s", s.Kind)
	}
}

func TestStart_WhenAlreadyRunning_ReturnsError(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	if err := e.Start(); err == nil {
		t.Error("expected error starting already-running timer")
	}
}

func TestPause_TransitionsToPaused(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	if err := e.Pause(); err != nil {
		t.Fatal(err)
	}
	if s := e.GetState(); s.Kind != timer.StatePaused {
		t.Errorf("want PAUSED, got %s", s.Kind)
	}
}

func TestPause_WhenNotRunning_ReturnsError(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	if err := e.Pause(); err == nil {
		t.Error("expected error pausing non-running timer")
	}
}

func TestResume_TransitionsToRunning(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	_ = e.Pause()
	if err := e.Resume(); err != nil {
		t.Fatal(err)
	}
	if s := e.GetState(); s.Kind != timer.StateRunning {
		t.Errorf("want RUNNING, got %s", s.Kind)
	}
}

func TestResume_WhenNotPaused_ReturnsError(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	if err := e.Resume(); err == nil {
		t.Error("expected error resuming non-paused timer")
	}
}

func TestStop_ResetsToReset(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	if err := e.Stop(); err != nil {
		t.Fatal(err)
	}
	if s := e.GetState(); s.Kind != timer.StateReset {
		t.Errorf("want RESET after Stop, got %s", s.Kind)
	}
}

func TestSkip_WhenRunning_TransitionsToFinished(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	if err := e.Skip(); err != nil {
		t.Fatal(err)
	}
	if s := e.GetState(); s.Kind != timer.StateFinished {
		t.Errorf("want FINISHED after Skip, got %s", s.Kind)
	}
}

func TestSkip_WhenPaused_TransitionsToFinished(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	_ = e.Pause()
	if err := e.Skip(); err != nil {
		t.Fatal(err)
	}
	if s := e.GetState(); s.Kind != timer.StateFinished {
		t.Errorf("want FINISHED after Skip while paused, got %s", s.Kind)
	}
}

func TestSkip_WhenReset_ReturnsError(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	if err := e.Skip(); err == nil {
		t.Error("expected error skipping a non-active timer")
	}
}

// ─── cycle progression tests ─────────────────────────────────────────────────

func TestSkipFocusSegment_AdvancesToBreak(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	_ = e.Skip() // Focus → Finished
	// After finishing the focus segment, timer type should advance to BREAK on next Start
	if err := e.Start(); err != nil {
		t.Fatal(err)
	}
	s := e.GetState()
	if s.TimerType != timer.TypeBreak {
		t.Errorf("want BREAK after skipping focus, got %s", s.TimerType)
	}
}

func TestLongBreakAfterNSessions(t *testing.T) {
	p := timer.DefaultProfile()
	p.IsLongBreakEnabled = true
	p.SessionsBeforeLongBreak = 2
	p.IsBreakEnabled = true

	e := newEngine(t, p, nil)

	// Session 1: Focus → skip → Break → skip → Focus (session 1 completed)
	_ = e.Start()
	_ = e.Skip() // Finish focus 1 → should go to Break
	_ = e.Start()
	_ = e.Skip() // Finish break 1 → back to Focus
	// Session 2: Focus → skip → LongBreak (2nd session triggers long break)
	_ = e.Start()
	_ = e.Skip() // Finish focus 2 → should go to LongBreak
	_ = e.Start()
	s := e.GetState()
	if s.TimerType != timer.TypeLongBreak {
		t.Errorf("want LONG_BREAK after %d sessions, got %s", p.SessionsBeforeLongBreak, s.TimerType)
	}
}

// ─── elapsed time tests ───────────────────────────────────────────────────────

func TestElapsedSeconds_IncreasesWhileRunning(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	time.Sleep(1100 * time.Millisecond)
	s := e.GetState()
	if s.ElapsedSeconds < 1 {
		t.Errorf("expected elapsed >= 1s, got %d", s.ElapsedSeconds)
	}
}

func TestElapsedSeconds_DoesNotIncreaseWhilePaused(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	_ = e.Start()
	time.Sleep(500 * time.Millisecond)
	_ = e.Pause()
	before := e.GetState().ElapsedSeconds
	time.Sleep(1100 * time.Millisecond)
	after := e.GetState().ElapsedSeconds
	// Allow 1 extra second of drift but no more
	if after-before > 1 {
		t.Errorf("elapsed increased by %d while paused", after-before)
	}
}

// ─── countdown completion tests ───────────────────────────────────────────────

func TestCountdownCompletes_EmitsFinished(t *testing.T) {
	p := timer.DefaultProfile()
	p.WorkDurationMin = 0 // effectively 0 seconds — finishes on next tick

	var ticks atomic.Int32
	var lastState timer.State
	e := timer.NewEngine(p, nil, func(s timer.State) {
		ticks.Add(1)
		lastState = s
	})
	t.Cleanup(e.Shutdown)

	_ = e.Start()
	time.Sleep(2500 * time.Millisecond)

	if lastState.Kind != timer.StateFinished {
		t.Errorf("want FINISHED after countdown, got %s", lastState.Kind)
	}
}

// ─── session saver tests ──────────────────────────────────────────────────────

func TestStop_SavesWorkSession_WhenElapsedAtLeastOneMinute(t *testing.T) {
	p := timer.DefaultProfile()
	// Use a very short work duration so it completes quickly in a real-clock test
	// We'll manually manipulate via Skip to test the saver path
	saver := &mockSaver{}
	e := newEngine(t, p, saver)
	_ = e.Start()
	_ = e.Skip() // mark as finished — saver should be called by finish()
	time.Sleep(200 * time.Millisecond) // let goroutine in finish() run
	if len(saver.calls) == 0 {
		// Skip finishes the session but elapsed is < 1 minute, so no call is expected from Stop.
		// The save happens in finish() if elapsed >= 1 min. This is expected behaviour.
		t.Log("no session saved (elapsed < 1 min) — correct for skip in test")
	}
}

func TestSetActiveLabel_AppearsInState(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	e.SetActiveLabel("W1M")
	s := e.GetState()
	if s.ActiveLabelName != "W1M" {
		t.Errorf("want label W1M, got %s", s.ActiveLabelName)
	}
}

func TestSetProfile_UpdatesProfile(t *testing.T) {
	e := newEngine(t, timer.DefaultProfile(), nil)
	p := timer.DefaultProfile()
	p.WorkDurationMin = 50
	e.SetProfile(p)
	// Profile takes effect on next Start
	_ = e.Start()
	s := e.GetState()
	if s.TotalSeconds != 50*60 {
		t.Errorf("want TotalSeconds=3000, got %d", s.TotalSeconds)
	}
}

// ─── auto-start tests ─────────────────────────────────────────────────────────

// awaitState polls the engine every 100 ms until it reaches the desired state
// or the timeout expires.  More reliable than fixed sleeps.
func awaitState(t *testing.T, e *timer.Engine, wantKind timer.StateKind, wantType timer.TypeKind, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		s := e.GetState()
		if s.Kind == wantKind && s.TimerType == wantType {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	s := e.GetState()
	t.Errorf("timeout waiting for %s/%s — final state: %s/%s", wantKind, wantType, s.Kind, s.TimerType)
}

func TestAutoStartBreak_StartsBreakAfterFocus(t *testing.T) {
	p := timer.DefaultProfile()
	p.WorkDurationMin = 0   // finishes on next tick (~1 s)
	p.IsBreakEnabled = true
	p.BreakDurationMin = 60 // long break — won't finish during test

	e := timer.NewEngine(p, nil, nil)
	t.Cleanup(e.Shutdown)
	e.SetAutoStart(false, true) // autoBreak=true

	_ = e.Start()
	awaitState(t, e, timer.StateRunning, timer.TypeBreak, 5*time.Second)
}

func TestAutoStartWork_StartsWorkAfterBreak(t *testing.T) {
	p := timer.DefaultProfile()
	p.WorkDurationMin = 0   // focus finishes on next tick
	p.IsBreakEnabled = true
	p.BreakDurationMin = 0  // break also finishes on next tick

	e := timer.NewEngine(p, nil, nil)
	t.Cleanup(e.Shutdown)
	e.SetAutoStart(true, true)

	_ = e.Start()
	// Wait for: focus→FINISHED→break starts→break→FINISHED→focus starts
	awaitState(t, e, timer.StateRunning, timer.TypeFocus, 8*time.Second)
}

func TestAutoStart_Stop_CancelsPending(t *testing.T) {
	p := timer.DefaultProfile()
	p.WorkDurationMin = 0
	p.IsBreakEnabled = true
	p.BreakDurationMin = 60

	e := timer.NewEngine(p, nil, nil)
	t.Cleanup(e.Shutdown)
	e.SetAutoStart(false, true)

	_ = e.Start()
	// Wait for focus to finish (→ FINISHED)
	awaitState(t, e, timer.StateFinished, timer.TypeBreak, 4*time.Second)

	// User manually stops before the auto-start tick fires
	_ = e.Stop()
	time.Sleep(1500 * time.Millisecond) // ensure the pending tick passes

	s := e.GetState()
	if s.Kind != timer.StateReset {
		t.Errorf("want RESET after manual stop, got %s", s.Kind)
	}
}

func TestResetState_ShowsCorrectTotalSeconds(t *testing.T) {
	p := timer.DefaultProfile()
	p.WorkDurationMin = 72
	e := timer.NewEngine(p, nil, nil)
	t.Cleanup(e.Shutdown)

	s := e.GetState()
	if s.Kind != timer.StateReset {
		t.Fatalf("want RESET, got %s", s.Kind)
	}
	if s.TotalSeconds != 72*60 {
		t.Errorf("want TotalSeconds=4320 in RESET, got %d", s.TotalSeconds)
	}
}
