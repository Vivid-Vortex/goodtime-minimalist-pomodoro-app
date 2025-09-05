import { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { Settings, SettingsButton } from './components/Settings';
import { Statistics } from './components/Statistics';
import { Labels } from './components/Labels';
import { TimerProfiles } from './components/TimerProfiles';
import { AdvancedSettings } from './components/AdvancedSettings';
import { useTimerStore } from './stores/timerStore';
import { useDataInit } from './hooks/useDataInit';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { currentType } = useTimerStore();
  const { isLoading, error } = useDataInit();

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

  // Show loading screen while initializing data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Goodtime...</p>
        </div>
      </div>
    );
  }

  // Show error if data initialization failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Initialization Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SettingsButton onClick={() => setIsSettingsOpen(true)} />
      <Timer onShowStats={() => setIsStatsOpen(true)} />
      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onOpenLabels={() => setIsLabelsOpen(true)}
        onOpenProfiles={() => setIsProfilesOpen(true)}
        onOpenAdvanced={() => setIsAdvancedOpen(true)}
      />
      <Statistics 
        isOpen={isStatsOpen} 
        onClose={() => setIsStatsOpen(false)} 
      />
      <Labels 
        isOpen={isLabelsOpen} 
        onClose={() => setIsLabelsOpen(false)} 
      />
      <TimerProfiles 
        isOpen={isProfilesOpen} 
        onClose={() => setIsProfilesOpen(false)} 
      />
      <AdvancedSettings 
        isOpen={isAdvancedOpen} 
        onClose={() => setIsAdvancedOpen(false)} 
      />
    </div>
  );
}

export default App;