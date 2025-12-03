import { useState, useCallback } from 'react';
import { applyEqualizerPresetToBlob } from '../services/audio/equalizer.service';
import { analyzeSpectrumFromBlob } from '../services/audio/spectralAnalysis.service';
import type { SpectralAnalysisResult, EqualizerPreset } from '../types/equalizer.types';

export interface UseEqualizerState {
  isProcessing: boolean;
  isAnalyzing: boolean;
  isPreviewing: boolean;
  equalizedBlob: Blob | null;
  previewBlob: Blob | null;
  durationSeconds: number | null;
  selectedPreset: EqualizerPreset;
  analysisResult: SpectralAnalysisResult | null;
  error: string | null;
}

export interface UseEqualizerReturn extends UseEqualizerState {
  applyPreset: (blob: Blob, preset: EqualizerPreset) => Promise<void>;
  analyzeAndSuggest: (blob: Blob) => Promise<void>;
  previewPreset: (blob: Blob, preset: EqualizerPreset) => Promise<void>;
  setPreset: (preset: EqualizerPreset) => void;
  reset: () => void;
  clearPreview: () => void;
}

export const useEqualizer = (): UseEqualizerReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [equalizedBlob, setEqualizedBlob] = useState<Blob | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<EqualizerPreset>('none');
  const [analysisResult, setAnalysisResult] = useState<SpectralAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = useCallback(async (blob: Blob, preset: EqualizerPreset) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await applyEqualizerPresetToBlob(blob, preset);
      setEqualizedBlob(result.equalizedBlob);
      setDurationSeconds(result.durationSeconds);
      setSelectedPreset(preset);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'application de l'égaliseur";
      setError(message);
      setEqualizedBlob(null);
      setDurationSeconds(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const analyzeAndSuggest = useCallback(async (blob: Blob) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeSpectrumFromBlob(blob);
      setAnalysisResult(result);
      setSelectedPreset(result.suggestedPreset);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'analyse spectrale";
      setError(message);
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const setPreset = useCallback((preset: EqualizerPreset) => {
    setSelectedPreset(preset);
  }, []);

  const previewPreset = useCallback(async (blob: Blob, preset: EqualizerPreset) => {
    if (preset === 'none') {
      setPreviewBlob(null);
      setIsPreviewing(false);
      return;
    }

    setIsPreviewing(true);
    setError(null);

    try {
      const result = await applyEqualizerPresetToBlob(blob, preset);
      setPreviewBlob(result.equalizedBlob);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la prévisualisation de l'égaliseur";
      setError(message);
      setPreviewBlob(null);
    } finally {
      setIsPreviewing(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewBlob(null);
    setIsPreviewing(false);
  }, []);

  const reset = useCallback(() => {
    setEqualizedBlob(null);
    setPreviewBlob(null);
    setDurationSeconds(null);
    setSelectedPreset('none');
    setAnalysisResult(null);
    setError(null);
    setIsPreviewing(false);
  }, []);

  return {
    isProcessing,
    isAnalyzing,
    isPreviewing,
    equalizedBlob,
    previewBlob,
    durationSeconds,
    selectedPreset,
    analysisResult,
    error,
    applyPreset,
    analyzeAndSuggest,
    previewPreset,
    setPreset,
    reset,
    clearPreview,
  };
};

