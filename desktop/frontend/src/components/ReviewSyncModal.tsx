import { useState, useEffect } from "react";
import {
  GetUnsyncedSessions,
  PushSelectedSessions,
  UpdateSession,
  DeleteSessions,
} from "../wailsjs/go/main/App";
import type { Session, CloudSyncStatus, UpdateRequest } from "../types";

interface Props {
  onClose: () => void;
  onSyncComplete: (result: CloudSyncStatus) => void;
}

export function ReviewSyncModal({ onClose, onSyncComplete }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ duration: number; labelName: string; notes: string }>({
    duration: 0,
    labelName: "",
    notes: "",
  });

  function reload() {
    setLoading(true);
    GetUnsyncedSessions()
      .then((s) => {
        setSessions(s ?? []);
        setSelected(new Set((s ?? []).map((x) => x.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, []);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => s.id)));
    }
  }

  function startEdit(s: Session) {
    setEditingId(s.id);
    setEditForm({ duration: s.duration, labelName: s.labelName, notes: s.notes });
  }

  function commitEdit(s: Session) {
    const req: UpdateRequest = {
      id: s.id,
      timestamp: s.timestamp,
      duration: editForm.duration,
      interruptions: s.interruptions,
      labelName: editForm.labelName,
      notes: editForm.notes,
      isWork: s.isWork,
    };
    UpdateSession(req)
      .then(reload)
      .catch(console.error);
    setEditingId(null);
  }

  function deleteSession(id: number) {
    DeleteSessions([id])
      .then(() => {
        setSessions((prev) => prev.filter((x) => x.id !== id));
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      })
      .catch(console.error);
  }

  function handlePush() {
    if (selected.size === 0) return;
    setPushing(true);
    PushSelectedSessions([...selected])
      .then((result) => {
        onSyncComplete(result);
        if (!result.error) onClose();
      })
      .catch((err) =>
        onSyncComplete({ docsCreated: 0, docsUpdated: 0, error: String(err), credsMissing: false })
      )
      .finally(() => setPushing(false));
  }

  function formatDate(ms: number) {
    return new Date(ms).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const allSelected = sessions.length > 0 && selected.size === sessions.length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-2xl w-[680px] max-h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-white font-semibold text-base">Review sessions before sync</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Edit or remove sessions, then push the ones you want to keep.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl transition-colors leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm py-10">
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm py-10 gap-2">
            <span className="text-3xl">✓</span>
            <p>All sessions have already been synced.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-900 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-2.5 text-left w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-brand-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-gray-400 font-medium text-xs">Date</th>
                  <th className="px-3 py-2.5 text-left text-gray-400 font-medium text-xs">Label</th>
                  <th className="px-3 py-2.5 text-left text-gray-400 font-medium text-xs">Mins</th>
                  <th className="px-3 py-2.5 text-left text-gray-400 font-medium text-xs">Notes</th>
                  <th className="px-3 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {sessions.map((s) => {
                  const isEditing = editingId === s.id;
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        selected.has(s.id) ? "bg-brand-900/20" : "hover:bg-surface-700/30"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="accent-brand-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap text-xs">
                        {formatDate(s.timestamp)}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <input
                            value={editForm.labelName}
                            onChange={(e) => setEditForm((f) => ({ ...f, labelName: e.target.value }))}
                            className="bg-surface-600 text-white text-xs rounded px-2 py-1 w-20 outline-none border border-surface-500 focus:border-brand-500"
                          />
                        ) : (
                          <span className="text-brand-400 font-mono text-xs bg-brand-900/30 px-1.5 py-0.5 rounded">
                            {s.labelName || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.duration}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, duration: parseInt(e.target.value, 10) || 0 }))
                            }
                            className="bg-surface-600 text-white text-xs rounded px-2 py-1 w-16 outline-none border border-surface-500 focus:border-brand-500"
                            min={1}
                          />
                        ) : (
                          <span className="text-gray-300 text-xs">{s.duration}m</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <input
                            value={editForm.notes}
                            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                            className="bg-surface-600 text-white text-xs rounded px-2 py-1 w-32 outline-none border border-surface-500 focus:border-brand-500"
                            placeholder="notes…"
                          />
                        ) : (
                          <span className="text-gray-500 text-xs truncate max-w-[8rem] block">
                            {s.notes || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2 items-center justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => commitEdit(s)}
                                className="text-green-400 hover:text-green-300 text-sm transition-colors"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-gray-500 hover:text-white text-sm transition-colors"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(s)}
                                className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => deleteSession(s.id)}
                                className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-700 flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            {sessions.length === 0
              ? "No pending sessions"
              : `${selected.size} of ${sessions.length} selected`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePush}
              disabled={pushing || selected.size === 0}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors
                ${pushing || selected.size === 0
                  ? "bg-surface-600 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white"
                }`}
            >
              {pushing ? "Pushing…" : `Push Selected (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
