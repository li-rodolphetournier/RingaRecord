import { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';

/**
 * Hook pour gérer le thème (light/dark mode)
 * Utilise le store Zustand pour partager l'état entre tous les composants
 */
export const useTheme = () => {
  const { theme, isDark, toggleTheme, setTheme } = useThemeStore();

  // Écouter les changements de préférence système (optionnel)
  // Ne s'applique que si l'utilisateur n'a pas encore fait de choix explicite
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Ne changer que si l'utilisateur n'a pas encore fait de choix explicite
      const stored = localStorage.getItem('ringarecord-theme');
      if (!stored || stored === 'null' || stored === 'undefined') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    // Support pour les navigateurs modernes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback pour les anciens navigateurs
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [setTheme]);

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };
};

