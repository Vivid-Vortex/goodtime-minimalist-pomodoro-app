package timer

// WailsBridge wires the timer Engine to Wails events and app services.
// It is the layer app.go uses instead of constructing Engine directly.

import (
	"context"
)

// ServiceSaver is satisfied by sessions.Service.
type ServiceSaver interface {
	SaveSession(ctx context.Context, durationMinutes int64, labelName string) error
}

// ServiceSettings is satisfied by settings.Service.
type ServiceSettings interface {
	GetActiveLabel(ctx context.Context) (string, error)
	GetActiveProfile(ctx context.Context) (Profile, error)
}

// WailsBridge wraps Engine and lazily resolves profile/label from services.
type WailsBridge struct {
	ctx    context.Context
	engine *Engine
	stgs   ServiceSettings
}

// NewWailsBridge creates a WailsBridge. onTick is called every second (pass
// runtime.EventsEmit wrapper from app.go so the timer package stays Wails-free).
func NewWailsBridge(ctx context.Context, svc ServiceSaver, stgs ServiceSettings, onTick TickHandler) *WailsBridge {
	profile, _ := stgs.GetActiveProfile(ctx)
	label, _ := stgs.GetActiveLabel(ctx)

	e := NewEngine(profile, svc, onTick)
	e.SetActiveLabel(label)

	return &WailsBridge{ctx: ctx, engine: e, stgs: stgs}
}

// Start refreshes profile/label from settings, then starts the timer.
func (b *WailsBridge) Start() error {
	profile, err := b.stgs.GetActiveProfile(b.ctx)
	if err != nil {
		return err
	}
	label, err := b.stgs.GetActiveLabel(b.ctx)
	if err != nil {
		return err
	}
	b.engine.SetProfile(profile)
	b.engine.SetActiveLabel(label)
	return b.engine.Start()
}

func (b *WailsBridge) Pause() error       { return b.engine.Pause() }
func (b *WailsBridge) Resume() error      { return b.engine.Resume() }
func (b *WailsBridge) StopAndSave() error { return b.engine.Stop() }
func (b *WailsBridge) Skip() error        { return b.engine.Skip() }
func (b *WailsBridge) Shutdown()          { b.engine.Shutdown() }
func (b *WailsBridge) GetState() State    { return b.engine.GetState() }
