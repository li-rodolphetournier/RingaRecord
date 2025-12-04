import { useCallback } from 'react';

interface DragPayload {
  ringtoneId: string;
  sourceContainerId: 'root' | string;
}

/**
 * Hook pour gérer le drag & drop des favoris.
 * Centralise la logique de DnD pour éviter la duplication entre racine et dossiers.
 */
export const useFavoritesDnD = () => {
  const encodeDragPayload = useCallback((payload: DragPayload): string => {
    return JSON.stringify(payload);
  }, []);

  const decodeDragPayload = useCallback((raw: string | null): DragPayload | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DragPayload;
      if (!parsed || !parsed.ringtoneId || !parsed.sourceContainerId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const handleItemDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, ringtoneId: string, containerId: 'root' | string) => {
      const payload: DragPayload = { ringtoneId, sourceContainerId: containerId };
      e.dataTransfer.setData('application/json', encodeDragPayload(payload));
      e.dataTransfer.effectAllowed = 'move';
    },
    [encodeDragPayload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return {
    handleItemDragStart,
    handleDragOver,
    decodeDragPayload,
  };
};

