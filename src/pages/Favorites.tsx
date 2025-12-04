import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import type { Ringtone } from '../types/ringtone.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AudioPlayer } from '../components/AudioPlayer';
import { formatDuration, formatSize } from '../utils/formatUtils';
import { RingtoneDetailsModal } from '../components/RingtoneDetailsModal';

interface DragPayload {
  ringtoneId: string;
  sourceContainerId: 'root' | string;
}

export const Favorites = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { ringtones, fetchAll, isLoading } = useRingtoneStore();
  const {
    rootIds,
    folders,
    toggleFavorite,
    createFolder,
    renameFolder,
    deleteFolder,
    moveRingtone,
    reorderContainer,
  } = useFavoritesStore();

  const [newFolderName, setNewFolderName] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [selectedRingtone, setSelectedRingtone] = useState<Ringtone | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    void fetchAll();
  }, [isAuthenticated, navigate, fetchAll]);

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
      ringtoneIds: folder.ringtoneIds,
      ringtones: folder.ringtoneIds
        .map((id) => map.get(id))
        .filter((r): r is Ringtone => Boolean(r)),
    }));
  }, [folders, ringtones]);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    const folder = createFolder(trimmed || 'Nouveau dossier');
    setNewFolderName('');
    toast.success(`Dossier « ${folder.name} » créé`);
  };

  const handleRenameFolder = (folderId: string, currentName: string) => {
    const next = window.prompt('Nouveau nom du dossier', currentName);
    if (!next) {
      return;
    }
    renameFolder(folderId, next);
    toast.success('Dossier renommé');
  };

  const handleDeleteFolder = (folderId: string) => {
    const ok = window.confirm(
      'Supprimer ce dossier ? Les sonneries resteront dans vos favoris (racine).',
    );
    if (!ok) {
      return;
    }
    deleteFolder(folderId);
    toast.success('Dossier supprimé (sonneries conservées dans les favoris)');
  };

  const encodeDragPayload = (payload: DragPayload): string =>
    JSON.stringify(payload);

  const decodeDragPayload = (raw: string | null): DragPayload | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DragPayload;
      if (!parsed || !parsed.ringtoneId || !parsed.sourceContainerId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const handleItemDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    ringtoneId: string,
    containerId: 'root' | string,
  ) => {
    const payload: DragPayload = { ringtoneId, sourceContainerId: containerId };
    e.dataTransfer.setData('application/json', encodeDragPayload(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleContainerDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetContainerId: 'root' | string,
  ) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    const payload = decodeDragPayload(raw);
    if (!payload) return;
    moveRingtone(
      payload.ringtoneId,
      targetContainerId === 'root' ? null : targetContainerId,
    );
  };

  const handleItemDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetContainerId: 'root' | string,
    targetIndex: number,
  ) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    const payload = decodeDragPayload(raw);
    if (!payload) return;
    moveRingtone(
      payload.ringtoneId,
      targetContainerId === 'root' ? null : targetContainerId,
      targetIndex,
    );
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleReorderUp = (containerId: 'root' | string, index: number) => {
    const list =
      containerId === 'root'
        ? [...rootIds]
        : [...(folders.find((f) => f.id === containerId)?.ringtoneIds ?? [])];
    if (index <= 0 || index >= list.length) return;
    const next = [...list];
    const tmp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = tmp;
    reorderContainer(containerId, next);
  };

  const handleReorderDown = (containerId: 'root' | string, index: number) => {
    const list =
      containerId === 'root'
        ? [...rootIds]
        : [...(folders.find((f) => f.id === containerId)?.ringtoneIds ?? [])];
    if (index < 0 || index >= list.length - 1) return;
    const next = [...list];
    const tmp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = tmp;
    reorderContainer(containerId, next);
  };

  const openFolder = (folderId: string) => {
    setOpenFolderId(folderId);
  };

  const closeFolderModal = () => {
    setOpenFolderId(null);
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
                Classez vos sonneries préférées, créez des dossiers et
                organisez-les par glisser-déposer.
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
                  Glissez une sonnerie dans un dossier pour l&apos;organiser, ou
                  réordonnez-les.
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {rootRingtones.length} dans cette liste
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleContainerDrop(e, 'root')}
              className="min-h-[120px] rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-3 space-y-2"
            >
              {isLoading && (
                <div className="flex items-center justify-center py-6 text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && rootRingtones.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  Aucune sonnerie dans cette liste. Ajoutez un favori depuis le
                  Dashboard (icône cœur) pour le voir ici.
                </p>
              )}

              {!isLoading &&
                rootRingtones.map((ringtone, index) => (
                  <div
                    key={ringtone.id}
                    draggable
                    onDragStart={(e) =>
                      handleItemDragStart(e, ringtone.id, 'root')
                    }
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleItemDrop(e, 'root', index)}
                    className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 cursor-move"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      onClick={() =>
                        handleReorderUp('root', index)
                      }
                      aria-label="Monter la sonnerie"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      onClick={() =>
                        handleReorderDown('root', index)
                      }
                      aria-label="Descendre la sonnerie"
                    >
                      ↓
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {ringtone.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatDuration(ringtone.duration)} ·{' '}
                        {formatSize(ringtone.sizeBytes)} ·{' '}
                        {ringtone.format.toUpperCase()}
                      </p>
                    </div>
                    <div className="hidden sm:block w-40 flex-shrink-0">
                      <AudioPlayer src={ringtone.fileUrl} title="Pré-écoute" />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      className="min-h-[32px] text-xs px-3"
                      onClick={() => setSelectedRingtone(ringtone)}
                    >
                      Détails
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[32px] text-xs px-3"
                      onClick={() => toggleFavorite(ringtone.id)}
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Dossiers
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Créez des dossiers pour organiser vos favoris par thème, humeur
                ou contact.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <Button
                type="button"
                variant="primary"
                className="min-h-[40px] text-xs px-3"
                onClick={handleCreateFolder}
              >
                + Créer
              </Button>
            </div>

            <div className="space-y-3">
              {folderRingtones.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Aucun dossier pour le moment. Créez-en un pour commencer.
                </p>
              )}

              {folderRingtones.map((folder) => (
                <div
                  key={folder.folderId}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleContainerDrop(e, folder.folderId)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openFolder(folder.folderId)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
                    >
                      <span aria-hidden="true">📁</span>
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {folder.ringtones.length} sonneries
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[28px] text-[11px] px-2"
                        onClick={() =>
                          handleRenameFolder(folder.folderId, folder.name)
                        }
                      >
                        Renommer
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder.folderId)}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {folder.ringtones.length === 0 && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Glissez une sonnerie favorite ici pour l&apos;ajouter à ce
                      dossier.
                    </p>
                  )}

                  {folder.ringtones.length > 0 && (
                    <div className="space-y-2 mt-1">
                      {folder.ringtones.map((ringtone, index) => (
                        <div
                          key={ringtone.id}
                          draggable
                          onDragStart={(e) =>
                            handleItemDragStart(
                              e,
                              ringtone.id,
                              folder.folderId,
                            )
                          }
                          onDragOver={handleDragOver}
                          onDrop={(e) =>
                            handleItemDrop(
                              e,
                              folder.folderId,
                              index,
                            )
                          }
                          className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-1 cursor-move"
                        >
                          <button
                            type="button"
                            className="text-[11px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            onClick={() =>
                              handleReorderUp(folder.folderId, index)
                            }
                            aria-label="Monter la sonnerie"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            onClick={() =>
                              handleReorderDown(folder.folderId, index)
                            }
                            aria-label="Descendre la sonnerie"
                          >
                            ↓
                          </button>
                          <p className="flex-1 text-xs text-gray-800 dark:text-gray-100 truncate">
                            {ringtone.title}
                          </p>
                          <Button
                            type="button"
                            variant="primary"
                            className="min-h-[24px] text-[10px] px-2"
                            onClick={() => setSelectedRingtone(ringtone)}
                          >
                            Détails
                          </Button>
                          <button
                            type="button"
                            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() =>
                              moveRingtone(ringtone.id, null)
                            }
                          >
                            Enlever
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>

      {activeFolder && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Dossier ${activeFolder.name}`}
          onClick={closeFolderModal}
        >
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-full bg-white dark:bg-gray-900 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Dossier favori
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {activeFolder.name}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {activeFolder.ringtones.length}{' '}
                  {activeFolder.ringtones.length > 1 ? 'sonneries' : 'sonnerie'} dans
                  ce dossier. Cliquez sur une ligne pour pré-écouter.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[32px] text-[11px] px-3"
                  onClick={() =>
                    handleRenameFolder(activeFolder.folderId, activeFolder.name)
                  }
                >
                  Renommer
                </Button>
                <button
                  type="button"
                  onClick={closeFolderModal}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  aria-label="Fermer le dossier"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gray-50 dark:bg-gray-950">
              {activeFolder.ringtones.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-6">
                  Ce dossier est vide. Glissez des sonneries favorites ici depuis la
                  liste principale.
                </p>
              ) : (
                activeFolder.ringtones.map((ringtone) => (
                  <Card
                    key={ringtone.id}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {ringtone.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatDuration(ringtone.duration)} ·{' '}
                        {formatSize(ringtone.sizeBytes)} ·{' '}
                        {ringtone.format.toUpperCase()}
                      </p>
                    </div>
                    <div className="w-full sm:w-56 flex items-center gap-2">
                      <AudioPlayer
                        src={ringtone.fileUrl}
                        title="Pré-écoute"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        className="min-h-[32px] text-[11px] px-3 flex-shrink-0"
                        onClick={() => setSelectedRingtone(ringtone)}
                      >
                        Détails
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[32px] text-[11px] px-3 flex-shrink-0"
                        onClick={() => moveRingtone(ringtone.id, null)}
                      >
                        Retirer
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <footer className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="min-h-[40px] px-4"
                onClick={closeFolderModal}
              >
                Fermer
              </Button>
            </footer>
          </div>
        </div>
      )}

      <RingtoneDetailsModal
        ringtone={selectedRingtone}
        isOpen={selectedRingtone !== null}
        onClose={() => setSelectedRingtone(null)}
      />
    </div>
  );
};


