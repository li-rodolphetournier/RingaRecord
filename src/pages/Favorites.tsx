import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RingtoneDetailsModal } from '../components/RingtoneDetailsModal';
import { FavoriteFolderModal } from '../components/favorites/FavoriteFolderModal';
import { FavoritesRootList } from '../components/favorites/FavoritesRootList';
import { FavoritesFoldersPanel } from '../components/favorites/FavoritesFoldersPanel';
import { useFavorites } from '../hooks/useFavorites';

export const Favorites = () => {
  const {
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
  } = useFavorites();

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
            onRemoveFromFolder={handleRemoveFromFolder}
            onDetails={setSelectedRingtone}
          />
        </section>
      </main>

      {activeFolder && (
        <FavoriteFolderModal
          folder={activeFolder}
          onClose={() => setOpenFolderId(null)}
          onRename={handleRenameFolder}
          onRemoveFromFolder={handleRemoveFromFolder}
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
