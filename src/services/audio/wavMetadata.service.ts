/**
 * Service pour lire les métadonnées LIST/INFO des fichiers WAV
 */

export interface WavMetadata {
  copyright?: string;
  software?: string;
  artist?: string;
  title?: string;
  [key: string]: string | undefined;
}

/**
 * Mapping des IDs de champs INFO vers noms lisibles
 */
const FIELD_NAMES: Record<string, string> = {
  ICOP: 'copyright',
  ISFT: 'software',
  IART: 'artist',
  INAM: 'title',
  IPRD: 'product',
  ICRD: 'creationDate',
  ITRK: 'track',
  IGNR: 'genre',
  ICNT: 'country',
  IENG: 'engineer',
  ITCH: 'technician',
};

/**
 * Lit les métadonnées LIST/INFO d'un fichier WAV
 * @param blob - Le fichier WAV en tant que Blob
 * @returns Un objet contenant les métadonnées trouvées
 */
export async function readWavMetadata(blob: Blob): Promise<WavMetadata> {
  const arrayBuffer = await blob.arrayBuffer();
  const view = new DataView(arrayBuffer);

  // Vérifier que c'est un fichier RIFF/WAVE
  const riffHeader = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (riffHeader !== 'RIFF') {
    throw new Error('Fichier non valide : en-tête RIFF manquant');
  }

  const waveHeader = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11),
  );
  if (waveHeader !== 'WAVE') {
    throw new Error('Fichier non valide : en-tête WAVE manquant');
  }

  const metadata: WavMetadata = {};

  // Chercher le chunk LIST
  let offset = 12; // Après RIFF header

  while (offset < arrayBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );

    if (chunkId === 'LIST') {
      const chunkSize = view.getUint32(offset + 4, true);
      const listType = String.fromCharCode(
        view.getUint8(offset + 8),
        view.getUint8(offset + 9),
        view.getUint8(offset + 10),
        view.getUint8(offset + 11),
      );

      if (listType === 'INFO') {
        let infoOffset = offset + 12;
        const endOffset = offset + 8 + chunkSize;

        while (infoOffset < endOffset - 8) {
          const fieldId = String.fromCharCode(
            view.getUint8(infoOffset),
            view.getUint8(infoOffset + 1),
            view.getUint8(infoOffset + 2),
            view.getUint8(infoOffset + 3),
          );

          const fieldSize = view.getUint32(infoOffset + 4, true);

          if (fieldSize === 0 || infoOffset + 8 + fieldSize > endOffset) {
            break;
          }

          const fieldData = new Uint8Array(arrayBuffer, infoOffset + 8, fieldSize);
          const fieldValue = new TextDecoder().decode(fieldData).replace(/\0/g, '').trim();

          if (fieldValue) {
            const fieldName = FIELD_NAMES[fieldId] || fieldId.toLowerCase();
            metadata[fieldName] = fieldValue;
          }

          // Passer au champ suivant (avec padding à pair)
          infoOffset += 8 + fieldSize + (fieldSize % 2);
        }
        break;
      }
    }

    // Passer au chunk suivant
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8 + chunkSize + (chunkSize % 2); // Padding à pair
  }

  return metadata;
}

