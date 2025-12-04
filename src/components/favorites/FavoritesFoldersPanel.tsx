import { useState } from 'react';
import type { Ringtone } from '../../types/ringtone.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FavoriteFolderCard } from './FavoriteFolderCard';

interface FolderWithRingtones {
  folderId: string;
  name: string;
  ringtones: Ringtone[];
}

interface FavoritesFoldersPanelProps {
  folders: FolderWithRingtones[];
  onCreateFolder: (name: string) => Promise<void>;
  onRenameFolder: (folderId: string, currentName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onOpenFolder: (folderId: string) => void;
  onContainerDrop: (folderId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onItemDrop: (folderId: string, e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onReorderUp: (folderId: string, index: number) => Promise<void>;
  onReorderDown: (folderId: string, index: number) => Promise<void>;
  onRemoveFromFolder: (ringtoneId: string) => Promise<void>;
  onDetails: (ringtone: Ringtone) => void;
}

export const FavoritesFoldersPanel = ({
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenFolder,
  onContainerDrop,
  onItemDrop,
  onReorderUp,
  onReorderDown,
  onRemoveFromFolder,
  onDetails,
}: FavoritesFoldersPanelProps) => {
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      await onCreateFolder(trimmed || 'Nouveau dossier');
      setNewFolderName('');
    } catch {
      // L'erreur est déjà gérée dans le store
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dossiers</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Créez des dossiers pour organiser vos favoris par thème, humeur ou contact.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void handleCreateFolder();
            }
          }}
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
        {folders.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Aucun dossier pour le moment. Créez-en un pour commencer.
          </p>
        )}

        {folders.map((folder) => (
          <FavoriteFolderCard
            key={folder.folderId}
            folder={folder}
            onOpen={onOpenFolder}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
            onContainerDrop={(e) => onContainerDrop(folder.folderId, e)}
            onItemDrop={(e, index) => onItemDrop(folder.folderId, e, index)}
            onReorderUp={onReorderUp}
            onReorderDown={onReorderDown}
            onRemoveFromFolder={onRemoveFromFolder}
            onDetails={onDetails}
          />
        ))}
      </div>
    </Card>
  );
};

