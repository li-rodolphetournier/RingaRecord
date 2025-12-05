import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RecordingControls } from '../components/record/RecordingControls';
import { SmartRingtoneSection } from '../components/record/SmartRingtoneSection';
import { PreviewSection } from '../components/record/PreviewSection';
import { BPMSection } from '../components/record/BPMSection';
import { SaveSection } from '../components/record/SaveSection';
import { Equalizer } from '../components/audio/Equalizer';
import { useRecordPage } from '../hooks/useRecordPage';

/**
 * Page d'enregistrement de sonneries
 * Refactorisée pour utiliser des composants modulaires et un hook personnalisé
 * Suit les best practices React : séparation logique/présentation, composants réutilisables
 */
export const Record = () => {
  const navigate = useNavigate();
  const {
    // États
    title,
    setTitle,
    gain,
    setGain,
    maxDuration,
    setMaxDuration,
    recordingMode,
    setRecordingMode,
    useOptimizedVersion,
    setUseOptimizedVersion,
    useManualTrim,
    setUseManualTrim,
    trimStart,
    setTrimStart,
    trimEnd,
    setTrimEnd,
    lastOriginalBlob,
    activeSegmentId,
    isSegmentPlaying,

    // Hooks
    audioRecorder,
    smartRingtone,
    equalizer,
    loopSync,
    bpmDetection,

    // Handlers
    handleStart,
    handleStop,
    handlePlaySegment,
    handleOptimize,
    handleAnalyzeSpectrum,
    handlePreviewEqualizer,
    handleApplyEqualizer,
    handleDetectBPM,
    handleDetectLoops,
    handleCreateSyncedLoop,
    handleSave,

    // Utilitaires
    isUploading,
    previewAudioRef,
  } = useRecordPage();

  // Créer une URL pour l'élément audio de prévisualisation des segments
  const previewAudioUrl = useMemo(() => {
    if (!lastOriginalBlob) {
      return null;
    }
    return URL.createObjectURL(lastOriginalBlob);
  }, [lastOriginalBlob]);

  // Mettre à jour la source de l'audio quand le blob change
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (audio && previewAudioUrl) {
      audio.src = previewAudioUrl;
      audio.load(); // Recharger pour que les métadonnées soient disponibles
    }

    // Cleanup: révoquer l'URL quand le composant se démonte ou que le blob change
    return () => {
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl, previewAudioRef]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/dashboard')} variant="secondary" className="mb-6">
          ← Retour
        </Button>

        <Card>
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Enregistrer une sonnerie
          </h1>

          <div className="space-y-6">
            {/* Contrôles d'enregistrement */}
            <RecordingControls
              isRecording={audioRecorder.isRecording}
              isPaused={audioRecorder.isPaused}
              duration={audioRecorder.duration}
              title={title}
              gain={gain}
              maxDuration={maxDuration}
              recordingMode={recordingMode}
              onTitleChange={setTitle}
              onGainChange={setGain}
              onMaxDurationChange={setMaxDuration}
              onRecordingModeChange={setRecordingMode}
              onStart={handleStart}
              onStop={handleStop}
              onPause={audioRecorder.pauseRecording}
              onResume={audioRecorder.resumeRecording}
            />

            {/* Assistant Smart Ringtone */}
            {!audioRecorder.isRecording && audioRecorder.duration > 0 && (
              <SmartRingtoneSection
                duration={audioRecorder.duration}
                isOptimizing={smartRingtone.isOptimizing}
                useManualTrim={useManualTrim}
                trimStart={trimStart}
                trimEnd={trimEnd}
                silenceThresholdDb={smartRingtone.silenceThresholdDb}
                minSilenceDurationMs={smartRingtone.minSilenceDurationMs}
                segments={smartRingtone.segments}
                activeSegmentId={activeSegmentId}
                isSegmentPlaying={isSegmentPlaying}
                onOptimize={handleOptimize}
                onToggleManualTrim={setUseManualTrim}
                onTrimStartChange={setTrimStart}
                onTrimEndChange={setTrimEnd}
                onSilenceThresholdChange={smartRingtone.setSilenceThresholdDb}
                onMinSilenceDurationChange={smartRingtone.setMinSilenceDurationMs}
                onPlaySegment={handlePlaySegment}
              />
            )}

            {/* Section Égaliseur Audio */}
            {!audioRecorder.isRecording && audioRecorder.duration > 0 && (
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                <Equalizer
                  selectedPreset={equalizer.selectedPreset}
                  onPresetChange={equalizer.setPreset}
                  onAnalyze={handleAnalyzeSpectrum}
                  onApply={handleApplyEqualizer}
                  onPreview={handlePreviewEqualizer}
                  isAnalyzing={equalizer.isAnalyzing}
                  isProcessing={equalizer.isProcessing}
                  isPreviewing={equalizer.isPreviewing}
                  previewBlob={equalizer.previewBlob}
                  analysisResult={equalizer.analysisResult}
                />
              </div>
            )}

            {/* Section BPM & synchronisation rythmique */}
            <BPMSection
              isDetectingBPM={bpmDetection.isDetecting}
              bpmResult={bpmDetection.result}
              isDetectingLoops={loopSync.isDetecting}
              loopPoints={loopSync.loopPoints}
              selectedLoopPoint={loopSync.selectedLoopPoint}
              isCreatingLoop={loopSync.isCreating}
              onDetectBPM={handleDetectBPM}
              onResetBPM={bpmDetection.reset}
              onDetectLoops={handleDetectLoops}
              onSelectLoopPoint={loopSync.selectLoopPoint}
              onCreateLoop={handleCreateSyncedLoop}
            />

            {/* Prévisualisation */}
            <PreviewSection
              lastOriginalBlob={lastOriginalBlob}
              optimizedBlob={smartRingtone.optimizedBlob}
              equalizedBlob={equalizer.equalizedBlob}
              syncedBlob={loopSync.syncedBlob}
              useOptimizedVersion={useOptimizedVersion}
              onVersionChange={setUseOptimizedVersion}
            />

            {/* Section de sauvegarde */}
            <SaveSection title={title} isUploading={isUploading} onSave={handleSave} />
          </div>
        </Card>
      </div>

      {/* Élément audio caché pour la prévisualisation des segments */}
      {previewAudioUrl && (
        <audio
          ref={previewAudioRef}
          src={previewAudioUrl}
          preload="metadata"
          crossOrigin="anonymous"
          style={{ display: 'none' }}
          onError={(e) => {
            console.warn('Erreur de chargement audio pour segments:', e);
          }}
        />
      )}
    </div>
  );
};

