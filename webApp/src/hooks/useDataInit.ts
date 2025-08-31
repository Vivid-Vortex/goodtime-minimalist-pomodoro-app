import { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useLabelStore } from '../stores/labelStore';
import { useProfileStore } from '../stores/profileStore';

export function useDataInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useSessionStore(state => state.loadSessions);
  const loadLabels = useLabelStore(state => state.loadLabels);
  const loadProfiles = useProfileStore(state => state.loadProfiles);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load data from database in parallel
        await Promise.all([
          loadSessions(),
          loadLabels(),
          loadProfiles()
        ]);

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        
        // Still mark as initialized to allow the app to work with local storage fallback
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [loadSessions, loadLabels, loadProfiles]);

  return {
    isInitialized,
    isLoading,
    error
  };
}