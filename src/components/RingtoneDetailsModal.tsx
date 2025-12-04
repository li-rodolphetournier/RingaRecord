import { useEffect, useState, useCallback, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { Ringtone } from '../types/ringtone.types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { AudioPlayer } from './AudioPlayer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { optimizeRingtone } from '../services/audio/smartRingtone.service';
import { useSmartRingtone } from '../hooks/useSmartRingtone';
import { useSegmentPreview } from '../hooks/useSegmentPreview';
import { useEqualizer } from '../hooks/useEqualizer';
import { buildRingtonesForSegments } from '../services/audio/ringtoneSegments.service';
import { Equalizer } from './audio/Equalizer';
import { getRecommendedRingtoneFormat, getAvailableRingtoneFormats, getFormatLabel } from '../utils/ringtoneFormat';
import { ShareModal } from './ShareModal';
import { useRingtoneActions } from '../hooks/useRingtoneActions';
import { formatDuration, formatSize } from '../utils/formatUtils';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useFavoritesStore } from '../stores/favoritesStore';

interface RingtoneDetailsModalProps {
  ringtone: Ringtone | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RingtoneDetailsModal = ({ ringtone, isOpen, onClose }: RingtoneDetailsModalProps) => {
  const { upload, fetchAll } = useRingtoneStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { handleRename, handleDownload, handleToggleProtection } = useRingtoneActions();
  const [, startTransition] = useTransition();

  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [trimRingtoneId, setTrimRingtoneId] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const [smartSourceBlob, setSmartSourceBlob] = useState<Blob | null>(null);
  const [smartSourceRingtoneId, setSmartSourceRingtoneId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [equalizerRingtoneId, setEqualizerRingtoneId] = useState<string | null>(null);
  const [equalizerSourceBlob, setEqualizerSourceBlob] = useState<Blob | null>(null);

  const {
    isOptimizing: isSmartOptimizing,
    segments,
    silenceThresholdDb,
    minSilenceDurationMs,
    selectedSegmentIds,
    setSilenceThresholdDb,
    setMinSilenceDurationMs,
    toggleSegmentSelection,
    reset,
    optimize: optimizeSmart,
  } = useSmartRingtone();

  const {
    audioRef: smartPreviewRef,
    playSegment: playSmartSegment,
    isPreparing: isPreparingSmartSegment,
  } = useSegmentPreview({
    segments,
    onError: (message) => {
      toast.error(message);
    },
  });

  const {
    isProcessing: isEqualizing,
    isAnalyzing: isAnalyzingSpectrum,
    isPreviewing: isPreviewingEqualizer,
    previewBlob: equalizerPreviewBlob,
    selectedPreset,
    analysisResult,
    error: equalizerError,
    analyzeAndSuggest,
    previewPreset,
    setPreset,
    reset: resetEqualizer,
  } = useEqualizer();

  useEffect(() => {
    if (equalizerError) {
      toast.error(equalizerError);
    }
  }, [equalizerError]);

  useEffect(() => {
    if (ringtone) {
      setTrimStart(0);
      setTrimEnd(ringtone.duration);
    }
  }, [ringtone]);

  useEffect(() => {
    if (trimRingtoneId !== ringtone?.id) {
      reset();
      setSmartSourceBlob(null);
      setSmartSourceRingtoneId(null);
    }
  }, [trimRingtoneId, ringtone?.id, reset]);

  useEffect(() => {
    resetEqualizer();
    setEqualizerSourceBlob(null);
  }, [equalizerRingtoneId, resetEqualizer]);

  const handleStartRename = useCallback((rt: Ringtone) => {
    setEditingTitleId(rt.id);
    setEditingTitleValue(rt.title);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, []);

  const handleConfirmRename = useCallback(
    async (rt: Ringtone) => {
      const success = await handleRename(rt, editingTitleValue);
      if (success) {
        setEditingTitleId(null);
        await fetchAll();
      }
    },
    [handleRename, editingTitleValue, fetchAll],
  );

  const handleOptimizeExisting = useCallback(
    async (rt: Ringtone) => {
      try {
        startTransition(() => {
          setOptimizingId(rt.id);
        });

        const response = await fetch(rt.fileUrl);
        if (!response.ok) {
          throw new Error('Erreur lors du téléchargement de la sonnerie à optimiser');
        }

        const originalBlob = await response.blob();

        const hasManualTrim = trimRingtoneId === rt.id && rt.duration > 1;
        const options = hasManualTrim
          ? {
              manualStartSeconds: Math.max(0, Math.min(trimStart, rt.duration - 1)),
              manualEndSeconds: Math.max(
                Math.max(0, Math.min(trimStart + 1, rt.duration)),
                Math.min(trimEnd || rt.duration, rt.duration),
              ),
            }
          : undefined;

        const { optimizedBlob, durationSeconds } = await optimizeRingtone(originalBlob, options);

        const extension = rt.format;
        const safeMimeType = optimizedBlob.type || 'audio/wav';
        const baseTitle = `${rt.title} (opt)`;
        const sanitizedTitle = baseTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone_opt';
        const filename = `${sanitizedTitle}.${extension}`;
        const file = new File([optimizedBlob], filename, { type: safeMimeType });

        const rawDuration = Number.isFinite(durationSeconds)
          ? durationSeconds
          : rt.duration;
        const clampedDuration = Math.max(1, Math.min(40, Math.round(rawDuration)));

        await upload(file, baseTitle, extension, clampedDuration);
        toast.success(`Version optimisée créée : ${baseTitle}`);
        await fetchAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de créer la version optimisée';
        toast.error(message);
        console.error('Erreur lors de la création de la version optimisée:', error);
      } finally {
        startTransition(() => {
          setOptimizingId(null);
        });
      }
    },
    [trimRingtoneId, trimStart, trimEnd, upload, fetchAll],
  );

  const handleAnalyzeExistingSmart = useCallback(
    async (rt: Ringtone) => {
      try {
        setSmartSourceRingtoneId(rt.id);

        const response = await fetch(rt.fileUrl);
        if (!response.ok) {
          throw new Error('Erreur lors du téléchargement de la sonnerie à analyser');
        }

        const originalBlob = await response.blob();
        setSmartSourceBlob(originalBlob);

        await optimizeSmart(originalBlob);
        toast.success('Analyse des segments terminée ✔️');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible d\'analyser les segments';
        toast.error(message);
        console.error('Erreur lors de l\'analyse des segments existants:', error);
      }
    },
    [optimizeSmart],
  );

  const handleAnalyzeSpectrumForEqualizer = useCallback(
    async (rt: Ringtone) => {
      try {
        setEqualizerRingtoneId(rt.id);

        const response = await fetch(rt.fileUrl);
        if (!response.ok) {
          throw new Error('Erreur lors du téléchargement de la sonnerie à analyser');
        }

        const originalBlob = await response.blob();
        setEqualizerSourceBlob(originalBlob);

        await analyzeAndSuggest(originalBlob);
        toast.success('Analyse spectrale terminée ✔️');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible d'analyser le spectre";
        toast.error(message);
        console.error('Erreur lors de l\'analyse spectrale:', error);
      }
    },
    [analyzeAndSuggest],
  );

  const handlePreviewEqualizerForExisting = useCallback(
    async (rt: Ringtone, preset: typeof selectedPreset) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== rt.id) {
        toast.error('Analyse spectrale requise avant la prévisualisation');
        return;
      }

      try {
        await previewPreset(equalizerSourceBlob, preset);
      } catch {
        // L'erreur est déjà gérée dans le hook
      }
    },
    [equalizerSourceBlob, equalizerRingtoneId, previewPreset],
  );

  const handleApplyEqualizerToExisting = useCallback(
    async (rt: Ringtone) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== rt.id) {
        toast.error('Analyse spectrale requise avant l\'application de l\'égaliseur');
        return;
      }

      try {
        const { applyEqualizerPresetToBlob } = await import('../services/audio/equalizer.service');
        const result = await applyEqualizerPresetToBlob(equalizerSourceBlob, selectedPreset);

        const extension = rt.format;
        const safeMimeType = result.equalizedBlob.type || 'audio/wav';
        const baseTitle = `${rt.title} (égalisé)`;
        const sanitizedTitle = baseTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone_eq';
        const filename = `${sanitizedTitle}.${extension}`;
        const file = new File([result.equalizedBlob], filename, { type: safeMimeType });

        const rawDuration = result.durationSeconds !== null && Number.isFinite(result.durationSeconds)
          ? result.durationSeconds
          : rt.duration;
        const clampedDuration = Math.max(1, Math.min(40, Math.round(rawDuration)));

        await upload(file, baseTitle, extension, clampedDuration);
        toast.success(`Version égalisée créée : ${baseTitle}`);
        await fetchAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de créer la version égalisée';
        toast.error(message);
        console.error('Erreur lors de la création de la version égalisée:', error);
      }
    },
    [equalizerSourceBlob, equalizerRingtoneId, selectedPreset, upload, fetchAll],
  );

  const handleCreateSegmentVersions = useCallback(
    async (rt: Ringtone) => {
      if (!smartSourceBlob || smartSourceRingtoneId !== rt.id) {
        toast.error('Analyse des segments requise avant la création par parties');
        return;
      }

      if (segments.length === 0 || selectedSegmentIds.length === 0) {
        toast.error('Sélectionnez au moins une partie à garder');
        return;
      }

      try {
        const extension = rt.format;
        const safeMimeType = 'audio/wav';
        const baseTitle = `${rt.title}`;
        const sanitizedTitle =
          baseTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone_part';

        const selectedSegments = segments.filter((segment) =>
          selectedSegmentIds.includes(segment.id),
        );

        const builtRingtones = await buildRingtonesForSegments(smartSourceBlob, selectedSegments);

        for (const built of builtRingtones) {
          let finalDuration = built.durationSeconds;

          if (!Number.isFinite(finalDuration) || finalDuration < 1) {
            continue;
          }

          if (finalDuration > 40) {
            finalDuration = 40;
          }

          finalDuration = Math.round(finalDuration);

          const partTitle = `${rt.title} (partie ${built.segmentId})`;
          const filename = `${sanitizedTitle}_partie_${built.segmentId}.${extension}`;
          const file = new File([built.blob], filename, { type: safeMimeType });

          await upload(file, partTitle, extension, finalDuration);
        }

        toast.success('Sonneries par partie créées ✔️');
        await fetchAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de créer les sonneries par partie';
        toast.error(message);
        console.error('Erreur lors de la création par parties:', error);
      }
    },
    [smartSourceBlob, smartSourceRingtoneId, segments, selectedSegmentIds, upload, fetchAll],
  );

  const handleShare = useCallback(() => {
    setShareModalOpen(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  if (!isOpen || !ringtone) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`Détails de ${ringtone.title}`}
        onClick={onClose}
      >
        <div
          className="relative flex flex-col w-full max-w-4xl max-h-full bg-white dark:bg-gray-900 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden my-4"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90">
            <div className="min-w-0 flex-1">
              {editingTitleId === ringtone.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    className="w-full px-3 py-2 text-lg font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="text-xs px-3 py-1.5 min-h-[32px]"
                      onClick={() => handleConfirmRename(ringtone)}
                    >
                      ✔️ Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs px-3 py-1.5 min-h-[32px]"
                      onClick={handleCancelRename}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {ringtone.title}
                  </h2>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await toggleFavorite(ringtone.id);
                      } catch {
                        // L'erreur est déjà gérée dans le store
                      }
                    }}
                    className={`flex-shrink-0 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center rounded-full ${
                      isFavorite(ringtone.id)
                        ? 'text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300'
                        : 'text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    aria-label={
                      isFavorite(ringtone.id)
                        ? 'Retirer des favoris'
                        : 'Ajouter aux favoris'
                    }
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill={isFavorite(ringtone.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.995 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
                        4.42 3 7.5 3c1.74 0 3.41.81 4.495 2.09C13.09 3.81 14.76 3 16.5 3 
                        19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.545 11.54l-1.46 1.31z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProtection(ringtone)}
                    className={`flex-shrink-0 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center rounded-full ${
                      ringtone.isProtected
                        ? 'text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300'
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                    title={
                      ringtone.isProtected
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
                      {ringtone.isProtected ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span>Format: {ringtone.format.toUpperCase()}</span>
                <span>Durée: {formatDuration(ringtone.duration)}</span>
                <span>Taille: {formatSize(ringtone.sizeBytes)}</span>
                <span>
                  Créé le: {format(new Date(ringtone.createdAt), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {editingTitleId !== ringtone.id && (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[32px] text-[11px] px-3"
                  onClick={() => handleStartRename(ringtone)}
                >
                  Renommer
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                aria-label="Fermer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50 dark:bg-gray-950">
            <Card className="p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Pré-écoute
                </h3>
                <AudioPlayer src={ringtone.fileUrl} title="Écouter" />
              </div>

              <div className="flex flex-wrap gap-2">
                {getAvailableRingtoneFormats().length > 1 ? (
                  <div className="relative flex-[2] min-w-0 z-50">
                    <Button
                      onClick={() => setDownloadMenuId(downloadMenuId === ringtone.id ? null : ringtone.id)}
                      variant="primary"
                      className="w-full min-h-[44px] text-sm !rounded-xl px-4 py-2.5"
                    >
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="truncate">Télécharger</span>
                      <svg className="w-4 h-4 inline ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>

                    {downloadMenuId === ringtone.id && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                        {getAvailableRingtoneFormats().map((format) => (
                          <button
                            key={format}
                            type="button"
                            onClick={() => {
                              handleDownload(ringtone, format);
                              setDownloadMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {getFormatLabel(format)}
                            {format === getRecommendedRingtoneFormat() && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(recommandé)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={() => handleDownload(ringtone, getRecommendedRingtoneFormat())}
                    variant="primary"
                    className="flex-[2] min-h-[44px] text-sm !rounded-xl px-4 py-2.5 min-w-0"
                  >
                    <svg className="w-5 h-5 inline mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="truncate">Télécharger</span>
                  </Button>
                )}
                <Button
                  onClick={handleShare}
                  variant="secondary"
                  className="flex-1 min-h-[44px] text-sm !rounded-xl px-4 py-2.5 min-w-0"
                  title="Partager la sonnerie"
                >
                  <svg className="w-4 h-4 inline mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="truncate">Partager</span>
                </Button>
              </div>
            </Card>

            {/* Découpe manuelle */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Découpe manuelle
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Choisissez le début et la fin de votre sonnerie
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (trimRingtoneId === ringtone.id) {
                      setTrimRingtoneId(null);
                    } else {
                      setTrimRingtoneId(ringtone.id);
                      setTrimStart(0);
                      setTrimEnd(ringtone.duration);
                    }
                  }}
                  variant="secondary"
                  className="min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5"
                >
                  {trimRingtoneId === ringtone.id ? 'Masquer' : 'Découper'}
                </Button>
              </div>

              {trimRingtoneId === ringtone.id && ringtone.duration > 1 && (
                <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
                  <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Découpe manuelle</span>
                    <span className="font-mono">
                      {Math.max(0, Math.min(trimStart, ringtone.duration))}s →{' '}
                      {Math.max(
                        Math.min(trimStart + 1, ringtone.duration),
                        Math.min(trimEnd || ringtone.duration, ringtone.duration),
                      )}
                      s
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-gray-500 dark:text-gray-400">
                      Début
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, ringtone.duration - 1)}
                      step={0.1}
                      value={trimStart}
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        setTrimStart(
                          Math.min(next, Math.max(0, (trimEnd || ringtone.duration) - 1)),
                        );
                      }}
                      className="range-default w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-gray-500 dark:text-gray-400">
                      Fin
                    </label>
                    <input
                      type="range"
                      min={Math.min(ringtone.duration - 1, trimStart + 1)}
                      max={ringtone.duration}
                      step={0.1}
                      value={trimEnd || ringtone.duration}
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        setTrimEnd(Math.max(next, trimStart + 1));
                      }}
                      className="range-default w-full"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => handleOptimizeExisting(ringtone)}
                      variant="secondary"
                      className="min-h-[36px]"
                      isLoading={optimizingId === ringtone.id}
                      disabled={optimizingId === ringtone.id}
                    >
                      ✨ Créer une version optimisée découpée
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Assistant Smart Ringtone multi-parties */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Assistant Smart Ringtone (multi-parties)
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Détecte automatiquement les silences et permet de garder plusieurs parties distinctes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[32px] text-[11px] px-3"
                  onClick={() => handleAnalyzeExistingSmart(ringtone)}
                  isLoading={isSmartOptimizing && smartSourceRingtoneId === ringtone.id}
                  disabled={isSmartOptimizing && smartSourceRingtoneId === ringtone.id}
                >
                  Analyser
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  Seuil de volume (dB)
                  <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {silenceThresholdDb.toFixed(0)} dB
                  </span>
                </label>
                <input
                  type="range"
                  min={-60}
                  max={-10}
                  step={1}
                  value={silenceThresholdDb}
                  onChange={(e) => setSilenceThresholdDb(parseInt(e.target.value, 10))}
                  className="range-default w-full"
                />
                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>-60 dB (très sensible)</span>
                  <span>-10 dB (peu sensible)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  Durée minimale du blanc (ms)
                  <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {minSilenceDurationMs} ms
                  </span>
                </label>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={50}
                  value={minSilenceDurationMs}
                  onChange={(e) => setMinSilenceDurationMs(parseInt(e.target.value, 10))}
                  className="range-default w-full"
                />
                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>100 ms (coupes fréquentes)</span>
                  <span>1000 ms (coupes plus rares)</span>
                </div>
              </div>

              {smartSourceRingtoneId === ringtone.id && segments.length > 0 && (
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                  <div>
                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                      Choisissez quelle(s) partie(s) vous voulez garder
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Une nouvelle sonnerie sera créée pour chaque partie sélectionnée.
                    </p>
                  </div>

                  <div className="w-full h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                    {segments.map((segment, index) => {
                      const total = ringtone.duration || segment.endSeconds;
                      const widthPercent =
                        total > 0 ? (segment.durationSeconds / total) * 100 : 0;
                      const isSelected = selectedSegmentIds.includes(segment.id);
                      const colors = [
                        'bg-blue-500',
                        'bg-green-500',
                        'bg-purple-500',
                        'bg-amber-500',
                        'bg-rose-500',
                      ];
                      const colorClass = colors[index % colors.length];
                      return (
                        <div
                          key={segment.id}
                          className={`relative h-full ${colorClass} ${
                            isSelected ? '' : 'opacity-40'
                          }`}
                          style={{ width: `${Math.max(widthPercent, 2)}%` }}
                        >
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-800 dark:text-gray-100">
                            {segment.id}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {segments.map((segment) => {
                      const startSec = Math.max(0, Math.floor(segment.startSeconds));
                      const endSec = Math.max(
                        startSec + 1,
                        Math.floor(segment.endSeconds),
                      );
                      const format = (sec: number) => {
                        const mins = Math.floor(sec / 60);
                        const secs = sec % 60;
                        return `${mins.toString().padStart(2, '0')}:${secs
                          .toString()
                          .padStart(2, '0')}`;
                      };
                      const isSelected = selectedSegmentIds.includes(segment.id);
                      return (
                        <label
                          key={segment.id}
                          className="flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/80 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSegmentSelection(segment.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium">
                              Partie {segment.id}{' '}
                              <span className="font-normal text-gray-500 dark:text-gray-400">
                                ({format(startSec)} → {format(endSec)})
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => playSmartSegment(segment.id)}
                            disabled={
                              isSmartOptimizing ||
                              isPreparingSmartSegment ||
                              !smartSourceBlob ||
                              smartSourceRingtoneId !== ringtone.id
                            }
                            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 min-h-[28px] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSmartOptimizing || isPreparingSmartSegment ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <span>Préparation…</span>
                              </>
                            ) : (
                              'Écouter'
                            )}
                          </button>
                        </label>
                      );
                    })}
                  </div>

                  {smartSourceBlob && smartSourceRingtoneId === ringtone.id && (
                    <div className="space-y-2">
                      <audio
                        ref={smartPreviewRef}
                        controls
                        className="w-full"
                        src={URL.createObjectURL(smartSourceBlob)}
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Pré-écoute des différentes parties détectées.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      className="min-h-[32px] text-[11px] px-3"
                      onClick={() => handleCreateSegmentVersions(ringtone)}
                    >
                      💾 Créer une sonnerie par partie sélectionnée
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Section Égaliseur Audio */}
            <Card className="p-4 space-y-3">
              {equalizerRingtoneId === ringtone.id ? (
                <Equalizer
                  selectedPreset={selectedPreset}
                  onPresetChange={setPreset}
                  onAnalyze={() => handleAnalyzeSpectrumForEqualizer(ringtone)}
                  onApply={() => handleApplyEqualizerToExisting(ringtone)}
                  onPreview={(preset) => handlePreviewEqualizerForExisting(ringtone, preset)}
                  isAnalyzing={isAnalyzingSpectrum}
                  isProcessing={isEqualizing}
                  isPreviewing={isPreviewingEqualizer}
                  previewBlob={equalizerPreviewBlob}
                  analysisResult={analysisResult}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Égaliseur Audio
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Améliorez la qualité audio avec des presets d'égalisation (Bass Boost, Vocal Clarity, etc.)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-[32px] text-[11px] px-3"
                    onClick={() => {
                      setEqualizerRingtoneId(ringtone.id);
                      void handleAnalyzeSpectrumForEqualizer(ringtone);
                    }}
                  >
                    Ouvrir
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <footer className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-[40px] px-4"
              onClick={onClose}
            >
              Fermer
            </Button>
          </footer>
        </div>
      </div>

      {shareModalOpen && ringtone && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={handleCloseShareModal}
          shareUrl={ringtone.fileUrl}
          title={ringtone.title}
          description={`Découvrez la sonnerie "${ringtone.title}" créée avec RingaRecord!`}
        />
      )}
    </>
  );
};

