import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Fonction pour appliquer le thème au document root
 */
const applyThemeToDocument = (theme: Theme) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

/**
 * Fonction pour obtenir le thème initial (localStorage ou préférence système)
 */
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  
  // Vérifier localStorage (Zustand stocke dans un format JSON avec persist)
  try {
    const stored = localStorage.getItem('ringarecord-theme');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Zustand persist stocke dans { state: { ... } }
      if (parsed?.state?.theme === 'dark' || parsed?.state?.theme === 'light') {
        return parsed.state.theme;
      }
    }
  } catch {
    // Ignorer les erreurs de parsing
  }
  
  // Utiliser la préférence système
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

/**
 * Store Zustand pour gérer le thème (light/dark mode)
 * Persiste le choix dans localStorage et applique la classe 'dark' sur l'élément html
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => {
      const initialTheme = getInitialTheme();
      
      // Appliquer le thème initial immédiatement
      applyThemeToDocument(initialTheme);
      
      return {
        theme: initialTheme,
        isDark: initialTheme === 'dark',

        toggleTheme: () => {
          set((state) => {
            const newTheme = state.theme === 'dark' ? 'light' : 'dark';
            applyThemeToDocument(newTheme);
            
            return {
              theme: newTheme,
              isDark: newTheme === 'dark',
            };
          });
        },

        setTheme: (newTheme: Theme) => {
          applyThemeToDocument(newTheme);
          set({
            theme: newTheme,
            isDark: newTheme === 'dark',
          });
        },
      };
    },
    {
      name: 'ringarecord-theme',
      storage: createJSONStorage(() => localStorage),
      // Appliquer le thème après réhydratation
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDocument(state.theme);
        }
      },
    },
  ),
);

