import { useEffect, useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { useTimerStore } from '../stores/timerStore';

export function useDataInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load profiles from database
        await useProfileStore.getState().loadProfiles();
        
        // Sync timer with the active profile
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