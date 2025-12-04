import { AudioPlayer } from '../AudioPlayer';

interface PreviewSectionProps {
  lastOriginalBlob: Blob | null;
  optimizedBlob: Blob | null;
  equalizedBlob: Blob | null;
  syncedBlob: Blob | null;
  useOptimizedVersion: boolean;
  onVersionChange: (useOptimized: boolean) => void;
}

export const PreviewSection = ({
  lastOriginalBlob,
  optimizedBlob,
  equalizedBlob,
  syncedBlob,
  useOptimizedVersion,
  onVersionChange,
}: PreviewSectionProps) => {
  if (!lastOriginalBlob && !optimizedBlob && !equalizedBlob && !syncedBlob) {
    return null;
  }

  const currentBlob =
    useOptimizedVersion && (optimizedBlob || equalizedBlob || syncedBlob)
      ? syncedBlob || equalizedBlob || optimizedBlob
      : lastOriginalBlob;

  if (!currentBlob) {
    return null;
  }

  const previewUrl = URL.createObjectURL(currentBlob);

  return (
    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Prévisualisation</span>
        <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 p-1">
          <button
            type="button"
            onClick={() => onVersionChange(false)}
            className={`px-3 py-1 text-xs rounded-full ${
              !useOptimizedVersion
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-500 dark:text-gray-300'
            }`}
          >
            Original
          </button>
          <button
            type="button"
            onClick={() => {
              if (!optimizedBlob && !equalizedBlob && !syncedBlob) {
                return;
              }
              onVersionChange(true);
            }}
            className={`px-3 py-1 text-xs rounded-full ${
              useOptimizedVersion
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-500 dark:text-gray-300'
            }`}
          >
            {syncedBlob ? 'Bouclée' : equalizedBlob ? 'Égalisée' : 'Optimisée'}
          </button>
        </div>
      </div>
      <AudioPlayer src={previewUrl} />
    </div>
  );
};

