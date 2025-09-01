import React, { useEffect } from 'react';
import { Play, Pause, Square, SkipForward, RotateCcw, BarChart3, Plus } from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import { formatTime, getTimerTypeLabel, requestNotificationPermission } from '../utils/timer';
import { TimerState, TimerType } from '../types';
import { LabelSelector } from './LabelSelector';
import { useLabelStore } from '../stores/labelStore';
import { useAppSettingsStore } from '../stores/appSettingsStore';

interface TimerProps {
  onShowStats?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ onShowStats }) => {
  const {
    state,
    currentType,
    timeRemaining,
    totalTime,
    completedSessions,
    start,
    pause,
    resume,
    stop,
    skip,
    reset,
    addTime,
    setLabel
  } = useTimerStore();

  const { selectedLabel } = useLabelStore();
  const { settings } = useAppSettingsStore();

  useEffect(() => {
    // Request notification permission on component mount
    requestNotificationPermission();
  }, []);

  // Update timer label when selected label changes
  useEffect(() => {
    if (selectedLabel && selectedLabel.title) {
      setLabel(selectedLabel.title);
    }
  }, [selectedLabel, setLabel]);

  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  const isRunning = state === TimerState.RUNNING;
  const isPaused = state === TimerState.PAUSED;
  const isStopped = state === TimerState.STOPPED;

  const handlePlayPause = () => {
    if (isRunning) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      start();
    }
  };

  const getTimerColor = () => {
    switch (currentType) {
      case TimerType.FOCUS:
        return 'text-red-500 border-red-500';
      case TimerType.BREAK:
        return 'text-green-500 border-green-500';
      case TimerType.LONG_BREAK:
        return 'text-blue-500 border-blue-500';
      default:
        return 'text-red-500 border-red-500';
    }
  };

  const getBackgroundColor = () => {
    switch (currentType) {
      case TimerType.FOCUS:
        return 'bg-red-50';
      case TimerType.BREAK:
        return 'bg-green-50';
      case TimerType.LONG_BREAK:
        return 'bg-blue-50';
      default:
        return 'bg-red-50';
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${getBackgroundColor()}`}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Goodtime</h1>
          <p className="text-gray-600 mb-3">{getTimerTypeLabel(currentType)}</p>
          

          {/* Label Selector */}
          <div className="max-w-48 mx-auto">
            <LabelSelector compact />
          </div>
        </div>

        {/* Timer Circle */}
        <div className="relative mb-8">
          <svg className="transform -rotate-90 w-64 h-64 mx-auto">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              className={getTimerColor().split(' ')[0]}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Time display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-4xl font-mono font-bold ${getTimerColor().split(' ')[0]}`}>
                {formatTime(timeRemaining, settings?.timerDisplayFormat || 'minutes', settings?.showSeconds !== false)}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-3 mb-6">
          <button
            onClick={handlePlayPause}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isRunning 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <button
            onClick={stop}
            disabled={isStopped}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
          >
            <Square size={24} />
          </button>
          
          <button
            onClick={() => addTime(60)}
            disabled={isStopped}
            className="w-16 h-16 rounded-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
            title="Add 60 seconds"
          >
            <div className="flex flex-col items-center text-xs">
              <Plus size={16} />
              <span>60s</span>
            </div>
          </button>
          
          <button
            onClick={skip}
            disabled={isStopped}
            className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
          >
            <SkipForward size={24} />
          </button>
          
          <button
            onClick={reset}
            className="w-16 h-16 rounded-full bg-gray-500 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* Session Counter & Stats Button */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">
            Completed Sessions: <span className="font-bold">{completedSessions}</span>
          </p>
          
          {onShowStats && (
            <button
              onClick={onShowStats}
              className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <BarChart3 size={16} className="mr-2" />
              View Statistics
            </button>
          )}
        </div>
      </div>
    </div>
  );
};