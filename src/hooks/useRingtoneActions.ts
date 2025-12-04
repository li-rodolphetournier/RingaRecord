import { useCallback } from 'react';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useErrorHandler } from './useErrorHandler';
import type { Ringtone } from '../types/ringtone.types';
import type { RingtoneFormat } from '../services/audio/ringtoneConverter.service';
import { convertBlobToFormat } from '../services/audio/ringtoneConverter.service';

export const useRingtoneActions = () => {
  const { delete: deleteRingtone, update: updateRingtone } = useRingtoneStore();
  const { handleError, showSuccess, showError, showWarning, showInfo } = useErrorHandler();

  const handleDelete = useCallback(
    async (ringtone: Ringtone, closeToast?: () => void) => {
      try {
        await deleteRingtone(ringtone.id);
        closeToast?.();
        showSuccess('Sonnerie supprimée');
      } catch (error) {
        closeToast?.();
        handleError(error, 'suppression sonnerie');
      }
    },
    [deleteRingtone, showSuccess, handleError],
  );

  const handleRename = useCallback(
    async (ringtone: Ringtone, newTitle: string) => {
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) {
        showError('Le titre ne peut pas être vide');
        return false;
      }

      if (trimmedTitle === ringtone.title) {
        return true;
      }

      try {
        await updateRingtone(ringtone.id, { title: trimmedTitle });
        showSuccess('Titre mis à jour ✔️');
        return true;
      } catch (error) {
        handleError(error, 'renommage sonnerie');
        return false;
      }
    },
    [updateRingtone, showError, showSuccess, handleError],
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
            showInfo('Conversion en cours...');
            blob = await convertBlobToFormat(blob, { format, quality: 0.9 });
            filename = `${ringtone.title}.${format}`;
          } catch (conversionError) {
            console.error('Erreur de conversion:', conversionError);
            showWarning('Conversion échouée, téléchargement du format original');
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

        showSuccess(`Téléchargement prêt : ${filename}`);
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        showError('Téléchargement impossible, ouverture dans un nouvel onglet.');
        window.open(ringtone.fileUrl, '_blank');
      }
    },
    [showSuccess, showError, showInfo, showWarning],
  );

  const handleToggleProtection = useCallback(
    async (ringtone: Ringtone) => {
      try {
        await updateRingtone(ringtone.id, { isProtected: !ringtone.isProtected });
        showSuccess(
          ringtone.isProtected
            ? 'Protection désactivée'
            : 'Sonnerie protégée contre la suppression ⭐',
        );
      } catch (error) {
        handleError(error, 'modification protection');
      }
    },
    [updateRingtone, showSuccess, handleError],
  );

  return {
    handleDelete,
    handleRename,
    handleDownload,
    handleToggleProtection,
  };
};

