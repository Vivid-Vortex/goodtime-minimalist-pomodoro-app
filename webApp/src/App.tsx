import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { Settings, SettingsButton } from './components/Settings';
import { Statistics } from './components/Statistics';
import { Labels } from './components/Labels';
import { useTimerStore } from './stores/timerStore';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const { currentType } = useTimerStore();

  // Update document title based on timer state
  useEffect(() => {
    const { timeRemaining, isRunning, currentType } = useTimerStore.getState();
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (isRunning) {
      document.title = `${timeString} - ${currentType} | Goodtime`;
    } else {
      document.title = 'Goodtime Pomodoro Timer';
    }

    // Update favicon based on timer type
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      switch (currentType) {
        case 'FOCUS':
          favicon.href = '/favicon-focus.ico';
          break;
        case 'BREAK':
          favicon.href = '/favicon-break.ico';
          break;
        case 'LONG_BREAK':
          favicon.href = '/favicon-longbreak.ico';
          break;
        default:
          favicon.href = '/favicon.ico';
      }
    }
  }, [currentType]);

  // Subscribe to timer state changes for title updates
  useEffect(() => {
    const unsubscribe = useTimerStore.subscribe((state) => {
      const minutes = Math.floor(state.timeRemaining / 60);
      const seconds = state.timeRemaining % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (state.isRunning) {
        document.title = `${timeString} - ${state.currentType} | Goodtime`;
      } else {
        document.title = 'Goodtime Pomodoro Timer';
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen">
      <SettingsButton onClick={() => setIsSettingsOpen(true)} />
      <Timer onShowStats={() => setIsStatsOpen(true)} />
      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onOpenLabels={() => setIsLabelsOpen(true)}
      />
      <Statistics 
        isOpen={isStatsOpen} 
        onClose={() => setIsStatsOpen(false)} 
      />
      <Labels 
        isOpen={isLabelsOpen} 
        onClose={() => setIsLabelsOpen(false)} 
      />
    </div>
  );
}

export default App;