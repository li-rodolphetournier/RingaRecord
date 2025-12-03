import { useEffect, useState, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AudioPlayer } from '../components/AudioPlayer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Ringtone } from '../types/ringtone.types';
import { optimizeRingtone } from '../services/audio/smartRingtone.service';
import { useSmartRingtone } from '../hooks/useSmartRingtone';
import { useSegmentPreview } from '../hooks/useSegmentPreview';
import { useEqualizer } from '../hooks/useEqualizer';
import { buildRingtonesForSegments } from '../services/audio/ringtoneSegments.service';
import { Equalizer } from '../components/audio/Equalizer';
import { getRecommendedRingtoneFormat, getAvailableRingtoneFormats, getFormatLabel } from '../utils/ringtoneFormat';
import { ShareModal } from '../components/ShareModal';
import { useRingtoneActions } from '../hooks/useRingtoneActions';
import { formatDuration, formatSize } from '../utils/formatUtils';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const {
    ringtones,
    fetchAll,
    isLoading,
    upload,
  } = useRingtoneStore();
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [trimRingtoneId, setTrimRingtoneId] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const [smartSourceBlob, setSmartSourceBlob] = useState<Blob | null>(null);
  const [smartSourceRingtoneId, setSmartSourceRingtoneId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [viewMode, setViewMode] = useState<'block' | 'landscape'>('block');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareRingtone, setShareRingtone] = useState<Ringtone | null>(null);
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
    equalizedBlob,
    previewBlob: equalizerPreviewBlob,
    durationSeconds,
    selectedPreset,
    analysisResult,
    error: equalizerError,
    applyPreset,
    analyzeAndSuggest,
    previewPreset,
    setPreset,
    reset: resetEqualizer,
  } = useEqualizer();

  const { handleDelete, handleRename, handleDownload, handleToggleProtection } = useRingtoneActions();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [isAuthenticated, navigate, fetchAll]);

  useEffect(() => {
    if (equalizerError) {
      toast.error(equalizerError);
    }
  }, [equalizerError]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleStartRename = useCallback((ringtone: Ringtone) => {
    setEditingTitleId(ringtone.id);
    setEditingTitleValue(ringtone.title);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, []);

  const handleConfirmRename = useCallback(
    async (ringtone: Ringtone) => {
      const success = await handleRename(ringtone, editingTitleValue);
      if (success) {
        setEditingTitleId(null);
      }
    },
    [handleRename, editingTitleValue],
  );

  // Réinitialiser l'assistant Smart lorsqu'on change de sonnerie en mode découpe
  useEffect(() => {
    reset();
    setSmartSourceBlob(null);
    setSmartSourceRingtoneId(null);
  }, [trimRingtoneId, reset]);

  // Réinitialiser l'égaliseur lorsqu'on change de sonnerie
  useEffect(() => {
    resetEqualizer();
    setEqualizerSourceBlob(null);
  }, [equalizerRingtoneId, resetEqualizer]);

  const handleOptimizeExisting = useCallback(
    async (ringtone: Ringtone) => {
      try {
        startTransition(() => {
          setOptimizingId(ringtone.id);
        });

        const response = await fetch(ringtone.fileUrl);
        if (!response.ok) {
          throw new Error('Erreur lors du téléchargement de la sonnerie à optimiser');
        }

        const originalBlob = await response.blob();

        const hasManualTrim = trimRingtoneId === ringtone.id && ringtone.duration > 1;
        const options = hasManualTrim
          ? {
              manualStartSeconds: Math.max(0, Math.min(trimStart, ringtone.duration - 1)),
              manualEndSeconds: Math.max(
                Math.max(0, Math.min(trimStart + 1, ringtone.duration)),
                Math.min(trimEnd || ringtone.duration, ringtone.duration),
              ),
            }
          : undefined;

        const { optimizedBlob, durationSeconds } = await optimizeRingtone(originalBlob, options);

        const extension = ringtone.format;
        const safeMimeType = optimizedBlob.type || 'audio/wav';
        const baseTitle = `${ringtone.title} (opt)`;
        const sanitizedTitle = baseTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone_opt';
        const filename = `${sanitizedTitle}.${extension}`;
        const file = new File([optimizedBlob], filename, { type: safeMimeType });

        const rawDuration = Number.isFinite(durationSeconds)
          ? durationSeconds
          : ringtone.duration;
        const clampedDuration = Math.max(1, Math.min(40, Math.round(rawDuration)));

        await upload(file, baseTitle, extension, clampedDuration);
        toast.success(`Version optimisée créée : ${baseTitle}`);
        await fetchAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de créer la version optimisée';
        toast.error(message);
        // eslint-disable-next-line no-console
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
    async (ringtone: Ringtone) => {
      try {
        setSmartSourceRingtoneId(ringtone.id);

        const response = await fetch(ringtone.fileUrl);
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
        // eslint-disable-next-line no-console
        console.error('Erreur lors de l\'analyse des segments existants:', error);
      }
    },
    [optimizeSmart],
  );

  const handleAnalyzeSpectrumForEqualizer = useCallback(
    async (ringtone: Ringtone) => {
      try {
        setEqualizerRingtoneId(ringtone.id);

        const response = await fetch(ringtone.fileUrl);
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
        // eslint-disable-next-line no-console
        console.error('Erreur lors de l\'analyse spectrale:', error);
      }
    },
    [analyzeAndSuggest],
  );

  const handlePreviewEqualizerForExisting = useCallback(
    async (ringtone: Ringtone, preset: typeof selectedPreset) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== ringtone.id) {
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
    async (ringtone: Ringtone) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== ringtone.id) {
        toast.error('Analyse spectrale requise avant l\'application de l\'égaliseur');
        return;
      }

      try {
        // Utiliser directement le service pour éviter le double traitement
        // Le hook applyPreset() appelle aussi applyEqualizerPresetToBlob, ce qui serait redondant
        const { applyEqualizerPresetToBlob } = await import('../services/audio/equalizer.service');
        const result = await applyEqualizerPresetToBlob(equalizerSourceBlob, selectedPreset);

        const extension = ringtone.format;
        const safeMimeType = result.equalizedBlob.type || 'audio/wav';
        const baseTitle = `${ringtone.title} (égalisé)`;
        const sanitizedTitle = baseTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone_eq';
        const filename = `${sanitizedTitle}.${extension}`;
        const file = new File([result.equalizedBlob], filename, { type: safeMimeType });

        const rawDuration = result.durationSeconds !== null && Number.isFinite(result.durationSeconds)
          ? result.durationSeconds
          : ringtone.duration;
        const clampedDuration = Math.max(1, Math.min(40, Math.round(rawDuration)));

        await upload(file, baseTitle, extension, clampedDuration);
        toast.success(`Version égalisée créée : ${baseTitle}`);
        await fetchAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Impossible de créer la version égalisée';
        toast.error(message);
        // eslint-disable-next-line no-console
        console.error('Erreur lors de la création de la version égalisée:', error);
      }
    },
    [equalizerSourceBlob, equalizerRingtoneId, selectedPreset, upload, fetchAll],
  );

  const handleCreateSegmentVersions = useCallback(
    async (ringtone: Ringtone) => {
      if (!smartSourceBlob || smartSourceRingtoneId !== ringtone.id) {
        toast.error('Analyse des segments requise avant la création par parties');
        return;
      }

      if (segments.length === 0 || selectedSegmentIds.length === 0) {
        toast.error('Sélectionnez au moins une partie à garder');
        return;
      }

      try {
        const extension = ringtone.format;
        const safeMimeType = 'audio/wav';
        const baseTitle = `${ringtone.title}`;
        const sanitizedTitle =
          baseTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'ringtone_part';

        const selectedSegments = segments.filter((segment) =>
          selectedSegmentIds.includes(segment.id),
        );

        const builtRingtones = await buildRingtonesForSegments(smartSourceBlob, selectedSegments);

        for (const built of builtRingtones) {
          let finalDuration = built.durationSeconds;

          if (!Number.isFinite(finalDuration) || finalDuration < 1) {
            // eslint-disable-next-line no-continue
            continue;
          }

          if (finalDuration > 40) {
            finalDuration = 40;
          }

          finalDuration = Math.round(finalDuration);

          const partTitle = `${ringtone.title} (partie ${built.segmentId})`;
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
        // eslint-disable-next-line no-console
        console.error('Erreur lors de la création par parties:', error);
      }
    },
    [smartSourceBlob, smartSourceRingtoneId, segments, selectedSegmentIds, upload, fetchAll],
  );

  const handleDeleteClick = useCallback(
    (ringtone: Ringtone) => {
      if (ringtone.isProtected) {
        toast.warning(
          'Cette sonnerie est protégée. Désactivez la protection (⭐) avant de pouvoir la supprimer.',
          {
            autoClose: 5000,
          },
        );
        return;
      }

      toast.info(({ closeToast }) => (
        <div className="space-y-3">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Supprimer « {ringtone.title} » ?
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Cette action est définitive.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => handleDelete(ringtone, closeToast)}
            >
              Supprimer
            </Button>
            <Button variant="secondary" className="flex-1" onClick={closeToast}>
              Annuler
            </Button>
          </div>
        </div>
      ), {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        position: 'top-center',
      });
    },
    [handleDelete],
  );

  const handleShare = useCallback((ringtone: Ringtone) => {
    setShareRingtone(ringtone);
    setShareModalOpen(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalOpen(false);
    setShareRingtone(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            RingaRecord
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/record')} variant="primary">
              Nouvelle sonnerie
            </Button>
            <Button onClick={handleLogout} variant="secondary">
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Mes sonneries
        </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {viewMode === 'block' ? 'Bloc' : 'Paysage'}
            </span>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'block' ? 'landscape' : 'block')}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={viewMode === 'block' ? 'Passer en mode paysage' : 'Passer en mode bloc'}
            >
              {viewMode === 'block' ? (
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
          </div>
        ) : ringtones.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucune sonnerie pour le moment
              </p>
              <Button onClick={() => navigate('/record')} variant="primary">
                Créer ma première sonnerie
              </Button>
            </div>
          </Card>
        ) : (
          <div className={viewMode === 'block' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
            {ringtones.map((ringtone) => (
              <Card key={ringtone.id} className={`hover:shadow-lg transition-shadow overflow-visible ${viewMode === 'landscape' ? 'flex flex-row gap-4 p-4' : ''}`}>
                {viewMode === 'landscape' ? (
                  <>
                    {/* Mode paysage : Player à gauche, infos à droite */}
                    <div className="flex-shrink-0 w-48">
                      <AudioPlayer src={ringtone.fileUrl} title="Écouter" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                  {editingTitleId === ringtone.id ? (
                    <div className="flex-1 space-y-1 min-w-0">
                      <input
                        type="text"
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          className="text-xs px-2 py-1 min-h-[28px]"
                          onClick={() => handleConfirmRename(ringtone)}
                        >
                          ✔️ Enregistrer
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs px-2 py-1 min-h-[28px]"
                          onClick={handleCancelRename}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                        {ringtone.title}
                      </h3>
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
                          fill={ringtone.isProtected ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  {editingTitleId !== ringtone.id && (
                    <button
                      type="button"
                      onClick={() => handleStartRename(ringtone)}
                      className="text-[11px] px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] flex-shrink-0"
                    >
                      Renommer
                    </button>
                  )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <p>Format: {ringtone.format.toUpperCase()}</p>
                        <p>Durée: {formatDuration(ringtone.duration)}</p>
                        <p>Taille: {formatSize(ringtone.sizeBytes)}</p>
                        <p>
                          Créé le:{' '}
                          {format(new Date(ringtone.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                          {getAvailableRingtoneFormats().length > 1 ? (
                            <div className="relative flex-[2] min-w-0 z-50">
                              <Button
                                onClick={() => setDownloadMenuId(downloadMenuId === ringtone.id ? null : ringtone.id)}
                                variant="primary"
                                className="w-full min-h-[48px] text-sm !rounded-xl px-4 py-2.5"
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
                              className="flex-[2] min-h-[48px] text-sm !rounded-xl px-4 py-2.5 min-w-0"
                            >
                              <svg className="w-5 h-5 inline mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span className="truncate">Enregistrer</span>
                            </Button>
                          )}
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
                            className="flex-1 min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
                          >
                            <span className="truncate">✂️ Découper</span>
                          </Button>
                          <Button
                            onClick={() => handleShare(ringtone)}
                            variant="secondary"
                            className="flex-1 min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
                            title="Partager la sonnerie"
                          >
                            <svg className="w-4 h-4 inline mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="truncate">Partager</span>
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(ringtone)}
                            variant="danger"
                            className="flex-1 min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
                            disabled={ringtone.isProtected}
                            title={
                              ringtone.isProtected
                                ? 'Désactivez la protection (⭐) pour supprimer'
                                : 'Supprimer la sonnerie'
                            }
                          >
                            <svg className="w-4 h-4 inline mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="truncate">{ringtone.isProtected ? 'Protégée' : 'Supprimer'}</span>
                          </Button>
                        </div>

                        {trimRingtoneId === ringtone.id && ringtone.duration > 1 && (
                          <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
                            {/* Découpe manuelle simple */}
                            <div className="space-y-3">
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
                                  className="range-default"
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
                                  className="range-default"
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

                            {/* Assistant Smart Ringtone multi-parties */}
                            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                                <div>
                                  <p className="font-medium">Assistant Smart Ringtone (multi-parties)</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Détecte automatiquement les silences et permet de garder plusieurs
                                    parties distinctes.
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
                                  className="range-default"
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
                                  className="range-default"
                                />
                                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                  <span>100 ms (coupes fréquentes)</span>
                                  <span>1000 ms (coupes plus rares)</span>
                                </div>
                              </div>

                              {smartSourceRingtoneId === ringtone.id && segments.length > 0 && (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                      Choisissez quelle(s) partie(s) vous voulez garder
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      Une nouvelle sonnerie sera créée pour chaque partie sélectionnée.
                                    </p>
                                  </div>

                                  {/* Timeline globale */}
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

                                  {/* Liste des segments + pré-écoute */}
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
                                            className="text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 min-h-[28px]"
                                          >
                                            Écouter
                                          </button>
                                        </label>
                                      );
                                    })}
                                  </div>

                                  {/* Prévisualisation générale pour les segments */}
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

                              {/* Section Égaliseur Audio */}
                              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
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
                                  <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                                    <div>
                                      <p className="font-medium">Égaliseur Audio</p>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Mode bloc : layout vertical classique */}
                    <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                      {editingTitleId === ringtone.id ? (
                        <div className="flex-1 space-y-1 min-w-0">
                          <input
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              className="text-xs px-2 py-1 min-h-[28px]"
                              onClick={() => handleConfirmRename(ringtone)}
                            >
                              ✔️ Enregistrer
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs px-2 py-1 min-h-[28px]"
                              onClick={handleCancelRename}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                  {ringtone.title}
                </h3>
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
                              fill={ringtone.isProtected ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                      {editingTitleId !== ringtone.id && (
                        <button
                          type="button"
                          onClick={() => handleStartRename(ringtone)}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] flex-shrink-0"
                        >
                          Renommer
                        </button>
                      )}
                    </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <p>Format: {ringtone.format.toUpperCase()}</p>
                  <p>Durée: {formatDuration(ringtone.duration)}</p>
                  <p>Taille: {formatSize(ringtone.sizeBytes)}</p>
                  <p>
                    Créé le:{' '}
                    {format(new Date(ringtone.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>

                {/* Player audio */}
                <div className="mb-4">
                  <AudioPlayer src={ringtone.fileUrl} title="Écouter" />
                </div>

                <div className="mt-4 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                        {getAvailableRingtoneFormats().length > 1 ? (
                          <div className="relative flex-[2] min-w-0 z-50">
                    <Button
                              onClick={() => setDownloadMenuId(downloadMenuId === ringtone.id ? null : ringtone.id)}
                      variant="primary"
                              className="w-full min-h-[48px] text-sm !rounded-xl px-4 py-2.5"
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
                            className="flex-[2] min-h-[48px] text-sm !rounded-xl px-4 py-2.5 min-w-0"
                          >
                            <svg className="w-5 h-5 inline mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span className="truncate">Enregistrer</span>
                    </Button>
                        )}
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
                          className="flex-1 min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
                  >
                          <span className="truncate">✂️ Découper</span>
                  </Button>
                  <Button
                    onClick={() => handleShare(ringtone)}
                    variant="secondary"
                    className="flex-1 min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
                    title="Partager la sonnerie"
                  >
                    <svg className="w-4 h-4 inline mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="truncate">Partager</span>
                  </Button>
                  <Button
                    onClick={() => handleDelete(ringtone)}
                    variant="danger"
                          className="flex-1 min-h-[36px] text-[11px] !rounded-xl px-2 py-1.5 min-w-0"
                          disabled={ringtone.isProtected}
                          title={
                            ringtone.isProtected
                              ? 'Désactivez la protection (⭐) pour supprimer'
                              : 'Supprimer la sonnerie'
                          }
                        >
                          <svg className="w-4 h-4 inline mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                          <span className="truncate">{ringtone.isProtected ? 'Protégée' : 'Supprimer'}</span>
                        </Button>
                      </div>

                  {trimRingtoneId === ringtone.id && ringtone.duration > 1 && (
                    <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
                          {/* Découpe manuelle simple */}
                          <div className="space-y-3">
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
                                className="range-default"
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
                                className="range-default"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
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

                          {/* Assistant Smart Ringtone multi-parties */}
                          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                              <div>
                                <p className="font-medium">Assistant Smart Ringtone (multi-parties)</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Détecte automatiquement les silences et permet de garder plusieurs
                                  parties distinctes.
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
                                className="range-default"
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
                                className="range-default"
                              />
                              <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                <span>100 ms (coupes fréquentes)</span>
                                <span>1000 ms (coupes plus rares)</span>
                              </div>
                            </div>

                            {smartSourceRingtoneId === ringtone.id && segments.length > 0 && (
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                    Choisissez quelle(s) partie(s) vous voulez garder
                                  </p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Une nouvelle sonnerie sera créée pour chaque partie sélectionnée.
                                  </p>
                                </div>

                                {/* Timeline globale */}
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

                                {/* Liste des segments + pré-écoute */}
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
                                          className="text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 min-h-[28px]"
                                        >
                                          Écouter
                                        </button>
                                      </label>
                                    );
                                  })}
                                </div>

                                {/* Prévisualisation générale pour les segments */}
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

                            {/* Section Égaliseur Audio */}
                            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
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
                                <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                                  <div>
                                    <p className="font-medium">Égaliseur Audio</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
      {shareRingtone && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={handleCloseShareModal}
          shareUrl={shareRingtone.fileUrl}
          title={shareRingtone.title}
          description={`Découvrez la sonnerie "${shareRingtone.title}" créée avec RingaRecord!`}
        />
      )}
    </div>
  );
};

