import { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { useTimerStore } from '../stores/timerStore';
import { useLabelStore } from '../stores/labelStore';
import { useSessionStore } from '../stores/sessionStore';

export function useDataInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load all data from database
        await useProfileStore.getState().loadProfiles();
        await useLabelStore.getState().loadLabels();
        await useSessionStore.getState().loadSessions();
        
        // Initialize and sync timer with the active profile
        useTimerStore.getState().initialize();
        useTimerStore.getState().syncWithActiveProfile();

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        
        // Still mark as initialized to allow the app to work
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  return {
    isInitialized,
    isLoading,
    error
  };
}