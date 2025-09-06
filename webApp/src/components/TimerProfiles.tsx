import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Check, Copy, Clock, Play, RotateCcw } from 'lucide-react';
import { useProfileStore, TimerProfileWithId } from '../stores/profileStore';
import { TimerProfile } from '../types';

interface TimerProfilesProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSelect?: (profile: TimerProfileWithId) => void;
}

export const TimerProfiles: React.FC<TimerProfilesProps> = ({ 
  isOpen, 
  onClose, 
  onProfileSelect 
}) => {
  const { 
    profiles, 
    activeProfile,
    addProfile, 
    updateProfile, 
    deleteProfile, 
    setActiveProfile,
    duplicateProfile,
    resetToPresets
  } = useProfileStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState<Partial<TimerProfile>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newProfile, setNewProfile] = useState<Partial<TimerProfile & { name: string }>>({
    name: '',
    isCountdown: true,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    isBreakEnabled: true,
    isLongBreakEnabled: true,
    workBreakRatio: 3
  });

  const handleStartEdit = (profile: TimerProfileWithId) => {
    setEditingId(profile.id);
    setEditProfile(profile);
  };

  const handleSaveEdit = () => {
    if (editingId && editProfile.name?.trim()) {
      updateProfile(editingId, editProfile);
      setEditingId(null);
      setEditProfile({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditProfile({});
  };

  const handleCreate = () => {
    if (newProfile.name?.trim()) {
      addProfile(newProfile as TimerProfile & { name: string });
      setIsCreating(false);
      setNewProfile({
        name: '',
        isCountdown: true,
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        isBreakEnabled: true,
        isLongBreakEnabled: true,
        workBreakRatio: 3
      });
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewProfile({
      name: '',
      isCountdown: true,
      workDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      isBreakEnabled: true,
      isLongBreakEnabled: true,
      workBreakRatio: 3
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this timer profile? This action cannot be undone.')) {
      deleteProfile(id);
    }
  };

  const handleDuplicate = (profile: TimerProfileWithId) => {
    const baseName = profile.name || 'Untitled';
    const copyName = `${baseName} (Copy)`;
    duplicateProfile(profile.id, copyName);
  };

  const handleSelectProfile = (profile: TimerProfileWithId) => {
    setActiveProfile(profile.name!);
    onProfileSelect?.(profile);
  };

  const handleResetToPresets = () => {
    if (confirm('This will replace all your custom profiles with the default presets. Continue?')) {
      resetToPresets();
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const ProfileForm: React.FC<{
    profile: Partial<TimerProfile & { name: string }>;
    onChange: (updates: Partial<TimerProfile & { name: string }>) => void;
  }> = ({ profile, onChange }) => (
    <div className="space-y-4">
      <input
        type="text"
        value={profile.name || ''}
        onChange={(e) => onChange({ ...profile, name: e.target.value })}
        placeholder="Profile name"
        maxLength={50}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
          <select
            value={profile.isCountdown ? 'countdown' : 'stopwatch'}
            onChange={(e) => onChange({ ...profile, isCountdown: e.target.value === 'countdown' })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="countdown">Countdown</option>
            <option value="stopwatch">Stopwatch</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Focus (min)</label>
          <input
            type="number"
            min="1"
            max="999"
            value={profile.workDuration || 25}
            onChange={(e) => onChange({ ...profile, workDuration: parseInt(e.target.value) || 25 })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={profile.isBreakEnabled || false}
            onChange={(e) => onChange({ ...profile, isBreakEnabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Enable Breaks</span>
        </label>
        
        {profile.isBreakEnabled && (
          <input
            type="number"
            min="1"
            max="120"
            value={profile.breakDuration || 5}
            onChange={(e) => onChange({ ...profile, breakDuration: parseInt(e.target.value) || 5 })}
            className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5"
          />
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={profile.isLongBreakEnabled || false}
            onChange={(e) => onChange({ ...profile, isLongBreakEnabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Long Breaks</span>
        </label>
        
        {profile.isLongBreakEnabled && (
          <>
            <input
              type="number"
              min="1"
              max="240"
              value={profile.longBreakDuration || 15}
              onChange={(e) => onChange({ ...profile, longBreakDuration: parseInt(e.target.value) || 15 })}
              className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="15"
            />
            <span className="text-sm text-gray-600">every</span>
            <input
              type="number"
              min="2"
              max="20"
              value={profile.sessionsBeforeLongBreak || 4}
              onChange={(e) => onChange({ ...profile, sessionsBeforeLongBreak: parseInt(e.target.value) || 4 })}
              className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="4"
            />
          </>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Clock size={24} />
            Timer Profiles
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleResetToPresets}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw size={16} className="inline mr-1" />
              Reset to Presets
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Create New Profile */}
        <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Plus size={20} />
              Create New Profile
            </button>
          ) : (
            <div className="space-y-4">
              <ProfileForm profile={newProfile} onChange={setNewProfile} />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newProfile.name?.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={16} />
                  Create
                </button>
                <button
                  onClick={handleCancelCreate}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profiles Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`p-4 border rounded-lg transition-colors ${
                activeProfile.id === profile.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {editingId === profile.id ? (
                <div className="space-y-4">
                  <ProfileForm profile={editProfile} onChange={setEditProfile} />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editProfile.name?.trim()}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Check size={14} />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {profile.name || 'Untitled Profile'}
                        {profile.id === 'default' && (
                          <span className="ml-2 text-xs text-gray-500">(Default)</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {profile.isCountdown ? 'Countdown' : 'Stopwatch'} • 
                        Focus: {formatDuration(profile.workDuration)}
                        {profile.isBreakEnabled && ` • Break: ${formatDuration(profile.breakDuration)}`}
                        {profile.isLongBreakEnabled && ` • Long: ${formatDuration(profile.longBreakDuration)}`}
                      </p>
                    </div>
                    {activeProfile.id === profile.id && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Play size={14} />
                        <span className="text-xs">Active</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-between">
                    <button
                      onClick={() => handleSelectProfile(profile)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeProfile.id === profile.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {activeProfile.id === profile.id ? 'Active' : 'Use Profile'}
                    </button>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(profile)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(profile)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      {profile.id !== 'default' && (
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {profiles.length === 1 && (
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Create your first custom timer profile!</p>
            <p className="text-sm mt-1">Or reset to presets to get started with common configurations.</p>
          </div>
        )}
      </div>
    </div>
  );
};