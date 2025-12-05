import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore } from './themeStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock window.matchMedia
const matchMediaMock = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Setup matchMedia mock before tests
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => {
      if (query === '(prefers-color-scheme: dark)') {
        return matchMediaMock(false); // Default to light
      }
      return matchMediaMock(false);
    }),
  });
});

describe('themeStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Reset document classes
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }

    // Reset matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => {
        if (query === '(prefers-color-scheme: dark)') {
          return matchMediaMock(false); // Default to light
        }
        return matchMediaMock(false);
      }),
    });
  });

  describe('Initialization', () => {
    it('should have theme and isDark properties', () => {
      const store = useThemeStore.getState();
      expect(store).toHaveProperty('theme');
      expect(store).toHaveProperty('isDark');
      expect(['light', 'dark']).toContain(store.theme);
      expect(typeof store.isDark).toBe('boolean');
    });

    it('should have toggleTheme and setTheme methods', () => {
      const store = useThemeStore.getState();
      expect(typeof store.toggleTheme).toBe('function');
      expect(typeof store.setTheme).toBe('function');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      // Set initial theme to light
      useThemeStore.getState().setTheme('light');
      let state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(state.isDark).toBe(false);

      // Toggle to dark
      useThemeStore.getState().toggleTheme();
      state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isDark).toBe(true);
    });

    it('should toggle from dark to light', () => {
      // Set initial theme to dark
      useThemeStore.getState().setTheme('dark');
      let state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isDark).toBe(true);

      // Toggle to light
      useThemeStore.getState().toggleTheme();
      state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(state.isDark).toBe(false);
    });

    it('should apply dark class to document when toggling to dark', () => {
      if (typeof document === 'undefined') {
        return; // Skip in non-DOM environment
      }

      useThemeStore.getState().setTheme('light');
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      useThemeStore.getState().toggleTheme();
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document when toggling to light', () => {
      if (typeof document === 'undefined') {
        return; // Skip in non-DOM environment
      }

      useThemeStore.getState().setTheme('dark');
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      useThemeStore.getState().toggleTheme();
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      useThemeStore.getState().setTheme('dark');
      const state = useThemeStore.getState();
      
      expect(state.theme).toBe('dark');
      expect(state.isDark).toBe(true);
    });

    it('should set theme to light', () => {
      useThemeStore.getState().setTheme('light');
      const state = useThemeStore.getState();
      
      expect(state.theme).toBe('light');
      expect(state.isDark).toBe(false);
    });

    it('should apply dark class when setting to dark', () => {
      if (typeof document === 'undefined') {
        return; // Skip in non-DOM environment
      }

      useThemeStore.getState().setTheme('dark');
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when setting to light', () => {
      if (typeof document === 'undefined') {
        return; // Skip in non-DOM environment
      }

      useThemeStore.getState().setTheme('dark');
      useThemeStore.getState().setTheme('light');
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should update theme state when setTheme is called', () => {
      useThemeStore.getState().setTheme('dark');

      // Check that the state is updated
      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isDark).toBe(true);
    });
  });
});

