import { create } from 'zustand';

interface UiState {
  /** Contrôle l'affichage de la liste des sonneries sur le Dashboard. */
  showDashboardRingtones: boolean;
  toggleShowDashboardRingtones: () => void;
}

const STORAGE_KEY = 'ringa_ui_prefs_v1';

interface PersistedUi {
  showDashboardRingtones: boolean;
}

function loadInitialState(): PersistedUi {
  if (typeof window === 'undefined') {
    return { showDashboardRingtones: true };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { showDashboardRingtones: true };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedUi>;
    if (typeof parsed.showDashboardRingtones === 'boolean') {
      return { showDashboardRingtones: parsed.showDashboardRingtones };
    }
    return { showDashboardRingtones: true };
  } catch {
    return { showDashboardRingtones: true };
  }
}

function saveState(state: PersistedUi): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignorer les erreurs de stockage (mode privé, quota, etc.)
  }
}

export const useUiStore = create<UiState>(() => {
  const initial = loadInitialState();

  return {
    showDashboardRingtones: initial.showDashboardRingtones,
    toggleShowDashboardRingtones: () => {
      useUiStore.setState((prev) => {
        const next: UiState = {
          ...prev,
          showDashboardRingtones: !prev.showDashboardRingtones,
        };
        saveState({ showDashboardRingtones: next.showDashboardRingtones });
        return next;
      });
    },
  };
});


