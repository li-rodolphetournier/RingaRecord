import type { Ringtone } from './ringtone.types';
import type { SmartRingtoneSegment } from '../services/audio/smartRingtone.service';
import type { EqualizerPreset, SpectralAnalysisResult } from './equalizer.types';

/**
 * État de découpe (trim)
 */
export interface TrimState {
  isOpen: boolean;
  start: number;
  end: number;
}

/**
 * Callbacks pour la découpe
 */
export interface TrimCallbacks {
  onToggleTrim: () => void;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  onOptimizeWithTrim: () => void;
}

/**
 * État Smart Ringtone
 */
export interface SmartRingtoneState {
  isAnalyzing: boolean;
  segments: SmartRingtoneSegment[];
  selectedSegmentIds: number[];
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  smartSourceBlob: Blob | null;
  isPreparingSegment: boolean;
  smartPreviewAudioRef: React.RefObject<HTMLAudioElement | null>;
}

/**
 * Callbacks pour Smart Ringtone
 */
export interface SmartRingtoneCallbacks {
  onAnalyzeSmart: () => void;
  onSilenceThresholdChange: (value: number) => void;
  onMinSilenceDurationChange: (value: number) => void;
  onToggleSegmentSelection: (segmentId: number) => void;
  onPlaySegment: (segmentId: number) => void;
  onCreateSegmentVersions: () => void;
}

/**
 * État de l'égaliseur
 */
export interface EqualizerState {
  isOpen: boolean;
  selectedPreset: EqualizerPreset | null;
  isAnalyzing: boolean;
  isProcessing: boolean;
  isPreviewing: boolean;
  previewBlob: Blob | null;
  analysisResult: SpectralAnalysisResult | null;
}

/**
 * Callbacks pour l'égaliseur
 */
export interface EqualizerCallbacks {
  onOpenEqualizer: () => void;
  onPresetChange: (preset: EqualizerPreset) => void;
  onAnalyzeSpectrum: () => void;
  onApplyEqualizer: () => void;
  onPreviewEqualizer: (preset: EqualizerPreset) => void;
}

/**
 * État d'édition
 */
export interface EditingState {
  isEditing: boolean;
  value: string;
}

/**
 * Callbacks pour l'édition
 */
export interface EditingCallbacks {
  onStartRename: () => void;
  onCancelRename: () => void;
  onConfirmRename: () => void;
  onEditingValueChange: (value: string) => void;
}

/**
 * Props regroupées pour RingtoneCard
 */
export interface RingtoneCardGroupedProps {
  ringtone: Ringtone;
  viewMode: 'block' | 'landscape';
  isFavorite: boolean;
  isOptimizing: boolean;
  // États regroupés
  trimState?: TrimState;
  smartRingtoneState?: SmartRingtoneState;
  equalizerState?: EqualizerState;
  editingState?: EditingState;
  // Callbacks regroupés
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

