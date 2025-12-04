import type { Ringtone } from '../../types/ringtone.types';
import { Button } from '../ui/Button';
import { useFavoritesDnD } from '../../hooks/useFavoritesDnD';

interface FavoriteFolderCardProps {
  folder: {
    folderId: string;
    name: string;
    ringtones: Ringtone[];
  };
  onOpen: (folderId: string) => void;
  onRename: (folderId: string, currentName: string) => void;
  onDelete: (folderId: string) => void;
  onContainerDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onItemDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onReorderUp: (folderId: string, index: number) => void;
  onReorderDown: (folderId: string, index: number) => void;
  onRemoveFromFolder: (ringtoneId: string) => Promise<void>;
  onDetails: (ringtone: Ringtone) => void;
}

export const FavoriteFolderCard = ({
  folder,
  onOpen,
  onRename,
  onDelete,
  onContainerDrop,
  onItemDrop,
  onReorderUp,
  onReorderDown,
  onRemoveFromFolder,
  onDetails,
}: FavoriteFolderCardProps) => {
  const { handleItemDragStart, handleDragOver } = useFavoritesDnD();

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2"
      onDragOver={handleDragOver}
      onDrop={onContainerDrop}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(folder.folderId)}
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
            onClick={() => onRename(folder.folderId, folder.name)}
          >
            Renommer
          </Button>
          <button
            type="button"
            onClick={() => onDelete(folder.folderId)}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Supprimer
          </button>
        </div>
      </div>

      {folder.ringtones.length === 0 && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Glissez une sonnerie favorite ici pour l&apos;ajouter à ce dossier.
        </p>
      )}

      {folder.ringtones.length > 0 && (
        <div className="space-y-2 mt-1">
          {folder.ringtones.map((ringtone, index) => (
            <div
              key={ringtone.id}
              draggable
              onDragStart={(e) => handleItemDragStart(e, ringtone.id, folder.folderId)}
              onDragOver={handleDragOver}
              onDrop={(e) => onItemDrop(e, index)}
              className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-1 cursor-move"
            >
              <button
                type="button"
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => onReorderUp(folder.folderId, index)}
                aria-label="Monter la sonnerie"
              >
                ↑
              </button>
              <button
                type="button"
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => onReorderDown(folder.folderId, index)}
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
                onClick={() => onDetails(ringtone)}
              >
                Détails
              </Button>
              <button
                type="button"
                className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={async () => {
                  try {
                    await onRemoveFromFolder(ringtone.id);
                  } catch {
                    // L'erreur est déjà gérée dans le store
                  }
                }}
              >
                Enlever
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

