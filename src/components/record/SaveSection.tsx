import { Button } from '../ui/Button';

interface SaveSectionProps {
  title: string;
  isUploading: boolean;
  onSave: () => Promise<void>;
}

export const SaveSection = ({ title, isUploading, onSave }: SaveSectionProps) => {
  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {title.trim() ? `Enregistrer "${title.trim()}"` : 'Entrez un titre pour enregistrer'}
        </p>
      </div>
      <Button
        type="button"
        variant="primary"
        onClick={onSave}
        isLoading={isUploading}
        disabled={!title.trim() || isUploading}
        className="min-h-[44px]"
      >
        💾 Enregistrer la sonnerie
      </Button>
    </div>
  );
};

