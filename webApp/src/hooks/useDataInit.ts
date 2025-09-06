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

        console.log('🚀 Starting data initialization...');

        // Load all data from database with individual error handling
        try {
          console.log('📊 Loading profiles...');
          await useProfileStore.getState().loadProfiles();
          console.log('✅ Profiles loaded');
        } catch (err) {
          console.warn('⚠️ Failed to load profiles:', err);
        }

        try {
          console.log('🏷️ Loading labels from cloud...');
          await useLabelStore.getState().forceRefreshFromCloud();
          console.log('✅ Labels loaded from cloud');
        } catch (err) {
          console.warn('⚠️ Failed to load labels from cloud:', err);
        }

        try {
          console.log('📈 Loading sessions...');
          await useSessionStore.getState().loadSessions();
          console.log('✅ Sessions loaded');
        } catch (err) {
          console.warn('⚠️ Failed to load sessions:', err);
        }
        
        // Initialize and sync timer with the active profile
        try {
          console.log('⏰ Initializing timer...');
          useTimerStore.getState().initialize();
          useTimerStore.getState().syncWithActiveProfile();
          console.log('✅ Timer initialized');
        } catch (err) {
          console.warn('⚠️ Failed to initialize timer:', err);
        }

        console.log('✅ Data initialization completed');
        setIsInitialized(true);
      } catch (err) {
        console.error('❌ Critical initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        
        // Still mark as initialized to allow the app to work in degraded mode
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