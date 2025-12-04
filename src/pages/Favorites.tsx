import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import type { Ringtone } from '../types/ringtone.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RingtoneDetailsModal } from '../components/RingtoneDetailsModal';
import { FavoriteFolderModal } from '../components/favorites/FavoriteFolderModal';
import { FavoritesRootList } from '../components/favorites/FavoritesRootList';
import { FavoritesFoldersPanel } from '../components/favorites/FavoritesFoldersPanel';
import { useFavoritesDnD } from '../hooks/useFavoritesDnD';

export const Favorites = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { ringtones, fetchAll, isLoading } = useRingtoneStore();
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

  const isOverallLoading = isLoading || isLoadingFavorites;

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [selectedRingtone, setSelectedRingtone] = useState<Ringtone | null>(null);

  const { decodeDragPayload } = useFavoritesDnD();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    void fetchAll();
    void loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const rootRingtones = useMemo(() => {
    const map = new Map<string, Ringtone>(ringtones.map((r) => [r.id, r]));
    return rootIds
      .map((id) => map.get(id))
      .filter((r): r is Ringtone => Boolean(r));
  }, [rootIds, ringtones]);

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

  const handleCreateFolder = async (name: string) => {
    try {
      const folder = await createFolder(name);
      toast.success(`Dossier « ${folder.name} » créé`);
    } catch {
      // L'erreur est déjà gérée dans le store
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const next = window.prompt('Nouveau nom du dossier', currentName);
    if (!next) {
      return;
    }
    try {
      await renameFolder(folderId, next);
      toast.success('Dossier renommé');
    } catch {
      // L'erreur est déjà gérée dans le store
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const ok = window.confirm(
      'Supprimer ce dossier ? Les sonneries resteront dans vos favoris (racine).',
    );
    if (!ok) {
      return;
    }
    try {
      await deleteFolder(folderId);
      toast.success('Dossier supprimé (sonneries conservées dans les favoris)');
    } catch {
      // L'erreur est déjà gérée dans le store
    }
  };

  const handleContainerDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetContainerId: 'root' | string,
  ) => {
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
  };

  const handleItemDrop = async (
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
  };

  const handleReorderUp = async (containerId: 'root' | string, index: number) => {
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
  };

  const handleReorderDown = async (containerId: 'root' | string, index: number) => {
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
  };

  const activeFolder = useMemo(
    () => folderRingtones.find((f) => f.folderId === openFolderId) ?? null,
    [folderRingtones, openFolderId],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
              className="min-h-[36px] px-3 text-xs"
            >
              ← Retour
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Favoris
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Classez vos sonneries préférées, créez des dossiers et organisez-les par
                glisser-déposer.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <Card className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Sonneries favorites
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Glissez une sonnerie dans un dossier pour l&apos;organiser, ou réordonnez-les.
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {rootRingtones.length} dans cette liste
              </span>
            </div>

            {isOverallLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-600 dark:text-gray-400">
                <span className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <FavoritesRootList
                ringtones={rootRingtones}
                onReorderUp={(index) => handleReorderUp('root', index)}
                onReorderDown={(index) => handleReorderDown('root', index)}
                onToggleFavorite={toggleFavorite}
                onDetails={setSelectedRingtone}
                onContainerDrop={(e) => handleContainerDrop(e, 'root')}
                onItemDrop={(e, index) => handleItemDrop(e, 'root', index)}
              />
            )}
          </Card>

          <FavoritesFoldersPanel
            folders={folderRingtones}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onOpenFolder={setOpenFolderId}
            onContainerDrop={(folderId, e) => handleContainerDrop(e, folderId)}
            onItemDrop={(folderId, e, index) => handleItemDrop(e, folderId, index)}
            onReorderUp={handleReorderUp}
            onReorderDown={handleReorderDown}
            onRemoveFromFolder={async (ringtoneId) => {
              try {
                await moveRingtone(ringtoneId, null);
              } catch {
                // L'erreur est déjà gérée dans le store
              }
            }}
            onDetails={setSelectedRingtone}
          />
        </section>
      </main>

      {activeFolder && (
        <FavoriteFolderModal
          folder={activeFolder}
          onClose={() => setOpenFolderId(null)}
          onRename={handleRenameFolder}
          onRemoveFromFolder={async (ringtoneId) => {
            try {
              await moveRingtone(ringtoneId, null);
            } catch {
              // L'erreur est déjà gérée dans le store
            }
          }}
          onDetails={setSelectedRingtone}
        />
      )}

      <RingtoneDetailsModal
        ringtone={selectedRingtone}
        isOpen={selectedRingtone !== null}
        onClose={() => setSelectedRingtone(null)}
      />
    </div>
  );
};
