import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TimerControls } from "../components/Timer/TimerControls";

const noop = vi.fn();

function renderControls(kind: "RESET" | "RUNNING" | "PAUSED" | "FINISHED") {
  return render(
    <TimerControls
      kind={kind}
      onStart={noop}
      onPause={noop}
      onResume={noop}
      onStop={noop}
      onSkip={noop}
    />
  );
}

describe("TimerControls", () => {
  it("shows Start button when RESET", () => {
    renderControls("RESET");
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pause/i })).not.toBeInTheDocument();
  });

  it("shows Pause, Stop, Skip when RUNNING", () => {
    renderControls("RUNNING");
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("shows Resume, Stop, Skip when PAUSED", () => {
    renderControls("PAUSED");
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("shows Next button when FINISHED", () => {
    renderControls("FINISHED");
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("calls onStart when Start clicked", async () => {
    const onStart = vi.fn();
    render(
      <TimerControls kind="RESET" onStart={onStart} onPause={noop} onResume={noop} onStop={noop} onSkip={noop} />
    );
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("calls onPause when Pause clicked", async () => {
    const onPause = vi.fn();
    render(
      <TimerControls kind="RUNNING" onStart={noop} onPause={onPause} onResume={noop} onStop={noop} onSkip={noop} />
    );
    await userEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it("calls onResume when Resume clicked", async () => {
    const onResume = vi.fn();
    render(
      <TimerControls kind="PAUSED" onStart={noop} onPause={noop} onResume={onResume} onStop={noop} onSkip={noop} />
    );
    await userEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("calls onStop when Stop clicked", async () => {
    const onStop = vi.fn();
    render(
      <TimerControls kind="RUNNING" onStart={noop} onPause={noop} onResume={noop} onStop={onStop} onSkip={noop} />
    );
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("calls onSkip when Skip clicked", async () => {
    const onSkip = vi.fn();
    render(
      <TimerControls kind="RUNNING" onStart={noop} onPause={noop} onResume={noop} onStop={noop} onSkip={onSkip} />
    );
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
