import type { StateKind } from "../../types";

interface Props {
  kind: StateKind;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkip: () => void;
}

export function TimerControls({ kind, onStart, onPause, onResume, onStop, onSkip }: Props) {
  return (
    <div className="flex items-center gap-4 mt-8">
      {kind === "RESET" && (
        <PrimaryButton onClick={onStart} label="Start" icon="▶" />
      )}

      {kind === "RUNNING" && (
        <>
          <IconButton onClick={onStop} label="Stop" icon="■" variant="ghost" />
          <PrimaryButton onClick={onPause} label="Pause" icon="⏸" />
          <IconButton onClick={onSkip} label="Skip" icon="⏭" variant="ghost" />
        </>
      )}

      {kind === "PAUSED" && (
        <>
          <IconButton onClick={onStop} label="Stop" icon="■" variant="ghost" />
          <PrimaryButton onClick={onResume} label="Resume" icon="▶" />
          <IconButton onClick={onSkip} label="Skip" icon="⏭" variant="ghost" />
        </>
      )}

      {kind === "FINISHED" && (
        <PrimaryButton onClick={onStart} label="Next" icon="▶" />
      )}
    </div>
  );
}

function PrimaryButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-2 px-8 py-3 rounded-full bg-brand-500 hover:bg-brand-400
                 text-white font-semibold text-lg transition-colors shadow-lg shadow-brand-900/40"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function IconButton({
  onClick,
  label,
  icon,
  variant,
}: {
  onClick: () => void;
  label: string;
  icon: string;
  variant: "ghost";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-3 rounded-full text-xl transition-colors ${
        variant === "ghost"
          ? "text-gray-400 hover:text-white hover:bg-surface-700"
          : ""
      }`}
    >
      {icon}
    </button>
  );
}
