import { optimizeRingtone, type SmartRingtoneSegment } from './smartRingtone.service';

export interface BuiltSegmentRingtone {
  segmentId: number;
  blob: Blob;
  durationSeconds: number;
}

/**
 * Construit une sonnerie optimisée par segment à partir d'un Blob source
 * en utilisant les bornes startSeconds / endSeconds de chaque segment.
 *
 * Cette fonction ne s'occupe que du traitement audio et retourne
 * les Blobs prêts à être utilisés (upload, téléchargement, etc.).
 */
export const buildRingtonesForSegments = async (
  source: Blob,
  segments: SmartRingtoneSegment[],
): Promise<BuiltSegmentRingtone[]> => {
  const results: BuiltSegmentRingtone[] = [];

  // On traite les segments séquentiellement pour rester simple et
  // éviter d'ouvrir trop de contexts audio en parallèle.
  // Si nécessaire, on pourra paralléliser plus tard.
  for (const segment of segments) {
    // On réutilise optimizeRingtone avec une plage manuelle
    const { optimizedBlob, durationSeconds } = await optimizeRingtone(source, {
      manualStartSeconds: segment.startSeconds,
      manualEndSeconds: segment.endSeconds,
    });

    results.push({
      segmentId: segment.id,
      blob: optimizedBlob,
      durationSeconds,
    });
  }

  return results;
};


