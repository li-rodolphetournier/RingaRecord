import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { useRingtoneStore } from '../stores/ringtoneStore';
import type { Ringtone } from '../types/ringtone.types';
import type { RingtoneFormat } from '../services/audio/ringtoneConverter.service';
import { convertBlobToFormat } from '../services/audio/ringtoneConverter.service';

export const useRingtoneActions = () => {
  const { delete: deleteRingtone, update: updateRingtone } = useRingtoneStore();

  const handleDelete = useCallback(
    async (ringtone: Ringtone, closeToast?: () => void) => {
      try {
        await deleteRingtone(ringtone.id);
        closeToast?.();
        toast.success('Sonnerie supprimée');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de supprimer la sonnerie';
        closeToast?.();
        toast.error(message);
      }
    },
    [deleteRingtone],
  );

  const handleRename = useCallback(
    async (ringtone: Ringtone, newTitle: string) => {
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) {
        toast.error('Le titre ne peut pas être vide');
        return false;
      }

      if (trimmedTitle === ringtone.title) {
        return true;
      }

      try {
        await updateRingtone(ringtone.id, { title: trimmedTitle });
        toast.success('Titre mis à jour ✔️');
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de renommer la sonnerie';
        toast.error(message);
        return false;
      }
    },
    [updateRingtone],
  );

  const handleDownload = useCallback(
    async (ringtone: Ringtone, format?: RingtoneFormat) => {
      try {
        const response = await fetch(ringtone.fileUrl);
        if (!response.ok) {
          throw new Error('Erreur lors du téléchargement du fichier');
        }

        let blob = await response.blob();
        let finalFormat = format || (ringtone.format as RingtoneFormat);
        let filename = `${ringtone.title}.${finalFormat}`;

        // Si un format spécifique est demandé et différent du format original, convertir
        if (format && format !== ringtone.format) {
          try {
            toast.info('Conversion en cours...', { autoClose: 2000 });
            blob = await convertBlobToFormat(blob, { format, quality: 0.9 });
            filename = `${ringtone.title}.${format}`;
          } catch (conversionError) {
            // eslint-disable-next-line no-console
            console.error('Erreur de conversion:', conversionError);
            toast.warning('Conversion échouée, téléchargement du format original');
            // Continuer avec le format original
            finalFormat = ringtone.format as RingtoneFormat;
            filename = `${ringtone.title}.${ringtone.format}`;
          }
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);

        toast.success(`Téléchargement prêt : ${filename}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Erreur lors du téléchargement:', error);
        toast.error('Téléchargement impossible, ouverture dans un nouvel onglet.');
        window.open(ringtone.fileUrl, '_blank');
      }
    },
    [],
  );

  const handleToggleProtection = useCallback(
    async (ringtone: Ringtone) => {
      try {
        await updateRingtone(ringtone.id, { isProtected: !ringtone.isProtected });
        toast.success(
          ringtone.isProtected
            ? 'Protection désactivée'
            : 'Sonnerie protégée contre la suppression ⭐',
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de modifier la protection';
        toast.error(message);
      }
    },
    [updateRingtone],
  );

  return {
    handleDelete,
    handleRename,
    handleDownload,
    handleToggleProtection,
  };
};

