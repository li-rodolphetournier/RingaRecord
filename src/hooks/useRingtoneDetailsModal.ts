import { useEffect, useState, useCallback, useTransition, useRef } from 'react';
import type { Ringtone } from '../types/ringtone.types';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useRingtoneActions } from './useRingtoneActions';
import { useSmartRingtone } from './useSmartRingtone';
import { useSegmentPreview } from './useSegmentPreview';
import { useEqualizer } from './useEqualizer';
import { useErrorHandler } from './useErrorHandler';
import { useRingtoneOperations } from './useRingtoneOperations';
import type { EqualizerPreset } from '../types/equalizer.types';

/**
 * Hook personnalisé pour gérer toute la logique de RingtoneDetailsModal
 * Centralise les états, les handlers et la logique métier
 */
export const useRingtoneDetailsModal = (ringtone: Ringtone | null) => {
  const { fetchAll } = useRingtoneStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { handleRename, handleDownload, handleToggleProtection } = useRingtoneActions();
  const { handleError, showSuccess, showError } = useErrorHandler();
  const { optimize, applyEqualizer, createSegmentVersions, fetchRingtoneBlob } = useRingtoneOperations();
  const [, startTransition] = useTransition();

  // États UI
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [trimRingtoneId, setTrimRingtoneId] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // États Smart Ringtone
  const [smartSourceBlob, setSmartSourceBlob] = useState<Blob | null>(null);
  const [smartSourceRingtoneId, setSmartSourceRingtoneId] = useState<string | null>(null);

  // États égaliseur
  const [equalizerRingtoneId, setEqualizerRingtoneId] = useState<string | null>(null);
  const [equalizerSourceBlob, setEqualizerSourceBlob] = useState<Blob | null>(null);

  // Hooks spécialisés
  const smartRingtone = useSmartRingtone();
  const equalizer = useEqualizer();

  // Stocker les références aux fonctions reset (stables grâce à useCallback)
  const resetSmartRingtoneRef = useRef(smartRingtone.reset);
  const resetEqualizerRef = useRef(equalizer.reset);
  
  resetSmartRingtoneRef.current = smartRingtone.reset;
  resetEqualizerRef.current = equalizer.reset;

  const segmentPreview = useSegmentPreview({
    segments: smartRingtone.segments,
    onError: (message) => {
      showError(message);
    },
  });

  // Initialiser les valeurs de trim quand la sonnerie change
  useEffect(() => {
    if (ringtone) {
      setTrimStart(0);
      setTrimEnd(ringtone.duration);
    }
  }, [ringtone]);

  // Réinitialiser l'assistant Smart lorsqu'on change de sonnerie en mode découpe
  useEffect(() => {
    if (trimRingtoneId !== ringtone?.id) {
      resetSmartRingtoneRef.current();
      setSmartSourceBlob(null);
      setSmartSourceRingtoneId(null);
    }
  }, [trimRingtoneId, ringtone?.id]);

  // Réinitialiser l'égaliseur lorsqu'on change de sonnerie
  useEffect(() => {
    resetEqualizerRef.current();
    setEqualizerSourceBlob(null);
  }, [equalizerRingtoneId]);

  // Gestion des erreurs de l'égaliseur
  useEffect(() => {
    if (equalizer.error) {
      showError(equalizer.error);
    }
  }, [equalizer.error, showError]);

  // Handlers d'édition
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

  // Handlers de trim
  const handleToggleTrim = useCallback(
    (rt: Ringtone) => {
      if (trimRingtoneId === rt.id) {
        setTrimRingtoneId(null);
      } else {
        setTrimRingtoneId(rt.id);
        setTrimStart(0);
        setTrimEnd(rt.duration);
      }
    },
    [trimRingtoneId],
  );

  // Handler d'optimisation
  const handleOptimizeExisting = useCallback(
    async (rt: Ringtone) => {
      try {
        startTransition(() => {
          setOptimizingId(rt.id);
        });

        const hasManualTrim = trimRingtoneId === rt.id && rt.duration > 1;
        await optimize(rt, {
          trimStart,
          trimEnd,
          hasManualTrim,
        });
      } catch (error) {
        handleError(error, 'optimisation de sonnerie');
      } finally {
        startTransition(() => {
          setOptimizingId(null);
        });
      }
    },
    [trimRingtoneId, trimStart, trimEnd, optimize, handleError],
  );

  // Handler Smart Ringtone
  const handleAnalyzeExistingSmart = useCallback(
    async (rt: Ringtone) => {
      try {
        setSmartSourceRingtoneId(rt.id);
        const originalBlob = await fetchRingtoneBlob(
          rt,
          'Erreur lors du téléchargement de la sonnerie à analyser',
        );
        setSmartSourceBlob(originalBlob);
        await smartRingtone.optimize(originalBlob);
        showSuccess('Analyse des segments terminée ✔️');
      } catch (error) {
        handleError(error, 'analyse des segments');
      }
    },
    [smartRingtone, fetchRingtoneBlob, showSuccess, handleError],
  );

  const handleCreateSegmentVersions = useCallback(
    async (rt: Ringtone) => {
      if (!smartSourceBlob || smartSourceRingtoneId !== rt.id) {
        showError('Analyse des segments requise avant la création par parties');
        return;
      }

      try {
        await createSegmentVersions(
          rt,
          smartSourceBlob,
          smartRingtone.segments,
          smartRingtone.selectedSegmentIds,
        );
      } catch (error) {
        handleError(error, 'création par parties');
      }
    },
    [smartSourceBlob, smartSourceRingtoneId, smartRingtone, createSegmentVersions, showError, handleError],
  );

  // Handlers égaliseur
  const handleAnalyzeSpectrumForEqualizer = useCallback(
    async (rt: Ringtone) => {
      try {
        setEqualizerRingtoneId(rt.id);
        const originalBlob = await fetchRingtoneBlob(
          rt,
          'Erreur lors du téléchargement de la sonnerie à analyser',
        );
        setEqualizerSourceBlob(originalBlob);
        await equalizer.analyzeAndSuggest(originalBlob);
        showSuccess('Analyse spectrale terminée ✔️');
      } catch (error) {
        handleError(error, 'analyse spectrale');
      }
    },
    [equalizer, fetchRingtoneBlob, showSuccess, handleError],
  );

  const handleApplyEqualizerToExisting = useCallback(
    async (rt: Ringtone) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== rt.id) {
        showError('Analyse spectrale requise avant l\'application de l\'égaliseur');
        return;
      }

      try {
        await applyEqualizer(rt, equalizerSourceBlob, equalizer.selectedPreset);
      } catch (error) {
        handleError(error, 'application égaliseur');
      }
    },
    [equalizerSourceBlob, equalizerRingtoneId, equalizer.selectedPreset, applyEqualizer, showError, handleError],
  );

  const handlePreviewEqualizerForExisting = useCallback(
    async (rt: Ringtone, preset: EqualizerPreset) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== rt.id) {
        showError('Analyse spectrale requise avant la prévisualisation');
        return;
      }

      try {
        await equalizer.previewPreset(equalizerSourceBlob, preset);
      } catch (error) {
        // L'erreur est déjà gérée dans le hook equalizer, mais on peut la logger silencieusement
        handleError(error, 'prévisualisation égaliseur', false);
      }
    },
    [equalizerSourceBlob, equalizerRingtoneId, equalizer, showError, handleError],
  );

  // Handlers de partage
  const handleShare = useCallback(() => {
    setShareModalOpen(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  return {
    // États
    optimizingId,
    trimRingtoneId,
    trimStart,
    trimEnd,
    downloadMenuId,
    editingTitleId,
    editingTitleValue,
    shareModalOpen,
    smartSourceBlob,
    smartSourceRingtoneId,
    equalizerRingtoneId,
    equalizerSourceBlob,

    // Setters
    setTrimStart,
    setTrimEnd,
    setDownloadMenuId,
    setEditingTitleValue,
    setEqualizerRingtoneId,

    // Favoris
    isFavorite,
    toggleFavorite,

    // Actions
    handleDownload,
    handleToggleProtection,

    // Édition
    handleStartRename,
    handleCancelRename,
    handleConfirmRename,

    // Trim
    handleToggleTrim,
    handleOptimizeExisting,

    // Smart Ringtone
    smartRingtone,
    segmentPreview,
    handleAnalyzeExistingSmart,
    handleCreateSegmentVersions,

    // Égaliseur
    equalizer,
    handleAnalyzeSpectrumForEqualizer,
    handleApplyEqualizerToExisting,
    handlePreviewEqualizerForExisting,

    // Partage
    handleShare,
    handleCloseShareModal,
  };
};

