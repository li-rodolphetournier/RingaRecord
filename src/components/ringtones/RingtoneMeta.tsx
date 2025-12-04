import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Ringtone } from '../../types/ringtone.types';
import { formatDuration, formatSize } from '../../utils/formatUtils';

interface RingtoneMetaProps {
  ringtone: Ringtone;
}

export const RingtoneMeta = ({ ringtone }: RingtoneMetaProps) => {
  return (
    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
      <p>Format: {ringtone.format.toUpperCase()}</p>
      <p>Durée: {formatDuration(ringtone.duration)}</p>
      <p>Taille: {formatSize(ringtone.sizeBytes)}</p>
      <p>Créé le: {format(new Date(ringtone.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
    </div>
  );
};

