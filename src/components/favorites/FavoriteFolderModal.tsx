import type { Ringtone } from '../../types/ringtone.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AudioPlayer } from '../AudioPlayer';
import { formatDuration, formatSize } from '../../utils/formatUtils';

interface FavoriteFolderModalProps {
  folder: {
    folderId: string;
    name: string;
    ringtones: Ringtone[];
  };
  onClose: () => void;
  onRename: (folderId: string, currentName: string) => void;
  onRemoveFromFolder: (ringtoneId: string) => void;
  onDetails: (ringtone: Ringtone) => void;
}

export const FavoriteFolderModal = ({
  folder,
  onClose,
  onRename,
  onRemoveFromFolder,
  onDetails,
}: FavoriteFolderModalProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Dossier ${folder.name}`}
      onClick={onClose}
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
              {folder.name}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {folder.ringtones.length}{' '}
              {folder.ringtones.length > 1 ? 'sonneries' : 'sonnerie'} dans ce dossier. Cliquez
              sur une ligne pour pré-écouter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-[32px] text-[11px] px-3"
              onClick={() => onRename(folder.folderId, folder.name)}
            >
              Renommer
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              aria-label="Fermer le dossier"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {folder.ringtones.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-6">
              Ce dossier est vide. Glissez des sonneries favorites ici depuis la liste principale.
            </p>
          ) : (
            folder.ringtones.map((ringtone) => (
              <Card
                key={ringtone.id}
                className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {ringtone.title}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {formatDuration(ringtone.duration)} · {formatSize(ringtone.sizeBytes)} ·{' '}
                    {ringtone.format.toUpperCase()}
                  </p>
                </div>
                <div className="w-full sm:w-56 flex items-center gap-2">
                  <AudioPlayer src={ringtone.fileUrl} title="Pré-écoute" className="flex-1" />
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-[32px] text-[11px] px-3 flex-shrink-0"
                    onClick={() => onDetails(ringtone)}
                  >
                    Détails
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-[32px] text-[11px] px-3 flex-shrink-0"
                    onClick={() => onRemoveFromFolder(ringtone.id)}
                  >
                    Retirer
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <footer className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 flex justify-end">
          <Button type="button" variant="secondary" className="min-h-[40px] px-4" onClick={onClose}>
            Fermer
          </Button>
        </footer>
      </div>
    </div>
  );
};

