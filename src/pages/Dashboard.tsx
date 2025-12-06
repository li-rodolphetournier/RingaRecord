import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Ringtone } from '../types/ringtone.types';
import { ShareModal } from '../components/ShareModal';
import { RingtoneCard } from '../components/ringtones/RingtoneCard';
import type { RingtoneFormat } from '../services/audio/ringtoneConverter.service';
import { useDashboard } from '../hooks/useDashboard';
import { ThemeToggle } from '../components/ThemeToggle';
// import { Logo } from '../components/Logo';
import { containerVariants, itemVariants, headerVariants } from '../utils/animations';

export const Dashboard = () => {
  const {
    // Navigation
    navigate,
    handleLogout,

    // État
    ringtones,
    isLoading,
    viewMode,
    setViewMode,

    // Favoris
    isFavorite,
    toggleFavorite,
    showDashboardRingtones,
    toggleShowDashboardRingtones,

    // Édition
    editingTitleId,
    editingTitleValue,
    handleStartRename,
    handleCancelRename,
    handleConfirmRename,
    setEditingTitleValue,

    // Trim
    trimRingtoneId,
    trimStart,
    trimEnd,
    handleToggleTrim,
    setTrimStart,
    setTrimEnd,

    // Optimisation
    optimizingId,
    handleOptimizeExisting,

    // Smart Ringtone
    smartRingtone,
    smartSourceBlob,
    smartSourceRingtoneId,
    handleAnalyzeExistingSmart,
    handleCreateSegmentVersions,
    segmentPreview,

    // Égaliseur
    equalizer,
    equalizerRingtoneId,
    handleAnalyzeSpectrumForEqualizer,
    handleApplyEqualizerToExisting,
    handlePreviewEqualizerForExisting,
    setEqualizerRingtoneId,

    // Actions
    handleDownload,
    handleToggleProtection,
    handleDelete,

    // Partage
    shareModalOpen,
    shareRingtone,
    handleShare,
    handleCloseShareModal,
  } = useDashboard();

  // Handler de suppression avec confirmation toast (reste dans le composant car utilise du JSX)
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
          <p className="text-sm text-gray-600 dark:text-gray-300">Cette action est définitive.</p>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <motion.header
        className="bg-white dark:bg-gray-800 shadow-sm"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* <Logo height="h-10" /> */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={() => navigate('/record')} variant="primary">
              Nouvelle sonnerie
            </Button>
            <Button onClick={handleLogout} variant="secondary">
              Déconnexion
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Mes sonneries</h2>
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
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-400">
            <span className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ringtones.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Aucune sonnerie pour le moment</p>
              <Button onClick={() => navigate('/record')} variant="primary">
                Créer ma première sonnerie
              </Button>
            </div>
          </Card>
        ) : (
          <motion.div
            className={
              viewMode === 'block'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-4'
            }
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {ringtones
              .filter((ringtone) => (showDashboardRingtones ? true : !isFavorite(ringtone.id)))
              .map((ringtone) => {
                const isTrimOpen = trimRingtoneId === ringtone.id;
                const isEditing = editingTitleId === ringtone.id;
                const isEqualizerOpen = equalizerRingtoneId === ringtone.id;

                return (
                  <motion.div key={ringtone.id} variants={itemVariants} layout>
                    <RingtoneCard
                      ringtone={ringtone}
                    viewMode={viewMode}
                    isFavorite={isFavorite(ringtone.id)}
                    editing={{
                      isEditing,
                      editingValue: editingTitleValue,
                      onStart: () => handleStartRename(ringtone),
                      onCancel: handleCancelRename,
                      onConfirm: () => handleConfirmRename(ringtone),
                      onValueChange: setEditingTitleValue,
                    }}
                    trim={{
                      isOpen: isTrimOpen,
                      trimStart,
                      trimEnd,
                      isOptimizing: optimizingId === ringtone.id,
                      onToggle: () => handleToggleTrim(ringtone),
                      onTrimStartChange: setTrimStart,
                      onTrimEndChange: setTrimEnd,
                      onOptimize: () => handleOptimizeExisting(ringtone),
                    }}
                    smartRingtone={{
                      isAnalyzing: smartRingtone.isOptimizing && smartSourceRingtoneId === ringtone.id,
                      segments: smartRingtone.segments,
                      selectedSegmentIds: smartRingtone.selectedSegmentIds,
                      silenceThresholdDb: smartRingtone.silenceThresholdDb,
                      minSilenceDurationMs: smartRingtone.minSilenceDurationMs,
                      smartSourceBlob,
                      isPreparingSegment: segmentPreview.isPreparing,
                      smartPreviewAudioRef: segmentPreview.audioRef,
                      onAnalyze: () => handleAnalyzeExistingSmart(ringtone),
                      onSilenceThresholdChange: smartRingtone.setSilenceThresholdDb,
                      onMinSilenceDurationChange: smartRingtone.setMinSilenceDurationMs,
                      onToggleSegmentSelection: smartRingtone.toggleSegmentSelection,
                      onPlaySegment: segmentPreview.playSegment,
                      onCreateSegmentVersions: () => handleCreateSegmentVersions(ringtone),
                    }}
                    equalizer={{
                      isOpen: isEqualizerOpen,
                      selectedPreset: equalizer.selectedPreset,
                      isAnalyzing: equalizer.isAnalyzing,
                      isProcessing: equalizer.isProcessing,
                      isPreviewing: equalizer.isPreviewing,
                      previewBlob: equalizer.previewBlob,
                      analysisResult: equalizer.analysisResult,
                      onOpen: () => {
                        setEqualizerRingtoneId(ringtone.id);
                        void handleAnalyzeSpectrumForEqualizer(ringtone);
                      },
                      onPresetChange: equalizer.setPreset,
                      onAnalyze: () => handleAnalyzeSpectrumForEqualizer(ringtone),
                      onApply: () => handleApplyEqualizerToExisting(ringtone),
                      onPreview: (preset) => handlePreviewEqualizerForExisting(ringtone, preset),
                    }}
                    actions={{
                      onToggleFavorite: async () => {
                        try {
                          await toggleFavorite(ringtone.id);
                        } catch {
                          // L'erreur est déjà gérée dans le store
                        }
                      },
                      onToggleProtection: () => handleToggleProtection(ringtone),
                      onDownload: (format) => handleDownload(ringtone, format as RingtoneFormat),
                      onShare: () => handleShare(ringtone),
                      onDelete: () => handleDeleteClick(ringtone),
                    }}
                  />
                  </motion.div>
                );
              })}
          </motion.div>
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
