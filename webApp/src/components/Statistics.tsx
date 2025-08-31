import React from 'react';
import { Download, BarChart3, Clock, Target, X } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { exportSessionsAsJson, formatDurationForExport } from '../utils/export';
import { TimerType } from '../types';

interface StatisticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Statistics: React.FC<StatisticsProps> = ({ isOpen, onClose }) => {
  const { sessions, getSessionStats, clearSessions } = useSessionStore();
  const stats = getSessionStats();

  const handleExportJson = () => {
    exportSessionsAsJson();
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all session data? This action cannot be undone.')) {
      clearSessions();
    }
  };

  const recentSessions = sessions.slice(-10).reverse();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="mr-2" size={24} />
            Statistics & Export
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Focus Sessions</p>
                <p className="text-2xl font-bold text-red-700">{stats.focusSessions}</p>
              </div>
              <Target className="text-red-500" size={24} />
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Break Sessions</p>
                <p className="text-2xl font-bold text-green-700">{stats.breakSessions}</p>
              </div>
              <Clock className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Focus Time</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatDurationForExport(stats.totalFocusTime)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg. Session</p>
                <p className="text-lg font-bold text-purple-700">
                  {formatDurationForExport(Math.round(stats.averageSessionDuration))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Sessions</h3>
          <div className="max-h-48 overflow-y-auto">
            {recentSessions.length > 0 ? (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-3 ${
                          session.timerType === TimerType.FOCUS
                            ? 'bg-red-500'
                            : session.timerType === TimerType.BREAK
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {session.label || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.timerType} • {formatDurationForExport(session.duration)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(session.endTime).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No sessions recorded yet. Complete a timer to see your statistics!
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleExportJson}
            disabled={sessions.length === 0}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} className="mr-2" />
            Export JSON Report
          </button>
          
          <button
            onClick={handleClearData}
            disabled={sessions.length === 0}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Clear Data
          </button>
        </div>

        {sessions.length > 0 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        )}
      </div>
    </div>
  );
};