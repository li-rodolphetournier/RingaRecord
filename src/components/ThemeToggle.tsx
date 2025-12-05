import { useTheme } from '../hooks/useTheme';
import { Switch } from './ui/Switch';

/**
 * Composant pour basculer entre le mode clair et sombre
 * Affiche un switch avec une icône soleil/lune
 */
export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-center gap-2.5">
      {/* Icône soleil (mode clair) */}
      <svg
        className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
          !isDark
            ? 'opacity-100 text-yellow-500 scale-110'
            : 'opacity-30 text-gray-400 dark:text-gray-500 scale-100'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      <div className="flex items-center">
        <Switch
          checked={isDark}
          onChange={toggleTheme}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="flex-shrink-0"
        />
      </div>

      {/* Icône lune (mode sombre) */}
      <svg
        className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
          isDark
            ? 'opacity-100 text-blue-400 scale-110'
            : 'opacity-30 text-gray-400 scale-100'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </div>
  );
};

