import { useMemo } from 'react';

export const formatDuration = (seconds: number): string => {
  return `${seconds}s`;
};

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const useFormatUtils = () => {
  const formatDurationMemo = useMemo(() => formatDuration, []);
  const formatSizeMemo = useMemo(() => formatSize, []);
  const formatTimeMemo = useMemo(() => formatTime, []);

  return {
    formatDuration: formatDurationMemo,
    formatSize: formatSizeMemo,
    formatTime: formatTimeMemo,
  };
};

