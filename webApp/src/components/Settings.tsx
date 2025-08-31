import React, { useState } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile } = useTimerStore();
  const [tempProfile, setTempProfile] = useState(profile);

  const handleSave = () => {
    updateProfile(tempProfile);
    onClose();
  };

  const handleCancel = () => {
    setTempProfile(profile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Timer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timer Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="timerMode"
                  checked={tempProfile.isCountdown}
                  onChange={() => setTempProfile({ ...tempProfile, isCountdown: true })}
                  className="mr-2"
                />
                <span className="text-sm">Countdown Timer</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="timerMode"
                  checked={!tempProfile.isCountdown}
                  onChange={() => setTempProfile({ ...tempProfile, isCountdown: false })}
                  className="mr-2"
                />
                <span className="text-sm">Stopwatch Timer</span>
              </label>
            </div>
          </div>

          {/* Work Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Focus Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={tempProfile.workDuration}
              onChange={(e) => setTempProfile({ 
                ...tempProfile, 
                workDuration: parseInt(e.target.value) || 25 
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Break Settings */}
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={tempProfile.isBreakEnabled}
                onChange={(e) => setTempProfile({ 
                  ...tempProfile, 
                  isBreakEnabled: e.target.checked 
                })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Enable Breaks</span>
            </label>
            
            {tempProfile.isBreakEnabled && (
              <input
                type="number"
                min="1"
                max="60"
                value={tempProfile.breakDuration}
                onChange={(e) => setTempProfile({ 
                  ...tempProfile, 
                  breakDuration: parseInt(e.target.value) || 5 
                })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Break duration (minutes)"
              />
            )}
          </div>

          {/* Long Break Settings */}
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={tempProfile.isLongBreakEnabled}
                onChange={(e) => setTempProfile({ 
                  ...tempProfile, 
                  isLongBreakEnabled: e.target.checked 
                })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Enable Long Breaks</span>
            </label>
            
            {tempProfile.isLongBreakEnabled && (
              <div className="space-y-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={tempProfile.longBreakDuration}
                  onChange={(e) => setTempProfile({ 
                    ...tempProfile, 
                    longBreakDuration: parseInt(e.target.value) || 15 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Long break duration (minutes)"
                />
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={tempProfile.sessionsBeforeLongBreak}
                  onChange={(e) => setTempProfile({ 
                    ...tempProfile, 
                    sessionsBeforeLongBreak: parseInt(e.target.value) || 4 
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Sessions before long break"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
    >
      <SettingsIcon size={20} className="text-gray-600" />
    </button>
  );
};