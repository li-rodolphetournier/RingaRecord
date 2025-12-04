import { useState } from 'react';
import type { RingtoneFormat } from '../../services/audio/ringtoneConverter.service';
import { Button } from '../ui/Button';
import {
  getRecommendedRingtoneFormat,
  getAvailableRingtoneFormats,
  getFormatLabel,
} from '../../utils/ringtoneFormat';

interface RingtoneDownloadMenuProps {
  onDownload: (format: RingtoneFormat) => void;
}

export const RingtoneDownloadMenu = ({ onDownload }: RingtoneDownloadMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const availableFormats = getAvailableRingtoneFormats();
  const recommendedFormat = getRecommendedRingtoneFormat();

  if (availableFormats.length <= 1) {
    return (
      <Button
        onClick={() => onDownload(recommendedFormat)}
        variant="primary"
        className="flex-[2] min-h-[48px] text-sm !rounded-xl px-4 py-2.5 min-w-0 w-full"
      >
        <svg
          className="w-5 h-5 inline mr-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="truncate">Télécharger</span>
      </Button>
    );
  }

  return (
    <div className="relative flex-[2] min-w-0 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="primary"
        className="w-full min-h-[48px] text-sm !rounded-xl px-4 py-2.5"
      >
        <svg
          className="w-5 h-5 inline mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="truncate">Télécharger</span>
        <svg
          className="w-4 h-4 inline ml-1 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
            {availableFormats.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => {
                  onDownload(format);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
              >
                {getFormatLabel(format)}
                {format === recommendedFormat && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    (recommandé)
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

