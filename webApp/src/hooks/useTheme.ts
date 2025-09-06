import { useEffect } from 'react';
import { useAppSettingsStore } from '../stores/appSettingsStore';

export const useTheme = () => {
  const { settings } = useAppSettingsStore();
  const { theme } = settings;

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        applyTheme(e.matches);
      }
    };

    // Apply theme based on setting
    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else if (theme === 'auto') {
      // Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      
      // Listen for system theme changes
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [theme]);

  const isDarkMode = () => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  return {
    theme,
    isDarkMode: isDarkMode()
  };
};