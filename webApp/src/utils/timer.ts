import { TimerProfile, TimerType } from '../types';

export const formatTime = (seconds: number, format: 'minutes' | 'hours' = 'hours', showSeconds: boolean = true): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (format === 'minutes') {
    // Display as minutes only (e.g., "72:45" or "72" if not showing seconds)
    const totalMinutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (showSeconds) {
      return `${totalMinutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${totalMinutes}`;
    }
  } else {
    // Original hours format
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

export const getDurationForTimerType = (profile: TimerProfile, timerType: TimerType): number => {
  switch (timerType) {
    case TimerType.FOCUS:
      return profile.workDuration;
    case TimerType.BREAK:
      return profile.breakDuration;
    case TimerType.LONG_BREAK:
      return profile.longBreakDuration;
    default:
      return profile.workDuration;
  }
};

export const getNextTimerType = (
  currentType: TimerType,
  profile: TimerProfile,
  completedSessions: number
): TimerType => {
  if (currentType === TimerType.FOCUS) {
    if (profile.isLongBreakEnabled && completedSessions % profile.sessionsBeforeLongBreak === 0) {
      return TimerType.LONG_BREAK;
    }
    return profile.isBreakEnabled ? TimerType.BREAK : TimerType.FOCUS;
  }
  return TimerType.FOCUS;
};

export const getTimerTypeLabel = (timerType: TimerType): string => {
  switch (timerType) {
    case TimerType.FOCUS:
      return 'Focus';
    case TimerType.BREAK:
      return 'Break';
    case TimerType.LONG_BREAK:
      return 'Long Break';
    default:
      return 'Focus';
  }
};

export const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    });
  }
};