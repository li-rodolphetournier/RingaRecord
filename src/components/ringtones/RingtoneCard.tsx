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

/**
 * Props pour la section Trim
 */
export interface TrimProps {
  isOpen: boolean;
  trimStart: number;
  trimEnd: number;
  isOptimizing: boolean;
  onToggle: () => void;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  onOptimize: () => void;
}

/**
 * Props pour la section Smart Ringtone
 */
export interface SmartRingtoneProps {
  isAnalyzing: boolean;
  segments: SmartRingtoneSegment[];
  selectedSegmentIds: number[];
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  smartSourceBlob: Blob | null;
  isPreparingSegment: boolean;
  smartPreviewAudioRef: React.RefObject<HTMLAudioElement | null>;
  onAnalyze: () => void;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onToggleSegmentSelection: (segmentId: number) => void;
  onPlaySegment: (segmentId: number) => void;
  onCreateSegmentVersions: () => void;
}

/**
 * Props pour la section Equalizer
 */
export interface EqualizerProps {
  isOpen: boolean;
  selectedPreset: EqualizerPreset | null;
  isAnalyzing: boolean;
  isProcessing: boolean;
  isPreviewing: boolean;
  previewBlob: Blob | null;
  analysisResult: SpectralAnalysisResult | null;
  onOpen: () => void;
  onPresetChange: (preset: EqualizerPreset) => void;
  onAnalyze: () => void;
  onApply: () => void;
  onPreview: (preset: EqualizerPreset) => void;
}

/**
 * Props pour l'édition
 */
export interface EditingProps {
  isEditing: boolean;
  editingValue: string;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onValueChange: (value: string) => void;
}

/**
 * Props pour les actions de base
 */
export interface BaseActionsProps {
  onToggleFavorite: () => void;
  onToggleProtection: () => void;
  onDownload: (format?: string) => void;
  onShare: () => void;
  onDelete: () => void;
}

interface RingtoneCardProps {
  ringtone: Ringtone;
  viewMode: 'block' | 'landscape';
  isFavorite: boolean;
  editing: EditingProps;
  trim: TrimProps;
  smartRingtone: SmartRingtoneProps;
  equalizer: EqualizerProps;
  actions: BaseActionsProps;
}

export const RingtoneCard = ({
  ringtone,
  viewMode,
  isFavorite,
  editing,
  trim,
  smartRingtone: smartRingtoneProps,
  equalizer: equalizerProps,
  actions,
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
                isEditing={editing.isEditing}
                editingValue={editing.editingValue}
                onToggleFavorite={actions.onToggleFavorite}
                onToggleProtection={actions.onToggleProtection}
                onStartRename={editing.onStart}
                onCancelRename={editing.onCancel}
                onConfirmRename={editing.onConfirm}
                onEditingValueChange={editing.onValueChange}
                viewMode="landscape"
              />
            </div>
            <RingtoneMeta ringtone={ringtone} />
            <div className="mt-4 flex flex-col gap-2">
              <RingtoneActions
                ringtone={ringtone}
                onDownload={actions.onDownload}
                onToggleTrim={trim.onToggle}
                onShare={actions.onShare}
                onDelete={actions.onDelete}
              />

              {trim.isOpen && ringtone.duration > 1 && (
                <div className="space-y-3">
                  <TrimControls
                    ringtone={ringtone}
                    trimStart={trim.trimStart}
                    trimEnd={trim.trimEnd}
                    onTrimStartChange={trim.onTrimStartChange}
                    onTrimEndChange={trim.onTrimEndChange}
                    onOptimize={trim.onOptimize}
                    isOptimizing={trim.isOptimizing}
                  />

                  <ExistingSmartAssistant
                    ringtone={ringtone}
                    isAnalyzing={smartRingtoneProps.isAnalyzing}
                    segments={smartRingtoneProps.segments}
                    selectedSegmentIds={smartRingtoneProps.selectedSegmentIds}
                    silenceThresholdDb={smartRingtoneProps.silenceThresholdDb}
                    minSilenceDurationMs={smartRingtoneProps.minSilenceDurationMs}
                    smartSourceBlob={smartRingtoneProps.smartSourceBlob}
                    isPreparingSegment={smartRingtoneProps.isPreparingSegment}
                    audioRef={smartRingtoneProps.smartPreviewAudioRef}
                    onAnalyze={smartRingtoneProps.onAnalyze}
                    onSilenceThresholdChange={smartRingtoneProps.onSilenceThresholdChange}
                    onMinSilenceDurationChange={smartRingtoneProps.onMinSilenceDurationChange}
                    onToggleSegmentSelection={smartRingtoneProps.onToggleSegmentSelection}
                    onPlaySegment={smartRingtoneProps.onPlaySegment}
                    onCreateSegmentVersions={smartRingtoneProps.onCreateSegmentVersions}
                  />

                  <EqualizerSection
                    isOpen={equalizerProps.isOpen}
                    selectedPreset={equalizerProps.selectedPreset}
                    isAnalyzing={equalizerProps.isAnalyzing}
                    isProcessing={equalizerProps.isProcessing}
                    isPreviewing={equalizerProps.isPreviewing}
                    previewBlob={equalizerProps.previewBlob}
                    analysisResult={equalizerProps.analysisResult}
                    onOpen={equalizerProps.onOpen}
                    onPresetChange={equalizerProps.onPresetChange}
                    onAnalyze={equalizerProps.onAnalyze}
                    onApply={equalizerProps.onApply}
                    onPreview={equalizerProps.onPreview}
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
              isEditing={editing.isEditing}
              editingValue={editing.editingValue}
              onToggleFavorite={actions.onToggleFavorite}
              onToggleProtection={actions.onToggleProtection}
              onStartRename={editing.onStart}
              onCancelRename={editing.onCancel}
              onConfirmRename={editing.onConfirm}
              onEditingValueChange={editing.onValueChange}
              viewMode="block"
            />
            {!editing.isEditing && (
              <button
                type="button"
                onClick={editing.onStart}
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
              onDownload={actions.onDownload}
              onToggleTrim={trim.onToggle}
              onShare={actions.onShare}
              onDelete={actions.onDelete}
            />

            {trim.isOpen && ringtone.duration > 1 && (
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white/60 dark:bg-gray-800/60">
                <TrimControls
                  ringtone={ringtone}
                  trimStart={trim.trimStart}
                  trimEnd={trim.trimEnd}
                  onTrimStartChange={trim.onTrimStartChange}
                  onTrimEndChange={trim.onTrimEndChange}
                  onOptimize={trim.onOptimize}
                  isOptimizing={trim.isOptimizing}
                />

                <ExistingSmartAssistant
                  ringtone={ringtone}
                  isAnalyzing={smartRingtoneProps.isAnalyzing}
                  segments={smartRingtoneProps.segments}
                  selectedSegmentIds={smartRingtoneProps.selectedSegmentIds}
                  silenceThresholdDb={smartRingtoneProps.silenceThresholdDb}
                  minSilenceDurationMs={smartRingtoneProps.minSilenceDurationMs}
                  smartSourceBlob={smartRingtoneProps.smartSourceBlob}
                  isPreparingSegment={smartRingtoneProps.isPreparingSegment}
                  audioRef={smartRingtoneProps.smartPreviewAudioRef}
                  onAnalyze={smartRingtoneProps.onAnalyze}
                  onSilenceThresholdChange={smartRingtoneProps.onSilenceThresholdChange}
                  onMinSilenceDurationChange={smartRingtoneProps.onMinSilenceDurationChange}
                  onToggleSegmentSelection={smartRingtoneProps.onToggleSegmentSelection}
                  onPlaySegment={smartRingtoneProps.onPlaySegment}
                  onCreateSegmentVersions={smartRingtoneProps.onCreateSegmentVersions}
                />

                <EqualizerSection
                  isOpen={equalizerProps.isOpen}
                  selectedPreset={equalizerProps.selectedPreset}
                  isAnalyzing={equalizerProps.isAnalyzing}
                  isProcessing={equalizerProps.isProcessing}
                  isPreviewing={equalizerProps.isPreviewing}
                  previewBlob={equalizerProps.previewBlob}
                  analysisResult={equalizerProps.analysisResult}
                  onOpen={equalizerProps.onOpen}
                  onPresetChange={equalizerProps.onPresetChange}
                  onAnalyze={equalizerProps.onAnalyze}
                  onApply={equalizerProps.onApply}
                  onPreview={equalizerProps.onPreview}
                />
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

