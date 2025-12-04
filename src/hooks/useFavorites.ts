import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useErrorHandler } from './useErrorHandler';
import { useFavoritesDnD } from './useFavoritesDnD';
import { useStyledConfirm } from './useStyledConfirm';
import { useStyledPrompt } from './useStyledPrompt';
import type { Ringtone } from '../types/ringtone.types';

export interface UseFavoritesReturn {
  // États
  openFolderId: string | null;
  setOpenFolderId: (id: string | null) => void;
  selectedRingtone: Ringtone | null;
  setSelectedRingtone: (ringtone: Ringtone | null) => void;
  isOverallLoading: boolean;

  // Données calculées
  rootRingtones: Ringtone[];
  folderRingtones: Array<{
    folderId: string;
    name: string;
    ringtones: Ringtone[];
  }>;
  activeFolder: {
    folderId: string;
    name: string;
    ringtones: Ringtone[];
  } | null;

  // Actions
  toggleFavorite: (ringtoneId: string) => Promise<void>;
  handleCreateFolder: (name: string) => Promise<void>;
  handleRenameFolder: (folderId: string, currentName: string) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleContainerDrop: (e: React.DragEvent<HTMLDivElement>, targetContainerId: 'root' | string) => Promise<void>;
  handleItemDrop: (e: React.DragEvent<HTMLDivElement>, targetContainerId: 'root' | string, targetIndex: number) => Promise<void>;
  handleReorderUp: (containerId: 'root' | string, index: number) => Promise<void>;
  handleReorderDown: (containerId: 'root' | string, index: number) => Promise<void>;
  handleRemoveFromFolder: (ringtoneId: string) => Promise<void>;
  navigate: (path: string) => void;
}

/**
 * Hook pour gérer la logique de la page Favorites
 */
export const useFavorites = (): UseFavoritesReturn => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { ringtones, fetchAll, isLoading } = useRingtoneStore();
  const { showSuccess } = useErrorHandler();
  const {
    rootIds,
    folders,
    isLoading: isLoadingFavorites,
    load: loadFavorites,
    toggleFavorite,
    createFolder,
    renameFolder,
    deleteFolder,
    moveRingtone,
    reorderContainer,
  } = useFavoritesStore();

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [selectedRingtone, setSelectedRingtone] = useState<Ringtone | null>(null);

  const { decodeDragPayload } = useFavoritesDnD();
  const { confirm } = useStyledConfirm();
  const { prompt } = useStyledPrompt();

  const isOverallLoading = isLoading || isLoadingFavorites;

  // Charger les données au montage
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    void fetchAll();
    void loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  // Calculer les sonneries à la racine
  const rootRingtones = useMemo(() => {
    const map = new Map<string, Ringtone>(ringtones.map((r) => [r.id, r]));
    return rootIds
      .map((id) => map.get(id))
      .filter((r): r is Ringtone => Boolean(r));
  }, [rootIds, ringtones]);

  // Calculer les sonneries par dossier
  const folderRingtones = useMemo(() => {
    const map = new Map<string, Ringtone>(ringtones.map((r) => [r.id, r]));
    return folders.map((folder) => ({
      folderId: folder.id,
      name: folder.name,
      ringtones: folder.ringtoneIds
        .map((id) => map.get(id))
        .filter((r): r is Ringtone => Boolean(r)),
    }));
  }, [folders, ringtones]);

  // Dossier actif
  const activeFolder = useMemo(
    () => folderRingtones.find((f) => f.folderId === openFolderId) ?? null,
    [folderRingtones, openFolderId],
  );

  // Handlers
  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        const folder = await createFolder(name);
        showSuccess(`Dossier « ${folder.name} » créé`);
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [createFolder, showSuccess],
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, currentName: string) => {
      const next = await prompt('Nouveau nom du dossier', currentName);
      if (!next) {
        return;
      }
      try {
        await renameFolder(folderId, next);
        showSuccess('Dossier renommé');
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [renameFolder, showSuccess, prompt],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      const ok = await confirm(
        'Supprimer ce dossier ?',
        'Les sonneries resteront dans vos favoris (racine).',
      );
      if (!ok) {
        return;
      }
      try {
        await deleteFolder(folderId);
        showSuccess('Dossier supprimé (sonneries conservées dans les favoris)');
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [deleteFolder, showSuccess, confirm],
  );

  const handleContainerDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetContainerId: 'root' | string) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      const payload = decodeDragPayload(raw);
      if (!payload) return;
      try {
        await moveRingtone(
          payload.ringtoneId,
          targetContainerId === 'root' ? null : targetContainerId,
        );
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [decodeDragPayload, moveRingtone],
  );

  const handleItemDrop = useCallback(
    async (
      e: React.DragEvent<HTMLDivElement>,
      targetContainerId: 'root' | string,
      targetIndex: number,
    ) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      const payload = decodeDragPayload(raw);
      if (!payload) return;
      try {
        await moveRingtone(
          payload.ringtoneId,
          targetContainerId === 'root' ? null : targetContainerId,
          targetIndex,
        );
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [decodeDragPayload, moveRingtone],
  );

  const handleReorderUp = useCallback(
    async (containerId: 'root' | string, index: number) => {
      const list =
        containerId === 'root'
          ? [...rootIds]
          : [...(folders.find((f) => f.id === containerId)?.ringtoneIds ?? [])];
      if (index <= 0 || index >= list.length) return;
      const next = [...list];
      const tmp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = tmp;
      try {
        await reorderContainer(containerId, next);
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [rootIds, folders, reorderContainer],
  );

  const handleReorderDown = useCallback(
    async (containerId: 'root' | string, index: number) => {
      const list =
        containerId === 'root'
          ? [...rootIds]
          : [...(folders.find((f) => f.id === containerId)?.ringtoneIds ?? [])];
      if (index < 0 || index >= list.length - 1) return;
      const next = [...list];
      const tmp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = tmp;
      try {
        await reorderContainer(containerId, next);
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [rootIds, folders, reorderContainer],
  );

  const handleRemoveFromFolder = useCallback(
    async (ringtoneId: string) => {
      try {
        await moveRingtone(ringtoneId, null);
      } catch {
        // L'erreur est déjà gérée dans le store
      }
    },
    [moveRingtone],
  );

  return {
    openFolderId,
    setOpenFolderId,
    selectedRingtone,
    setSelectedRingtone,
    isOverallLoading,
    rootRingtones,
    folderRingtones,
    activeFolder,
    toggleFavorite,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleContainerDrop,
    handleItemDrop,
    handleReorderUp,
    handleReorderDown,
    handleRemoveFromFolder,
    navigate,
  };
};

