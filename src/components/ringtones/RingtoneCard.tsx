import type { Ringtone } from '../../types/ringtone.types';
import type { SmartRingtoneSegment } from '../../services/audio/smartRingtone.service';
import type { EqualizerPreset, SpectralAnalysisResult } from '../../types/equalizer.types';
import { Card } from '../ui/Card';
import { AudioPlayer } from '../AudioPlayer';
import { RingtoneHeader } from './RingtoneHeader';
import { RingtoneMeta } from './RingtoneMeta';
import { RingtoneActions } from './RingtoneActions';
import { TrimControls } from './TrimControls';
import { ExistingSmartAssistant } from './ExistingSmartAssistant';
import { EqualizerSection } from './EqualizerSection';

interface RingtoneCardProps {
  ringtone: Ringtone;
  viewMode: 'block' | 'landscape';
  isFavorite: boolean;
  isEditing: boolean;
  editingValue: string;
  isTrimOpen: boolean;
  trimStart: number;
  trimEnd: number;
  isOptimizing: boolean;
  // Smart Ringtone props
  isSmartAnalyzing: boolean;
  segments: SmartRingtoneSegment[];
  selectedSegmentIds: number[];
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  smartSourceBlob: Blob | null;
  isPreparingSegment: boolean;
  smartPreviewAudioRef: React.RefObject<HTMLAudioElement | null>;
  // Equalizer props
  isEqualizerOpen: boolean;
  selectedPreset: EqualizerPreset | null;
  isAnalyzingSpectrum: boolean;
  isEqualizing: boolean;
  isPreviewingEqualizer: boolean;
  equalizerPreviewBlob: Blob | null;
  analysisResult: SpectralAnalysisResult | null;
  // Callbacks
  onToggleFavorite: () => void;
  onToggleProtection: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onConfirmRename: () => void;
  onEditingValueChange: (value: string) => void;
  onDownload: (format?: string) => void;
  onToggleTrim: () => void;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  onOptimizeWithTrim: () => void;
  onShare: () => void;
  onDelete: () => void;
  // Smart Ringtone callbacks
  onAnalyzeSmart: () => void;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onToggleSegmentSelection: (segmentId: number) => void;
  onPlaySegment: (segmentId: number) => void;
  onCreateSegmentVersions: () => void;
  // Equalizer callbacks
  onOpenEqualizer: () => void;
  onPresetChange: (preset: EqualizerPreset) => void;
  onAnalyzeSpectrum: () => void;
  onApplyEqualizer: () => void;
  onPreviewEqualizer: (preset: EqualizerPreset) => void;
}

export const RingtoneCard = ({
  ringtone,
  viewMode,
  isFavorite,
  isEditing,
  editingValue,
  isTrimOpen,
  trimStart,
  trimEnd,
  isOptimizing,
  isSmartAnalyzing,
  segments,
  selectedSegmentIds,
  silenceThresholdDb,
  minSilenceDurationMs,
  smartSourceBlob,
  isPreparingSegment,
  smartPreviewAudioRef,
  isEqualizerOpen,
  selectedPreset,
  isAnalyzingSpectrum,
  isEqualizing,
  isPreviewingEqualizer,
  equalizerPreviewBlob,
  analysisResult,
  onToggleFavorite,
  onToggleProtection,
  onStartRename,
  onCancelRename,
  onConfirmRename,
  onEditingValueChange,
  onDownload,
  onToggleTrim,
  onTrimStartChange,
  onTrimEndChange,
  onOptimizeWithTrim,
  onShare,
  onDelete,
  onAnalyzeSmart,
  onSilenceThresholdChange,
  onMinSilenceDurationChange,
  onToggleSegmentSelection,
  onPlaySegment,
  onCreateSegmentVersions,
  onOpenEqualizer,
  onPresetChange,
  onAnalyzeSpectrum,
  onApplyEqualizer,
  onPreviewEqualizer,
}: RingtoneCardProps) => {
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
                onStartRename={onStartRename}
                onCancelRename={onCancelRename}
                onConfirmRename={onConfirmRename}
                onEditingValueChange={onEditingValueChange}
                viewMode="landscape"
              />
            </div>
            <RingtoneMeta ringtone={ringtone} />
            <div className="mt-4 flex flex-col gap-2">
              <RingtoneActions
                ringtone={ringtone}
                onDownload={onDownload}
                onToggleTrim={onToggleTrim}
                onShare={onShare}
                onDelete={onDelete}
              />

              {isTrimOpen && ringtone.duration > 1 && (
                <div className="space-y-3">
                  <TrimControls
                    ringtone={ringtone}
                    trimStart={trimStart}
                    trimEnd={trimEnd}
                    onTrimStartChange={onTrimStartChange}
                    onTrimEndChange={onTrimEndChange}
                    onOptimize={onOptimizeWithTrim}
                    isOptimizing={isOptimizing}
                  />

                  <ExistingSmartAssistant
                    ringtone={ringtone}
                    isAnalyzing={isSmartAnalyzing}
                    segments={segments}
                    selectedSegmentIds={selectedSegmentIds}
                    silenceThresholdDb={silenceThresholdDb}
                    minSilenceDurationMs={minSilenceDurationMs}
                    smartSourceBlob={smartSourceBlob}
                    isPreparingSegment={isPreparingSegment}
                    audioRef={smartPreviewAudioRef}
                    onAnalyze={onAnalyzeSmart}
                    onSilenceThresholdChange={onSilenceThresholdChange}
                    onMinSilenceDurationChange={onMinSilenceDurationChange}
                    onToggleSegmentSelection={onToggleSegmentSelection}
                    onPlaySegment={onPlaySegment}
                    onCreateSegmentVersions={onCreateSegmentVersions}
                  />

                  <EqualizerSection
                    isOpen={isEqualizerOpen}
                    selectedPreset={selectedPreset}
                    isAnalyzing={isAnalyzingSpectrum}
                    isProcessing={isEqualizing}
                    isPreviewing={isPreviewingEqualizer}
                    previewBlob={equalizerPreviewBlob}
                    analysisResult={analysisResult}
                    onOpen={onOpenEqualizer}
                    onPresetChange={onPresetChange}
                    onAnalyze={onAnalyzeSpectrum}
                    onApply={onApplyEqualizer}
                    onPreview={onPreviewEqualizer}
                  />
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
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              onConfirmRename={onConfirmRename}
              onEditingValueChange={onEditingValueChange}
              viewMode="block"
            />
            {!isEditing && (
              <button
                type="button"
                onClick={onStartRename}
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
              onToggleTrim={onToggleTrim}
              onShare={onShare}
              onDelete={onDelete}
            />

            {isTrimOpen && ringtone.duration > 1 && (
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
                <TrimControls
                  ringtone={ringtone}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onTrimStartChange={onTrimStartChange}
                  onTrimEndChange={onTrimEndChange}
                  onOptimize={onOptimizeWithTrim}
                  isOptimizing={isOptimizing}
                />

                <ExistingSmartAssistant
                  ringtone={ringtone}
                  isAnalyzing={isSmartAnalyzing}
                  segments={segments}
                  selectedSegmentIds={selectedSegmentIds}
                  silenceThresholdDb={silenceThresholdDb}
                  minSilenceDurationMs={minSilenceDurationMs}
                  smartSourceBlob={smartSourceBlob}
                  isPreparingSegment={isPreparingSegment}
                  audioRef={smartPreviewAudioRef}
                  onAnalyze={onAnalyzeSmart}
                  onSilenceThresholdChange={onSilenceThresholdChange}
                  onMinSilenceDurationChange={onMinSilenceDurationChange}
                  onToggleSegmentSelection={onToggleSegmentSelection}
                  onPlaySegment={onPlaySegment}
                  onCreateSegmentVersions={onCreateSegmentVersions}
                />

                <EqualizerSection
                  isOpen={isEqualizerOpen}
                  selectedPreset={selectedPreset}
                  isAnalyzing={isAnalyzingSpectrum}
                  isProcessing={isEqualizing}
                  isPreviewing={isPreviewingEqualizer}
                  previewBlob={equalizerPreviewBlob}
                  analysisResult={analysisResult}
                  onOpen={onOpenEqualizer}
                  onPresetChange={onPresetChange}
                  onAnalyze={onAnalyzeSpectrum}
                  onApply={onApplyEqualizer}
                  onPreview={onPreviewEqualizer}
                />
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

