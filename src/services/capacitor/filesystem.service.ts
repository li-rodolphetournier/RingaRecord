import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { CapacitorService } from './capacitor.service';

export interface FileWriteOptions {
  path: string;
  data: string | Blob;
  directory?: Directory;
  encoding?: Encoding;
}

export interface FileReadOptions {
  path: string;
  directory?: Directory;
  encoding?: Encoding;
}

export interface FileReadResult {
  data: string;
}

/**
 * Service unifié pour gérer les fichiers sur web et natif
 */
export class FilesystemService {
  /**
   * Écrit un fichier
   */
  static async writeFile(options: FileWriteOptions): Promise<void> {
    if (CapacitorService.isNative()) {
      return this.writeFileNative(options);
    }
    return this.writeFileWeb(options);
  }

  /**
   * Lit un fichier
   */
  static async readFile(options: FileReadOptions): Promise<FileReadResult> {
    if (CapacitorService.isNative()) {
      return this.readFileNative(options);
    }
    return this.readFileWeb(options);
  }

  /**
   * Supprime un fichier
   */
  static async deleteFile(path: string, directory?: Directory): Promise<void> {
    if (CapacitorService.isNative()) {
      await Filesystem.deleteFile({
        path,
        directory: directory || Directory.Data,
      });
    } else {
      // Sur le web, on ne peut pas vraiment supprimer un fichier
      // On peut seulement supprimer de IndexedDB si c'est là qu'il est stocké
      console.warn('File deletion not fully supported on web platform');
    }
  }

  /**
   * Vérifie si un fichier existe
   */
  static async fileExists(path: string, directory?: Directory): Promise<boolean> {
    if (CapacitorService.isNative()) {
      try {
        await Filesystem.stat({
          path,
          directory: directory || Directory.Data,
        });
        return true;
      } catch {
        return false;
      }
    }
    // Sur le web, on vérifie dans IndexedDB ou via fetch
    return false;
  }

  /**
   * Écrit un fichier sur plateforme native
   */
  private static async writeFileNative(options: FileWriteOptions): Promise<void> {
    try {
      let data: string;

      if (options.data instanceof Blob) {
        // Convertir Blob en base64
        data = await this.blobToBase64(options.data);
      } else {
        data = options.data;
      }

      await Filesystem.writeFile({
        path: options.path,
        data,
        directory: options.directory || Directory.Data,
        encoding: options.encoding || Encoding.UTF8,
      });
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  /**
   * Lit un fichier sur plateforme native
   */
  private static async readFileNative(options: FileReadOptions): Promise<FileReadResult> {
    try {
      const result = await Filesystem.readFile({
        path: options.path,
        directory: options.directory || Directory.Data,
        encoding: options.encoding || Encoding.UTF8,
      });
      return { data: result.data as string };
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Écrit un fichier sur le web (téléchargement)
   */
  private static async writeFileWeb(options: FileWriteOptions): Promise<void> {
    try {
      let blob: Blob;

      if (options.data instanceof Blob) {
        blob = options.data;
      } else {
        // Convertir string en Blob
        blob = new Blob([options.data], { type: 'application/octet-stream' });
      }

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = options.path.split('/').pop() || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error writing file on web:', error);
      throw error;
    }
  }

  /**
   * Lit un fichier sur le web (via fetch ou FileReader)
   */
  private static async readFileWeb(options: FileReadOptions): Promise<FileReadResult> {
    try {
      // Sur le web, on essaie de lire depuis une URL
      const response = await fetch(options.path);
      const text = await response.text();
      return { data: text };
    } catch (error) {
      console.error('Error reading file on web:', error);
      throw error;
    }
  }

  /**
   * Convertit un Blob en base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Retirer le préfixe data:...
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Sauvegarde un fichier audio (méthode de convenance)
   */
  static async saveAudioFile(blob: Blob, filename: string): Promise<void> {
    const path = `ringtones/${filename}`;
    await this.writeFile({
      path,
      data: blob,
      directory: CapacitorService.isNative() ? Directory.Data : undefined,
    });
  }

  /**
   * Obtient l'URL d'un fichier pour l'affichage
   */
  static async getFileUrl(path: string, directory?: Directory): Promise<string> {
    if (CapacitorService.isNative()) {
      try {
        const result = await Filesystem.getUri({
          path,
          directory: directory || Directory.Data,
        });
        return result.uri;
      } catch (error) {
        console.error('Error getting file URL:', error);
        throw error;
      }
    }
    // Sur le web, on retourne le chemin tel quel
    return path;
  }
}

