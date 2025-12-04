import { Button } from '../ui/Button';

interface RingtoneHeaderProps {
  title: string;
  isFavorite: boolean;
  isProtected: boolean;
  isEditing: boolean;
  editingValue: string;
  onToggleFavorite: () => void;
  onToggleProtection: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onConfirmRename: () => void;
  onEditingValueChange: (value: string) => void;
  viewMode?: 'block' | 'landscape';
}

export const RingtoneHeader = ({
  title,
  isFavorite,
  isProtected,
  isEditing,
  editingValue,
  onToggleFavorite,
  onToggleProtection,
  onStartRename,
  onCancelRename,
  onConfirmRename,
  onEditingValueChange,
  viewMode = 'block',
}: RingtoneHeaderProps) => {
  if (isEditing) {
    return (
      <div className="flex-1 space-y-1 min-w-0">
        <input
          type="text"
          value={editingValue}
          onChange={(e) => onEditingValueChange(e.target.value)}
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            className="text-xs px-2 py-1 min-h-[28px]"
            onClick={onConfirmRename}
          >
            ✔️ Enregistrer
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-2 py-1 min-h-[28px]"
            onClick={onCancelRename}
          >
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
        {title}
      </h3>
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`flex-shrink-0 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center rounded-full ${
          isFavorite
            ? 'text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300'
            : 'text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-300'
        }`}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.995 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.495 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.545 11.54l-1.46 1.31z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onToggleProtection}
        className={`flex-shrink-0 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center rounded-full ${
          isProtected
            ? 'text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300'
            : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
        }`}
        title={
          isProtected
            ? 'Protégée - Cliquez pour désactiver la protection'
            : 'Non protégée - Cliquez pour activer la protection'
        }
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isProtected ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3M5.25 10.5h13.5A2.25 2.25 0 0121 12.75v6A2.25 2.25 0 0118.75 21h-13.5A2.25 2.25 0 013 18.75v-6A2.25 2.25 0 015.25 10.5z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7.5 10.5V7.5a4.5 4.5 0 118.91-0.75M5.25 10.5h13.5A2.25 2.25 0 0121 12.75v6A2.25 2.25 0 0118.75 21h-13.5A2.25 2.25 0 013 18.75v-6A2.25 2.25 0 015.25 10.5z"
            />
          )}
        </svg>
      </button>
      {viewMode === 'landscape' && (
        <button
          type="button"
          onClick={onStartRename}
          className="text-[11px] px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] flex-shrink-0"
        >
          Renommer
        </button>
      )}
    </div>
  );
};

