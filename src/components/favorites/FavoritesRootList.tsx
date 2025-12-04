import type { Ringtone } from '../../types/ringtone.types';
import { Button } from '../ui/Button';
import { AudioPlayer } from '../AudioPlayer';
import { formatDuration, formatSize } from '../../utils/formatUtils';
import { useFavoritesDnD } from '../../hooks/useFavoritesDnD';

interface FavoritesRootListProps {
  ringtones: Ringtone[];
  onReorderUp: (index: number) => void;
  onReorderDown: (index: number) => void;
  onToggleFavorite: (ringtoneId: string) => Promise<void>;
  onDetails: (ringtone: Ringtone) => void;
  onContainerDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onItemDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
}

export const FavoritesRootList = ({
  ringtones,
  onReorderUp,
  onReorderDown,
  onToggleFavorite,
  onDetails,
  onContainerDrop,
  onItemDrop,
}: FavoritesRootListProps) => {
  const { handleItemDragStart, handleDragOver } = useFavoritesDnD();

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={onContainerDrop}
      className="min-h-[120px] rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-3 space-y-2"
    >
      {ringtones.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
          Aucune sonnerie dans cette liste. Ajoutez un favori depuis le Dashboard (icône cœur)
          pour le voir ici.
        </p>
      ) : (
        ringtones.map((ringtone, index) => (
          <div
            key={ringtone.id}
            draggable
            onDragStart={(e) => handleItemDragStart(e, ringtone.id, 'root')}
            onDragOver={handleDragOver}
            onDrop={(e) => onItemDrop(e, index)}
            className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 cursor-move"
          >
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              onClick={() => onReorderUp(index)}
              aria-label="Monter la sonnerie"
            >
              ↑
            </button>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              onClick={() => onReorderDown(index)}
              aria-label="Descendre la sonnerie"
            >
              ↓
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {ringtone.title}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {formatDuration(ringtone.duration)} · {formatSize(ringtone.sizeBytes)} ·{' '}
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
              onClick={() => onDetails(ringtone)}
            >
              Détails
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[32px] text-xs px-3"
              onClick={async () => {
                try {
                  await onToggleFavorite(ringtone.id);
                } catch {
                  // L'erreur est déjà gérée dans le store
                }
              }}
            >
              Retirer
            </Button>
          </div>
        ))
      )}
    </div>
  );
};

