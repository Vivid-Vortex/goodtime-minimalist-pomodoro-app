import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Check, Calendar, Clock, Save } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { useLabelStore } from '../stores/labelStore';
import { TimerType } from '../types';
import { formatDurationForExport } from '../utils/export';

interface SessionEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SessionFormData {
  id?: string;
  label: string;
  timerType: TimerType;
  duration: number; // in seconds
  endTime: number;
  archived: boolean;
  date?: string; // for manual date input
  time?: string; // for manual time input
}

export const SessionEditor: React.FC<SessionEditorProps> = ({ isOpen, onClose }) => {
  const { sessions, addSession, updateSession, deleteSession, clearSessions } = useSessionStore();
  const { getActiveLabels, getLabelColor } = useLabelStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>({
    label: 'Work',
    timerType: TimerType.FOCUS,
    duration: 1500, // 25 minutes in seconds
    endTime: Date.now(),
    archived: false,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5)
  });

  const activeLabels = getActiveLabels();
  const recentSessions = sessions.slice(-20).reverse();

  const handleStartCreate = () => {
    const now = new Date();
    setFormData({
      label: activeLabels[0]?.name || 'Work',
      timerType: TimerType.FOCUS,
      duration: 1500,
      endTime: now.getTime(),
      archived: false,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5)
    });
    setIsCreating(true);
  };

  const handleStartEdit = (session: any) => {
    const sessionDate = new Date(session.endTime);
    setFormData({
      id: session.id,
      label: session.label,
      timerType: session.timerType,
      duration: session.duration,
      endTime: session.endTime,
      archived: session.archived,
      date: sessionDate.toISOString().split('T')[0],
      time: sessionDate.toTimeString().slice(0, 5)
    });
    setEditingId(session.id);
  };

  const handleSave = () => {
    if (!formData.label.trim()) return;

    // Combine date and time to create endTime
    const endDateTime = new Date(`${formData.date}T${formData.time}`);
    const endTime = endDateTime.getTime();

    const sessionData = {
      label: formData.label.trim(),
      timerType: formData.timerType,
      duration: formData.duration,
      endTime,
      archived: formData.archived
    };

    if (isCreating) {
      addSession(sessionData);
      setIsCreating(false);
    } else if (editingId) {
      updateSession(editingId, sessionData);
      setEditingId(null);
    }

    setFormData({
      label: 'Work',
      timerType: TimerType.FOCUS,
      duration: 1500,
      endTime: Date.now(),
      archived: false,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5)
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      label: 'Work',
      timerType: TimerType.FOCUS,
      duration: 1500,
      endTime: Date.now(),
      archived: false,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5)
    });
  };

  const handleDelete = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      deleteSession(sessionId);
    }
  };

  const formatDurationInput = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDurationInput = (input: string): number => {
    const parts = input.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else {
      return parts[0] * 60; // Assume minutes if single number
    }
  };

  const SessionForm: React.FC = () => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-800">
        {isCreating ? 'Add Manual Session' : 'Edit Session'}
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
          <select
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {activeLabels.map((label) => (
              <option key={label.id} value={label.name}>
                {label.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            value={formData.timerType}
            onChange={(e) => setFormData({ ...formData, timerType: e.target.value as TimerType })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={TimerType.FOCUS}>Focus</option>
            <option value={TimerType.BREAK}>Break</option>
            <option value={TimerType.LONG_BREAK}>Long Break</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duration (MM:SS or HH:MM:SS)
        </label>
        <input
          type="text"
          value={formatDurationInput(formData.duration)}
          onChange={(e) => {
            const duration = parseDurationInput(e.target.value);
            setFormData({ ...formData, duration });
          }}
          placeholder="25:00"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Examples: 25:00 (25 min), 1:30:00 (1.5 hours), 5:30 (5.5 min)
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!formData.label.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={16} />
          {isCreating ? 'Add Session' : 'Save Changes'}
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Edit3 size={24} />
            Manual Session Editor
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add Session Button or Form */}
        {!isCreating && !editingId && (
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <button
              onClick={handleStartCreate}
              className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Plus size={20} />
              Add Manual Session
            </button>
          </div>
        )}

        {(isCreating || editingId) && <SessionForm />}

        {/* Recent Sessions */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Sessions ({recentSessions.length})
            </h3>
            {sessions.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all session data? This cannot be undone.')) {
                    clearSessions();
                  }
                }}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => {
                const label = activeLabels.find(l => l.name === session.label);
                const labelColor = label ? getLabelColor(label.colorIndex) : '#6b7280';
                
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: labelColor }}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{session.label}</span>
                        <span className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                          {session.timerType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDurationForExport(session.duration)} • 
                        {new Date(session.endTime).toLocaleDateString()} {new Date(session.endTime).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(session)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No sessions recorded yet.</p>
                <p className="text-sm mt-1">Add manual sessions or complete some timers to see them here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};