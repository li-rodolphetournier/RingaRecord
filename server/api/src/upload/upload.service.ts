import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UploadService {
  private readonly bucketName = 'ringtones';

  constructor(private supabase: SupabaseService) {}

  async saveFile(file: Express.Multer.File, userId: string): Promise<string> {
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedOriginalName}`;
    const path = `${userId}/${filename}`;

    // Upload vers Supabase Storage
    const { data, error } = await this.supabase.uploadFile(
      this.bucketName,
      path,
      file.buffer,
      {
        contentType: file.mimetype,
      },
    );

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Retourner l'URL publique
    return this.supabase.getPublicUrl(this.bucketName, path);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extraire le path depuis l'URL
    // Format: https://xxxxx.supabase.co/storage/v1/object/public/ringtones/{userId}/{filename}
    const urlParts = fileUrl.split('/ringtones/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid file URL format');
    }

    const path = urlParts[1];
    const { error } = await this.supabase.deleteFile(this.bucketName, path);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
