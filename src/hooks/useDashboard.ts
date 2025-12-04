import { useEffect, useState, useCallback, useTransition, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useUiStore } from '../stores/uiStore';
import { useRingtoneActions } from './useRingtoneActions';
import { useSmartRingtone } from './useSmartRingtone';
import { useSegmentPreview } from './useSegmentPreview';
import { useEqualizer } from './useEqualizer';
import { useErrorHandler } from './useErrorHandler';
import { useRingtoneOperations } from './useRingtoneOperations';
import type { Ringtone } from '../types/ringtone.types';

/**
 * Hook personnalisé pour gérer toute la logique de la page Dashboard
 * Centralise les états, les handlers et la logique métier
 */
export const useDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const { ringtones, fetchAll, isLoading } = useRingtoneStore();
  const { isFavorite, toggleFavorite, load: loadFavorites } = useFavoritesStore();
  const { showDashboardRingtones, toggleShowDashboardRingtones } = useUiStore();
  const { handleDelete, handleRename, handleDownload, handleToggleProtection } = useRingtoneActions();
  const { handleError, showSuccess, showError } = useErrorHandler();
  const { optimize, applyEqualizer, createSegmentVersions, fetchRingtoneBlob } = useRingtoneOperations();

  // États UI
  const [viewMode, setViewMode] = useState<'block' | 'landscape'>('block');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareRingtone, setShareRingtone] = useState<Ringtone | null>(null);

  // États d'édition
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');

  // États de trim
  const [trimRingtoneId, setTrimRingtoneId] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);

  // États d'optimisation
  const [optimizingId, setOptimizingId] = useState<string | null>(null);

  // États Smart Ringtone
  const [smartSourceBlob, setSmartSourceBlob] = useState<Blob | null>(null);
  const [smartSourceRingtoneId, setSmartSourceRingtoneId] = useState<string | null>(null);

  // États égaliseur
  const [equalizerRingtoneId, setEqualizerRingtoneId] = useState<string | null>(null);
  const [equalizerSourceBlob, setEqualizerSourceBlob] = useState<Blob | null>(null);

  // Hooks spécialisés
  const smartRingtone = useSmartRingtone();
  const equalizer = useEqualizer();
  const [, startTransition] = useTransition();

  // Stocker les références aux fonctions reset (stables grâce à useCallback)
  // pour éviter les boucles infinies dans les useEffect
  const resetSmartRingtoneRef = useRef(smartRingtone.reset);
  const resetEqualizerRef = useRef(equalizer.reset);
  
  // Mettre à jour les refs (les fonctions sont stables, donc cela ne se produit que rarement)
  resetSmartRingtoneRef.current = smartRingtone.reset;
  resetEqualizerRef.current = equalizer.reset;

  const segmentPreview = useSegmentPreview({
    segments: smartRingtone.segments,
    onError: (message) => {
      showError(message);
    },
  });

  // Initialisation - charger les données en parallèle pour améliorer les performances
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Charger ringtones et favoris en parallèle au lieu de séquentiellement
    void Promise.all([fetchAll(), loadFavorites()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  // Gestion des erreurs de l'égaliseur
  useEffect(() => {
    if (equalizer.error) {
      showError(equalizer.error);
    }
  }, [equalizer.error, showError]);

  // Réinitialiser l'assistant Smart lorsqu'on change de sonnerie en mode découpe
  useEffect(() => {
    resetSmartRingtoneRef.current();
    setSmartSourceBlob(null);
    setSmartSourceRingtoneId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimRingtoneId]); // Ne dépendre que de trimRingtoneId, la fonction reset est stable (useCallback)

  // Réinitialiser l'égaliseur lorsqu'on change de sonnerie
  useEffect(() => {
    resetEqualizerRef.current();
    setEqualizerSourceBlob(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equalizerRingtoneId]); // Ne dépendre que de equalizerRingtoneId, la fonction reset est stable (useCallback)

  // Handlers de navigation
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Handlers d'édition
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

  // Handlers de trim
  const handleToggleTrim = useCallback(
    (ringtone: Ringtone) => {
      if (trimRingtoneId === ringtone.id) {
        setTrimRingtoneId(null);
      } else {
        setTrimRingtoneId(ringtone.id);
        setTrimStart(0);
        setTrimEnd(ringtone.duration);
      }
    },
    [trimRingtoneId],
  );

  // Handler d'optimisation
  const handleOptimizeExisting = useCallback(
    async (ringtone: Ringtone) => {
      try {
        startTransition(() => {
          setOptimizingId(ringtone.id);
        });

        const hasManualTrim = trimRingtoneId === ringtone.id && ringtone.duration > 1;
        await optimize(ringtone, {
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
    async (ringtone: Ringtone) => {
      try {
        setSmartSourceRingtoneId(ringtone.id);
        const originalBlob = await fetchRingtoneBlob(
          ringtone,
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
    async (ringtone: Ringtone) => {
      if (!smartSourceBlob || smartSourceRingtoneId !== ringtone.id) {
        showError('Analyse des segments requise avant la création par parties');
        return;
      }

      try {
        await createSegmentVersions(
          ringtone,
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
    async (ringtone: Ringtone) => {
      try {
        setEqualizerRingtoneId(ringtone.id);
        const originalBlob = await fetchRingtoneBlob(
          ringtone,
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
    async (ringtone: Ringtone) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== ringtone.id) {
        showError('Analyse spectrale requise avant l\'application de l\'égaliseur');
        return;
      }

      try {
        await applyEqualizer(ringtone, equalizerSourceBlob, equalizer.selectedPreset);
      } catch (error) {
        handleError(error, 'application égaliseur');
      }
    },
    [equalizerSourceBlob, equalizerRingtoneId, equalizer.selectedPreset, applyEqualizer, showError, handleError],
  );

  const handlePreviewEqualizerForExisting = useCallback(
    async (ringtone: Ringtone, preset: typeof equalizer.selectedPreset) => {
      if (!equalizerSourceBlob || equalizerRingtoneId !== ringtone.id) {
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
  const handleShare = useCallback((ringtone: Ringtone) => {
    setShareRingtone(ringtone);
    setShareModalOpen(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalOpen(false);
    setShareRingtone(null);
  }, []);

  // Note: handleDeleteClick reste dans le composant car il utilise du JSX avec Button

  return {
    // Navigation
    navigate,
    handleLogout,

    // État
    ringtones,
    isLoading,
    isAuthenticated,
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
  };
};

