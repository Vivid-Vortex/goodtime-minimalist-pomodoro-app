import { useEffect, useState } from 'react';

export function useDataInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simple initialization - just wait a bit to simulate loading
        await new Promise(resolve => setTimeout(resolve, 100));

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