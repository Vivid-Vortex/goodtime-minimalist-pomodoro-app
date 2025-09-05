import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Tag, Clock, Sliders } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import { useProfileStore } from '../stores/profileStore';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLabels?: () => void;
  onOpenProfiles?: () => void;
  onOpenAdvanced?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onOpenLabels, onOpenProfiles, onOpenAdvanced }) => {
  const { syncWithActiveProfile } = useTimerStore();
  const { activeProfile, updateProfile } = useProfileStore();
  const [tempProfile, setTempProfile] = useState(activeProfile);

  // Update tempProfile when activeProfile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTempProfile(activeProfile);
    }
  }, [activeProfile, isOpen]);

  const handleSave = async () => {
    try {
      if (activeProfile.name) {
        await updateProfile(activeProfile.name, tempProfile);
        // Sync timer with the updated profile settings
        syncWithActiveProfile();
      }
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setTempProfile(activeProfile);
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
          {/* Quick Access Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {onOpenLabels && (
              <button
                onClick={() => {
                  onOpenLabels();
                  onClose();
                }}
                className="flex flex-col items-center gap-2 px-3 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border-2 border-dashed border-blue-300 transition-colors"
              >
                <Tag size={18} />
                <span className="text-xs font-medium">Labels</span>
              </button>
            )}
            
            {onOpenProfiles && (
              <button
                onClick={() => {
                  onOpenProfiles();
                  onClose();
                }}
                className="flex flex-col items-center gap-2 px-3 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border-2 border-dashed border-purple-300 transition-colors"
              >
                <Clock size={18} />
                <span className="text-xs font-medium">Profiles</span>
              </button>
            )}
            
            {onOpenAdvanced && (
              <button
                onClick={() => {
                  onOpenAdvanced();
                  onClose();
                }}
                className="flex flex-col items-center gap-2 px-3 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border-2 border-dashed border-green-300 transition-colors"
              >
                <Sliders size={18} />
                <span className="text-xs font-medium">Advanced</span>
              </button>
            )}
          </div>

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
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="999"
                step="1"
                value={tempProfile.workDuration}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setTempProfile({ 
                    ...tempProfile, 
                    workDuration: Math.max(1, Math.min(999, value))
                  });
                }}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g. 25, 45, 72"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setTempProfile({ 
                    ...tempProfile, 
                    workDuration: Math.min(999, tempProfile.workDuration + 5)
                  })}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setTempProfile({ 
                    ...tempProfile, 
                    workDuration: Math.max(1, tempProfile.workDuration - 5)
                  })}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  -5
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Any duration from 1 to 999 minutes (e.g. 25, 45, 72, 90)
            </p>
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
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={tempProfile.breakDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setTempProfile({ 
                      ...tempProfile, 
                      breakDuration: Math.max(1, Math.min(120, value))
                    });
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Break duration (minutes)"
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setTempProfile({ 
                      ...tempProfile, 
                      breakDuration: Math.min(120, tempProfile.breakDuration + 1)
                    })}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempProfile({ 
                      ...tempProfile, 
                      breakDuration: Math.max(1, tempProfile.breakDuration - 1)
                    })}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    -1
                  </button>
                </div>
              </div>
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
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={tempProfile.longBreakDuration}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setTempProfile({ 
                        ...tempProfile, 
                        longBreakDuration: Math.max(1, Math.min(240, value))
                      });
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Long break duration (minutes)"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setTempProfile({ 
                        ...tempProfile, 
                        longBreakDuration: Math.min(240, tempProfile.longBreakDuration + 5)
                      })}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempProfile({ 
                        ...tempProfile, 
                        longBreakDuration: Math.max(1, tempProfile.longBreakDuration - 5)
                      })}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      -5
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={tempProfile.sessionsBeforeLongBreak}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 2;
                      setTempProfile({ 
                        ...tempProfile, 
                        sessionsBeforeLongBreak: Math.max(2, Math.min(20, value))
                      });
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Sessions before long break"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setTempProfile({ 
                        ...tempProfile, 
                        sessionsBeforeLongBreak: Math.min(20, tempProfile.sessionsBeforeLongBreak + 1)
                      })}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempProfile({ 
                        ...tempProfile, 
                        sessionsBeforeLongBreak: Math.max(2, tempProfile.sessionsBeforeLongBreak - 1)
                      })}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      -1
                    </button>
                  </div>
                </div>
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