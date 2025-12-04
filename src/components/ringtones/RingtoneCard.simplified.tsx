import type { Ringtone } from '../../types/ringtone.types';
import { Card } from '../ui/Card';
import { AudioPlayer } from '../AudioPlayer';
import { RingtoneHeader } from './RingtoneHeader';
import { RingtoneMeta } from './RingtoneMeta';
import { RingtoneActions } from './RingtoneActions';
import { TrimControls } from './TrimControls';
import { ExistingSmartAssistant } from './ExistingSmartAssistant';
import { EqualizerSection } from './EqualizerSection';
import type {
  TrimState,
  TrimCallbacks,
  SmartRingtoneState,
  SmartRingtoneCallbacks,
  EqualizerState,
  EqualizerCallbacks,
  EditingState,
  EditingCallbacks,
} from '../../types/ringtoneCard.types';

/**
 * Props simplifiées pour RingtoneCard avec états regroupés
 */
interface RingtoneCardSimplifiedProps {
  ringtone: Ringtone;
  viewMode: 'block' | 'landscape';
  isFavorite: boolean;
  isOptimizing: boolean;
  // États regroupés (optionnels)
  trimState?: TrimState;
  smartRingtoneState?: SmartRingtoneState;
  equalizerState?: EqualizerState;
  editingState?: EditingState;
  // Callbacks regroupés (optionnels)
  trimCallbacks?: TrimCallbacks;
  smartRingtoneCallbacks?: SmartRingtoneCallbacks;
  equalizerCallbacks?: EqualizerCallbacks;
  editingCallbacks?: EditingCallbacks;
  // Autres callbacks
  onToggleFavorite: () => void;
  onToggleProtection: () => void;
  onDownload: (format?: string) => void;
  onShare: () => void;
  onDelete: () => void;
}

/**
 * Composant RingtoneCard simplifié avec props regroupées
 * Réduit de 39 props à ~15 props en regroupant les états et callbacks
 */
export const RingtoneCardSimplified = ({
  ringtone,
  viewMode,
  isFavorite,
  isOptimizing,
  trimState,
  smartRingtoneState,
  equalizerState,
  editingState,
  trimCallbacks,
  smartRingtoneCallbacks,
  equalizerCallbacks,
  editingCallbacks,
  onToggleFavorite,
  onToggleProtection,
  onDownload,
  onShare,
  onDelete,
}: RingtoneCardSimplifiedProps) => {
  const isTrimOpen = trimState?.isOpen ?? false;
  const isEditing = editingState?.isEditing ?? false;
  const editingValue = editingState?.value ?? '';
  const isEqualizerOpen = equalizerState?.isOpen ?? false;

  return (
    <Card
      className={`hover:shadow-lg transition-shadow overflow-visible ${
        viewMode === 'landscape' ? 'flex flex-row gap-4 p-4' : ''
      }`}
    >
      {viewMode === 'landscape' ? (
        <>
          {/* Mode paysage : Player à gauche, infos à droite */}
          <div className="flex-shrink-0 w-48">
            <AudioPlayer src={ringtone.fileUrl} title="Écouter" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
              <RingtoneHeader
                title={ringtone.title}
                isFavorite={isFavorite}
                isProtected={ringtone.isProtected}
                isEditing={isEditing}
                editingValue={editingValue}
                onToggleFavorite={onToggleFavorite}
                onToggleProtection={onToggleProtection}
                onStartRename={editingCallbacks?.onStartRename ?? (() => {})}
                onCancelRename={editingCallbacks?.onCancelRename ?? (() => {})}
                onConfirmRename={editingCallbacks?.onConfirmRename ?? (() => {})}
                onEditingValueChange={editingCallbacks?.onEditingValueChange ?? (() => {})}
                viewMode="landscape"
              />
            </div>
            <RingtoneMeta ringtone={ringtone} />
            <div className="mt-4 flex flex-col gap-2">
            <RingtoneActions
              ringtone={ringtone}
              onDownload={onDownload}
              onToggleTrim={trimCallbacks?.onToggleTrim || (() => {})}
              onShare={onShare}
              onDelete={onDelete}
            />

              {isTrimOpen && ringtone.duration > 1 && (
                <div className="space-y-3">
                  {trimState && trimCallbacks && (
                    <TrimControls
                      ringtone={ringtone}
                      trimStart={trimState.start}
                      trimEnd={trimState.end}
                      onTrimStartChange={trimCallbacks.onTrimStartChange}
                      onTrimEndChange={trimCallbacks.onTrimEndChange}
                      onOptimize={trimCallbacks.onOptimizeWithTrim}
                      isOptimizing={isOptimizing}
                    />
                  )}

                  {smartRingtoneState && smartRingtoneCallbacks && (
                    <ExistingSmartAssistant
                      ringtone={ringtone}
                      isAnalyzing={smartRingtoneState.isAnalyzing}
                      segments={smartRingtoneState.segments}
                      selectedSegmentIds={smartRingtoneState.selectedSegmentIds}
                      silenceThresholdDb={smartRingtoneState.silenceThresholdDb}
                      minSilenceDurationMs={smartRingtoneState.minSilenceDurationMs}
                      smartSourceBlob={smartRingtoneState.smartSourceBlob}
                      isPreparingSegment={smartRingtoneState.isPreparingSegment}
                      audioRef={smartRingtoneState.smartPreviewAudioRef}
                      onAnalyze={smartRingtoneCallbacks.onAnalyzeSmart}
                      onSilenceThresholdChange={smartRingtoneCallbacks.onSilenceThresholdChange}
                      onMinSilenceDurationChange={smartRingtoneCallbacks.onMinSilenceDurationChange}
                      onToggleSegmentSelection={smartRingtoneCallbacks.onToggleSegmentSelection}
                      onPlaySegment={smartRingtoneCallbacks.onPlaySegment}
                      onCreateSegmentVersions={smartRingtoneCallbacks.onCreateSegmentVersions}
                    />
                  )}

                  {equalizerState && equalizerCallbacks && (
                    <EqualizerSection
                      isOpen={isEqualizerOpen}
                      selectedPreset={equalizerState.selectedPreset}
                      isAnalyzing={equalizerState.isAnalyzing}
                      isProcessing={equalizerState.isProcessing}
                      isPreviewing={equalizerState.isPreviewing}
                      previewBlob={equalizerState.previewBlob}
                      analysisResult={equalizerState.analysisResult}
                      onOpen={equalizerCallbacks.onOpenEqualizer}
                      onPresetChange={equalizerCallbacks.onPresetChange}
                      onAnalyze={equalizerCallbacks.onAnalyzeSpectrum}
                      onApply={equalizerCallbacks.onApplyEqualizer}
                      onPreview={equalizerCallbacks.onPreviewEqualizer}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mode bloc : layout vertical classique */}
          <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
            <RingtoneHeader
              title={ringtone.title}
              isFavorite={isFavorite}
              isProtected={ringtone.isProtected}
              isEditing={isEditing}
              editingValue={editingValue}
              onToggleFavorite={onToggleFavorite}
              onToggleProtection={onToggleProtection}
              onStartRename={editingCallbacks?.onStartRename ?? (() => {})}
              onCancelRename={editingCallbacks?.onCancelRename ?? (() => {})}
              onConfirmRename={editingCallbacks?.onConfirmRename ?? (() => {})}
              onEditingValueChange={editingCallbacks?.onEditingValueChange ?? (() => {})}
              viewMode="block"
            />
            {!isEditing && editingCallbacks?.onStartRename && (
              <button
                type="button"
                onClick={editingCallbacks.onStartRename}
                className="text-[11px] px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] flex-shrink-0"
              >
                Renommer
              </button>
            )}
          </div>
          <RingtoneMeta ringtone={ringtone} />

          {/* Player audio */}
          <div className="mb-4">
            <AudioPlayer src={ringtone.fileUrl} title="Écouter" />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <RingtoneActions
              ringtone={ringtone}
              onDownload={onDownload}
              onToggleTrim={trimCallbacks?.onToggleTrim || (() => {})}
              onShare={onShare}
              onDelete={onDelete}
            />

            {isTrimOpen && ringtone.duration > 1 && (
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
                {trimState && trimCallbacks && (
                  <TrimControls
                    ringtone={ringtone}
                    trimStart={trimState.start}
                    trimEnd={trimState.end}
                    onTrimStartChange={trimCallbacks.onTrimStartChange}
                    onTrimEndChange={trimCallbacks.onTrimEndChange}
                    onOptimize={trimCallbacks.onOptimizeWithTrim}
                    isOptimizing={isOptimizing}
                  />
                )}

                {smartRingtoneState && smartRingtoneCallbacks && (
                  <ExistingSmartAssistant
                    ringtone={ringtone}
                    isAnalyzing={smartRingtoneState.isAnalyzing}
                    segments={smartRingtoneState.segments}
                    selectedSegmentIds={smartRingtoneState.selectedSegmentIds}
                    silenceThresholdDb={smartRingtoneState.silenceThresholdDb}
                    minSilenceDurationMs={smartRingtoneState.minSilenceDurationMs}
                    smartSourceBlob={smartRingtoneState.smartSourceBlob}
                    isPreparingSegment={smartRingtoneState.isPreparingSegment}
                    audioRef={smartRingtoneState.smartPreviewAudioRef}
                    onAnalyze={smartRingtoneCallbacks.onAnalyzeSmart}
                    onSilenceThresholdChange={smartRingtoneCallbacks.onSilenceThresholdChange}
                    onMinSilenceDurationChange={smartRingtoneCallbacks.onMinSilenceDurationChange}
                    onToggleSegmentSelection={smartRingtoneCallbacks.onToggleSegmentSelection}
                    onPlaySegment={smartRingtoneCallbacks.onPlaySegment}
                    onCreateSegmentVersions={smartRingtoneCallbacks.onCreateSegmentVersions}
                  />
                )}

                {equalizerState && equalizerCallbacks && (
                  <EqualizerSection
                    isOpen={isEqualizerOpen}
                    selectedPreset={equalizerState.selectedPreset}
                    isAnalyzing={equalizerState.isAnalyzing}
                    isProcessing={equalizerState.isProcessing}
                    isPreviewing={equalizerState.isPreviewing}
                    previewBlob={equalizerState.previewBlob}
                    analysisResult={equalizerState.analysisResult}
                    onOpen={equalizerCallbacks.onOpenEqualizer}
                    onPresetChange={equalizerCallbacks.onPresetChange}
                    onAnalyze={equalizerCallbacks.onAnalyzeSpectrum}
                    onApply={equalizerCallbacks.onApplyEqualizer}
                    onPreview={equalizerCallbacks.onPreviewEqualizer}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

