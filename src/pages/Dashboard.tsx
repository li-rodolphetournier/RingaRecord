import { useEffect, useState, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Ringtone } from '../types/ringtone.types';
import { optimizeRingtone } from '../services/audio/smartRingtone.service';
import { useSmartRingtone } from '../hooks/useSmartRingtone';
import { useSegmentPreview } from '../hooks/useSegmentPreview';
import { useEqualizer } from '../hooks/useEqualizer';
import { buildRingtonesForSegments } from '../services/audio/ringtoneSegments.service';
import { ShareModal } from '../components/ShareModal';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useUiStore } from '../stores/uiStore';
import { useRingtoneActions } from '../hooks/useRingtoneActions';
import { RingtoneCard } from '../components/ringtones/RingtoneCard';
import type { RingtoneFormat } from '../services/audio/ringtoneConverter.service';

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

  const { handleDelete, handleRename, handleDownload, handleToggleProtection } = useRingtoneActions();
  const [, startTransition] = useTransition();
  const { isFavorite, toggleFavorite, load: loadFavorites } = useFavoritesStore();
  const { showDashboardRingtones, toggleShowDashboardRingtones } = useUiStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    void fetchAll();
    void loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]); // fetchAll et loadFavorites sont stables depuis les stores

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
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="min-h-[32px] text-xs px-3 hidden sm:inline-flex"
              onClick={() => navigate('/favorites')}
              aria-label="Ouvrir la page des favoris"
            >
              <svg
                className="w-4 h-4 mr-2 text-pink-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M12.001 21.35l-1.45-1.317C6.4 17.053 3 13.969 3 10.192 3 7.11 5.42 4.7 8.5 4.7c1.74 0 3.41.81 4.5 2.085C14.09 5.51 15.76 4.7 17.5 4.7 20.58 4.7 23 7.11 23 10.192c0 3.777-3.4 6.861-7.55 9.84l-1.45 1.317a1 1 0 01-1.35 0z" />
              </svg>
              <span>Favoris</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[32px] text-xs px-3"
              onClick={toggleShowDashboardRingtones}
            >
              {showDashboardRingtones ? 'Masquer' : 'Afficher'} les favoris
            </Button>
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
          <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-400">
            <span className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
            {ringtones
              .filter((ringtone) => (showDashboardRingtones ? true : !isFavorite(ringtone.id)))
              .map((ringtone) => {
                const isTrimOpen = trimRingtoneId === ringtone.id;
                const isEditing = editingTitleId === ringtone.id;
                const isEqualizerOpen = equalizerRingtoneId === ringtone.id;

                return (
                  <RingtoneCard
                    key={ringtone.id}
                    ringtone={ringtone}
                    viewMode={viewMode}
                    isFavorite={isFavorite(ringtone.id)}
                    isEditing={isEditing}
                    editingValue={editingTitleValue}
                    isTrimOpen={isTrimOpen}
                    trimStart={trimStart}
                    trimEnd={trimEnd}
                    isOptimizing={optimizingId === ringtone.id}
                    isSmartAnalyzing={isSmartOptimizing && smartSourceRingtoneId === ringtone.id}
                    segments={segments}
                    selectedSegmentIds={selectedSegmentIds}
                    silenceThresholdDb={silenceThresholdDb}
                    minSilenceDurationMs={minSilenceDurationMs}
                    smartSourceBlob={smartSourceBlob}
                    isPreparingSegment={isPreparingSmartSegment}
                    smartPreviewAudioRef={smartPreviewRef}
                    isEqualizerOpen={isEqualizerOpen}
                    selectedPreset={selectedPreset}
                    isAnalyzingSpectrum={isAnalyzingSpectrum}
                    isEqualizing={isEqualizing}
                    isPreviewingEqualizer={isPreviewingEqualizer}
                    equalizerPreviewBlob={equalizerPreviewBlob}
                    analysisResult={analysisResult}
                    onToggleFavorite={async () => {
                      try {
                        await toggleFavorite(ringtone.id);
                      } catch {
                        // L'erreur est déjà gérée dans le store
                      }
                    }}
                    onToggleProtection={() => handleToggleProtection(ringtone)}
                    onStartRename={() => handleStartRename(ringtone)}
                    onCancelRename={handleCancelRename}
                    onConfirmRename={() => handleConfirmRename(ringtone)}
                    onEditingValueChange={setEditingTitleValue}
                    onDownload={(format) => handleDownload(ringtone, format as RingtoneFormat)}
                    onToggleTrim={() => {
                      if (isTrimOpen) {
                        setTrimRingtoneId(null);
                      } else {
                        setTrimRingtoneId(ringtone.id);
                        setTrimStart(0);
                        setTrimEnd(ringtone.duration);
                      }
                    }}
                    onTrimStartChange={setTrimStart}
                    onTrimEndChange={setTrimEnd}
                    onOptimizeWithTrim={() => handleOptimizeExisting(ringtone)}
                    onShare={() => handleShare(ringtone)}
                    onDelete={() => handleDeleteClick(ringtone)}
                    onAnalyzeSmart={() => handleAnalyzeExistingSmart(ringtone)}
                    onSilenceThresholdChange={setSilenceThresholdDb}
                    onMinSilenceDurationChange={setMinSilenceDurationMs}
                    onToggleSegmentSelection={toggleSegmentSelection}
                    onPlaySegment={playSmartSegment}
                    onCreateSegmentVersions={() => handleCreateSegmentVersions(ringtone)}
                    onOpenEqualizer={() => {
                      setEqualizerRingtoneId(ringtone.id);
                      void handleAnalyzeSpectrumForEqualizer(ringtone);
                    }}
                    onPresetChange={setPreset}
                    onAnalyzeSpectrum={() => handleAnalyzeSpectrumForEqualizer(ringtone)}
                    onApplyEqualizer={() => handleApplyEqualizerToExisting(ringtone)}
                    onPreviewEqualizer={(preset) => handlePreviewEqualizerForExisting(ringtone, preset)}
                  />
                );
              })}
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
