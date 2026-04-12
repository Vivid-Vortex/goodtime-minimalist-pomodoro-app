import { useState, useCallback } from "react";
import {
  CreateLabel, UpdateLabel, DeleteLabel, ArchiveLabel, GetLabels,
} from "../wailsjs/go/main/App";
import { useAppStore } from "../stores/appStore";
import { LABEL_COLORS } from "../types";
import type { Label, CreateLabelRequest } from "../types";

export function LabelsPage() {
  const { labels, setLabels } = useAppStore();
  const [editing, setEditing] = useState<Label | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    GetLabels().then(setLabels).catch(console.error);
  }, [setLabels]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
        <h1 className="text-lg font-semibold text-white">Labels</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-1.5 rounded-full bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
        >
          + New
        </button>
      </header>

      <ul className="flex-1 overflow-y-auto divide-y divide-surface-700">
        {labels.map((label) => (
          <LabelRow
            key={label.name}
            label={label}
            onEdit={() => setEditing(label)}
            onArchive={() => {
              ArchiveLabel(label.name).then(refresh).catch(console.error);
            }}
            onDelete={() => {
              DeleteLabel(label.name).then(refresh).catch(console.error);
            }}
          />
        ))}
        {labels.length === 0 && (
          <li className="flex items-center justify-center h-40 text-gray-500 text-sm">
            No labels yet
          </li>
        )}
      </ul>

      {(creating || editing) && (
        <LabelModal
          initial={editing ?? undefined}
          onSave={(req) => {
            const promise = editing
              ? UpdateLabel({ ...req, name: editing.name })
              : CreateLabel(req as CreateLabelRequest);
            promise
              .then(refresh)
              .catch(console.error)
              .finally(() => { setEditing(null); setCreating(false); });
          }}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

// ─── Label row ────────────────────────────────────────────────────────────────

function LabelRow({
  label,
  onEdit,
  onArchive,
  onDelete,
}: {
  label: Label;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = LABEL_COLORS[label.colorIndex] ?? "#9E9E9E";

  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800 transition-colors">
      <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 text-white text-sm">{label.name}</span>
      <span className="text-xs text-gray-500">
        {label.useDefaultProfile
          ? "Default profile"
          : `${label.timerProfile.workDuration}/${label.timerProfile.breakDuration}`}
      </span>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-700 transition-colors"
          aria-label="Label options"
        >
          ⋮
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-32 bg-surface-700 rounded shadow-lg z-10 py-1">
            <MenuItem label="Edit" onClick={() => { setMenuOpen(false); onEdit(); }} />
            <MenuItem label="Archive" onClick={() => { setMenuOpen(false); onArchive(); }} />
            {label.name !== "Default" && (
              <MenuItem label="Delete" onClick={() => { setMenuOpen(false); onDelete(); }} danger />
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-surface-600
        ${danger ? "text-red-400" : "text-gray-200"}`}
    >
      {label}
    </button>
  );
}

// ─── Label modal ──────────────────────────────────────────────────────────────

interface ModalProps {
  initial?: Label;
  onSave: (req: Omit<CreateLabelRequest, "name"> & { name?: string }) => void;
  onClose: () => void;
}

function LabelModal({ initial, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colorIndex, setColorIndex] = useState(initial?.colorIndex ?? 0);
  const [useDefault, setUseDefault] = useState(initial?.useDefaultProfile ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      colorIndex,
      useDefaultProfile: useDefault,
      timerProfile: initial?.timerProfile ?? {
        name: "72/5",
        isCountdown: true,
        workDuration: 72,
        isBreakEnabled: true,
        breakDuration: 5,
        isLongBreakEnabled: false,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        workBreakRatio: 3,
      },
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl p-6 w-80 shadow-2xl">
        <h2 className="text-white font-semibold mb-4">{initial ? "Edit Label" : "New Label"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!initial && (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Label name"
              required
              className="w-full bg-surface-700 text-white rounded-lg px-3 py-2 text-sm
                         border border-surface-600 focus:outline-none focus:border-brand-500"
            />
          )}

          {/* Color picker */}
          <div>
            <p className="text-gray-400 text-xs mb-2">Color</p>
            <div className="grid grid-cols-8 gap-1.5">
              {LABEL_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setColorIndex(i)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: colorIndex === i ? `2px solid white` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => setUseDefault(e.target.checked)}
              className="accent-brand-500"
            />
            Use default timer profile
          </label>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
