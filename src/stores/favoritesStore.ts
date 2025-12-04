import { create } from 'zustand';

interface FavoriteFolder {
  id: string;
  name: string;
  ringtoneIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface FavoritesState {
  /** Sonneries favorites au niveau racine (hors dossier), ordre personnalisable. */
  rootIds: string[];
  /** Dossiers de favoris contenant des sonneries par id. */
  folders: FavoriteFolder[];
  /** Vérifier si une sonnerie est marquée en favori (dans un dossier ou à la racine). */
  isFavorite: (ringtoneId: string) => boolean;
  /** Ajouter / retirer une sonnerie des favoris (à la racine). */
  toggleFavorite: (ringtoneId: string) => void;
  /** Créer un dossier vide. */
  createFolder: (name: string) => FavoriteFolder;
  /** Renommer un dossier. */
  renameFolder: (folderId: string, name: string) => void;
  /** Supprimer un dossier, en conservant ses sonneries en favoris racine. */
  deleteFolder: (folderId: string) => void;
  /** Déplacer une sonnerie vers un dossier ou vers la racine (folderId null). */
  moveRingtone: (ringtoneId: string, targetFolderId: string | null, targetIndex?: number) => void;
  /** Réordonner les sonneries dans un conteneur (racine ou dossier). */
  reorderContainer: (containerId: 'root' | string, orderedIds: string[]) => void;
}

const STORAGE_KEY = 'ringa_favorites_v1';

interface PersistedFavorites {
  rootIds: string[];
  folders: FavoriteFolder[];
}

function loadFromStorage(): PersistedFavorites {
  if (typeof window === 'undefined') {
    return { rootIds: [], folders: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { rootIds: [], folders: [] };
    }

    const parsed = JSON.parse(raw) as PersistedFavorites;
    if (!parsed || !Array.isArray(parsed.rootIds) || !Array.isArray(parsed.folders)) {
      return { rootIds: [], folders: [] };
    }

    return parsed;
  } catch {
    return { rootIds: [], folders: [] };
  }
}

function saveToStorage(state: PersistedFavorites): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignorer les erreurs de quota ou navigation privée.
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => {
  const initial = loadFromStorage();

  const persist = (next: Partial<FavoritesState>): void => {
    const current = get();
    const rootIds = next.rootIds ?? current.rootIds;
    const folders = next.folders ?? current.folders;
    saveToStorage({ rootIds, folders });
  };

  const removeFromAll = (ringtoneId: string, rootIds: string[], folders: FavoriteFolder[]) => {
    const nextRoot = rootIds.filter((id) => id !== ringtoneId);
    const nextFolders = folders.map((folder) => ({
      ...folder,
      ringtoneIds: folder.ringtoneIds.filter((id) => id !== ringtoneId),
    }));
    return { nextRoot, nextFolders };
  };

  return {
    rootIds: initial.rootIds,
    folders: initial.folders,

    isFavorite: (ringtoneId: string): boolean => {
      const state = get();
      if (state.rootIds.includes(ringtoneId)) {
        return true;
      }
      return state.folders.some((folder) => folder.ringtoneIds.includes(ringtoneId));
    },

    toggleFavorite: (ringtoneId: string): void => {
      set((state) => {
        const { nextRoot, nextFolders } = removeFromAll(ringtoneId, state.rootIds, state.folders);

        // Si déjà présent quelque part, on le retire (unfavorite).
        const wasFavorite =
          state.rootIds.includes(ringtoneId) ||
          state.folders.some((folder) => folder.ringtoneIds.includes(ringtoneId));

        if (wasFavorite) {
          const updated: Partial<FavoritesState> = {
            rootIds: nextRoot,
            folders: nextFolders,
          };
          persist(updated);
          return { ...state, ...updated };
        }

        // Sinon, on l'ajoute à la racine (à la fin).
        const updatedRoot = [...nextRoot, ringtoneId];
        const updated: Partial<FavoritesState> = {
          rootIds: updatedRoot,
          folders: nextFolders,
        };
        persist(updated);
        return { ...state, ...updated };
      });
    },

    createFolder: (name: string): FavoriteFolder => {
      const trimmed = name.trim() || 'Nouveau dossier';
      const nowIso = new Date().toISOString();
      const folder: FavoriteFolder = {
        id: generateId(),
        name: trimmed,
        ringtoneIds: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      set((state) => {
        const folders = [...state.folders, folder];
        const updated: Partial<FavoritesState> = { folders };
        persist(updated);
        return { ...state, folders };
      });

      return folder;
    },

    renameFolder: (folderId: string, name: string): void => {
      set((state) => {
        const trimmed = name.trim();
        if (!trimmed) {
          return state;
        }

        const folders = state.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, name: trimmed, updatedAt: new Date().toISOString() }
            : folder,
        );

        const updated: Partial<FavoritesState> = { folders };
        persist(updated);
        return { ...state, folders };
      });
    },

    deleteFolder: (folderId: string): void => {
      set((state) => {
        const folder = state.folders.find((f) => f.id === folderId);
        const remaining = state.folders.filter((f) => f.id !== folderId);

        let rootIds = state.rootIds;
        if (folder) {
          const idsToMerge = folder.ringtoneIds.filter(
            (id) => !state.rootIds.includes(id),
          );
          rootIds = [...rootIds, ...idsToMerge];
        }

        const updated: Partial<FavoritesState> = {
          rootIds,
          folders: remaining,
        };
        persist(updated);
        return { ...state, ...updated };
      });
    },

    moveRingtone: (ringtoneId: string, targetFolderId: string | null, targetIndex?: number): void => {
      set((state) => {
        const { nextRoot, nextFolders } = removeFromAll(ringtoneId, state.rootIds, state.folders);

        if (targetFolderId === null) {
          const ids = [...nextRoot];
          if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= ids.length) {
            ids.splice(targetIndex, 0, ringtoneId);
          } else {
            ids.push(ringtoneId);
          }
          const updated: Partial<FavoritesState> = {
            rootIds: ids,
            folders: nextFolders,
          };
          persist(updated);
          return { ...state, ...updated };
        }

        const folders = nextFolders.map((folder) => {
          if (folder.id !== targetFolderId) {
            return folder;
          }
          const ids = [...folder.ringtoneIds];
          if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= ids.length) {
            ids.splice(targetIndex, 0, ringtoneId);
          } else {
            ids.push(ringtoneId);
          }
          return {
            ...folder,
            ringtoneIds: ids,
            updatedAt: new Date().toISOString(),
          };
        });

        const updated: Partial<FavoritesState> = {
          rootIds: nextRoot,
          folders,
        };
        persist(updated);
        return { ...state, ...updated };
      });
    },

    reorderContainer: (containerId: 'root' | string, orderedIds: string[]): void => {
      set((state) => {
        if (containerId === 'root') {
          const updated: Partial<FavoritesState> = { rootIds: orderedIds };
          persist(updated);
          return { ...state, rootIds: orderedIds };
        }

        const folders = state.folders.map((folder) =>
          folder.id === containerId
            ? {
                ...folder,
                ringtoneIds: orderedIds,
                updatedAt: new Date().toISOString(),
              }
            : folder,
        );

        const updated: Partial<FavoritesState> = { folders };
        persist(updated);
        return { ...state, folders };
      });
    },
  };
});


