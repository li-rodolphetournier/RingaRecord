import { create } from 'zustand';
import { supabaseFavoritesService } from '../services/supabase/favorites.service';
import { handleError } from '../utils/errorUtils';

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
  /** État de chargement */
  isLoading: boolean;
  /** Vérifier si une sonnerie est marquée en favori (dans un dossier ou à la racine). */
  isFavorite: (ringtoneId: string) => boolean;
  /** Charger les favoris depuis Supabase */
  load: () => Promise<void>;
  /** Ajouter / retirer une sonnerie des favoris (à la racine). */
  toggleFavorite: (ringtoneId: string) => Promise<void>;
  /** Créer un dossier vide. */
  createFolder: (name: string) => Promise<FavoriteFolder>;
  /** Renommer un dossier. */
  renameFolder: (folderId: string, name: string) => Promise<void>;
  /** Supprimer un dossier, en conservant ses sonneries en favoris racine. */
  deleteFolder: (folderId: string) => Promise<void>;
  /** Déplacer une sonnerie vers un dossier ou vers la racine (folderId null). */
  moveRingtone: (ringtoneId: string, targetFolderId: string | null, targetIndex?: number) => Promise<void>;
  /** Réordonner les sonneries dans un conteneur (racine ou dossier). */
  reorderContainer: (containerId: 'root' | string, orderedIds: string[]) => Promise<void>;
}

/**
 * Charge les favoris depuis Supabase et met à jour le state.
 */
async function loadFromSupabase(): Promise<{ rootIds: string[]; folders: FavoriteFolder[] }> {
  try {
    const [folders, favorites] = await Promise.all([
      supabaseFavoritesService.getAllFolders(),
      supabaseFavoritesService.getAllFavorites(),
    ]);

    // Grouper les favoris par dossier
    const favoritesByFolder = new Map<string | null, string[]>();
    
    // Trier les favoris par position
    const sortedFavorites = favorites.sort((a, b) => {
      if (a.folderId !== b.folderId) {
        return (a.folderId || '') > (b.folderId || '') ? 1 : -1;
      }
      return a.position - b.position;
    });

    for (const favorite of sortedFavorites) {
      const folderKey = favorite.folderId || null;
      if (!favoritesByFolder.has(folderKey)) {
        favoritesByFolder.set(folderKey, []);
      }
      favoritesByFolder.get(folderKey)?.push(favorite.ringtoneId);
    }

    const rootIds = favoritesByFolder.get(null) || [];

    const foldersWithRingtoneIds: FavoriteFolder[] = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      ringtoneIds: favoritesByFolder.get(folder.id) || [],
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));

    return {
      rootIds,
      folders: foldersWithRingtoneIds,
    };
  } catch (error) {
    console.error('Erreur lors du chargement des favoris:', error);
    return { rootIds: [], folders: [] };
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  rootIds: [],
  folders: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const data = await loadFromSupabase();
      set({ ...data, isLoading: false });
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      set({ isLoading: false });
      handleError(new Error('Impossible de charger les favoris'), 'chargement favoris');
    }
  },

  isFavorite: (ringtoneId: string): boolean => {
    const state = get();
    if (state.rootIds.includes(ringtoneId)) {
      return true;
    }
    return state.folders.some((folder) => folder.ringtoneIds.includes(ringtoneId));
  },

  toggleFavorite: async (ringtoneId: string): Promise<void> => {
    const state = get();
    const isCurrentlyFavorite = state.isFavorite(ringtoneId);

    try {
      if (isCurrentlyFavorite) {
        // Retirer des favoris
        await supabaseFavoritesService.deleteFavorite(ringtoneId);
      } else {
        // Ajouter aux favoris (à la racine, à la fin)
        const maxPosition = state.rootIds.length > 0 ? state.rootIds.length - 1 : -1;
        await supabaseFavoritesService.upsertFavorite({
          ringtoneId,
          folderId: null,
          position: maxPosition + 1,
        });
      }

      // Recharger depuis Supabase
      await get().load();
    } catch (error) {
      handleError(error, 'modification favoris');
      throw error;
    }
  },

  createFolder: async (name: string): Promise<FavoriteFolder> => {
    const trimmed = name.trim() || 'Nouveau dossier';
    
    try {
      const folder = await supabaseFavoritesService.createFolder({ name: trimmed });
      
      const folderWithRingtoneIds: FavoriteFolder = {
        id: folder.id,
        name: folder.name,
        ringtoneIds: [],
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      };

      // Recharger depuis Supabase
      await get().load();

      return folderWithRingtoneIds;
    } catch (error) {
      handleError(error, 'création dossier');
      throw error;
    }
  },

  renameFolder: async (folderId: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    try {
      await supabaseFavoritesService.updateFolder(folderId, { name: trimmed });
      
      // Recharger depuis Supabase
      await get().load();
    } catch (error) {
      handleError(error, 'renommage dossier');
      throw error;
    }
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    try {
      await supabaseFavoritesService.deleteFolder(folderId);
      
      // Recharger depuis Supabase
      await get().load();
    } catch (error) {
      handleError(error, 'suppression dossier');
      throw error;
    }
  },

  moveRingtone: async (ringtoneId: string, targetFolderId: string | null, targetIndex?: number): Promise<void> => {
    const state = get();
    
    try {
      // Calculer la position cible
      let targetPosition = 0;
      if (targetFolderId === null) {
        // Déplacer vers la racine
        const rootFavorites = state.rootIds;
        if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < rootFavorites.length) {
          targetPosition = targetIndex;
        } else {
          targetPosition = rootFavorites.length;
        }
      } else {
        // Déplacer vers un dossier
        const folder = state.folders.find((f) => f.id === targetFolderId);
        if (folder) {
          if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < folder.ringtoneIds.length) {
            targetPosition = targetIndex;
          } else {
            targetPosition = folder.ringtoneIds.length;
          }
        }
      }

      await supabaseFavoritesService.upsertFavorite({
        ringtoneId,
        folderId: targetFolderId,
        position: targetPosition,
      });

      // Recharger depuis Supabase
      await get().load();
    } catch (error) {
      handleError(error, 'déplacement sonnerie');
      throw error;
    }
  },

  reorderContainer: async (containerId: 'root' | string, orderedIds: string[]): Promise<void> => {
    try {
      const updates: Array<{ ringtoneId: string; folderId: string | null; position: number }> = [];

      if (containerId === 'root') {
        // Réordonner les favoris à la racine
        orderedIds.forEach((ringtoneId, index) => {
          updates.push({
            ringtoneId,
            folderId: null,
            position: index,
          });
        });
      } else {
        // Réordonner les favoris dans un dossier
        orderedIds.forEach((ringtoneId, index) => {
          updates.push({
            ringtoneId,
            folderId: containerId,
            position: index,
          });
        });
      }

      await supabaseFavoritesService.updateFavoritePositions(updates);

      // Recharger depuis Supabase
      await get().load();
    } catch (error) {
      handleError(error, 'réorganisation favoris');
      throw error;
    }
  },
}));
