import type { Ringtone } from '../../types/ringtone.types';
import { Button } from '../ui/Button';
import { RingtoneDownloadMenu } from './RingtoneDownloadMenu';

interface RingtoneActionsProps {
  ringtone: Ringtone;
  onDownload: (format?: string) => void;
  onToggleTrim: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export const RingtoneActions = ({
  ringtone,
  onDownload,
  onToggleTrim,
  onShare,
  onDelete,
}: RingtoneActionsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2 min-w-0">
      <RingtoneDownloadMenu onDownload={(format) => onDownload(format)} />
      <Button
        onClick={onToggleTrim}
        variant="secondary"
        className="min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
      >
        <span className="truncate">✂️ Découper</span>
      </Button>
      <Button
        onClick={onShare}
        variant="secondary"
        className="min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
        title="Partager la sonnerie"
      >
        <svg
          className="w-4 h-4 inline mr-1 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span className="truncate">Partager</span>
      </Button>
      <Button
        onClick={onDelete}
        variant="danger"
        className="min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
        disabled={ringtone.isProtected}
        title={
          ringtone.isProtected
            ? 'Désactivez la protection (🔒) pour supprimer'
            : 'Supprimer la sonnerie'
        }
      >
        <svg
          className="w-4 h-4 inline mr-1 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span className="truncate">{ringtone.isProtected ? 'Protégée' : 'Supprimer'}</span>
      </Button>
    </div>
  );
};

