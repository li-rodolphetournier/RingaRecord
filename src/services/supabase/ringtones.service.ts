import { supabase } from './client';
import type { Ringtone, CreateRingtoneDto, UpdateRingtoneDto } from '../../types/ringtone.types';

export const supabaseRingtonesService = {
  async getAll(): Promise<Ringtone[]> {
    const { data, error } = await supabase
      .from('ringtones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch ringtones: ${error.message}`);
    }

    // Transformer les données pour correspondre au type Ringtone
    return (data || []).map((ringtone) => ({
      id: ringtone.id,
      userId: ringtone.user_id,
      title: ringtone.title,
      format: ringtone.format,
      duration: ringtone.duration,
      sizeBytes: ringtone.size_bytes,
      fileUrl: ringtone.file_url,
      waveform: ringtone.waveform,
      syncedAt: ringtone.synced_at,
      isProtected: ringtone.is_protected ?? false,
      createdAt: ringtone.created_at,
    }));
  },

  async getById(id: string): Promise<Ringtone> {
    const { data, error } = await supabase
      .from('ringtones')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(`Ringtone not found: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      format: data.format,
      duration: data.duration,
      sizeBytes: data.size_bytes,
      fileUrl: data.file_url,
      waveform: data.waveform,
      syncedAt: data.synced_at,
      isProtected: data.is_protected ?? false,
      createdAt: data.created_at,
    };
  },

  async create(dto: CreateRingtoneDto): Promise<Ringtone> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('ringtones')
      .insert({
        user_id: user.id,
        title: dto.title,
        format: dto.format,
        duration: dto.duration,
        size_bytes: dto.sizeBytes,
        file_url: dto.fileUrl,
        waveform: dto.waveform || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create ringtone: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      format: data.format,
      duration: data.duration,
      sizeBytes: data.size_bytes,
      fileUrl: data.file_url,
      waveform: data.waveform,
      syncedAt: data.synced_at,
      isProtected: data.is_protected ?? false,
      createdAt: data.created_at,
    };
  },

  async update(id: string, dto: UpdateRingtoneDto): Promise<Ringtone> {
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }
    if (dto.isProtected !== undefined) {
      updateData.is_protected = dto.isProtected;
    }

    const { data, error } = await supabase
      .from('ringtones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update ringtone: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      format: data.format,
      duration: data.duration,
      sizeBytes: data.size_bytes,
      fileUrl: data.file_url,
      waveform: data.waveform,
      syncedAt: data.synced_at,
      isProtected: data.is_protected ?? false,
      createdAt: data.created_at,
    };
  },

  async delete(id: string): Promise<void> {
    // Vérifier si la sonnerie est protégée avant suppression
    const { data: ringtone, error: fetchError } = await supabase
      .from('ringtones')
      .select('file_url, is_protected')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to find ringtone: ${fetchError.message}`);
    }

    if (ringtone?.is_protected) {
      throw new Error('Cette sonnerie est protégée et ne peut pas être supprimée. Désactivez la protection d\'abord.');
    }

    const fileUrl = ringtone?.file_url as string | undefined;

    // Supprimer le fichier du storage si possible
    if (fileUrl) {
      const storagePath = this.extractStoragePath(fileUrl);
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('ringtones')
          .remove([storagePath]);

        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError.message);
        }
      }
    }

    // Supprimer l'entrée dans la base
    const { error: deleteError } = await supabase
      .from('ringtones')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete ringtone: ${deleteError.message}`);
    }
  },

  extractStoragePath(fileUrl: string): string | null {
    // Format attendu: https://.../storage/v1/object/public/ringtones/{userId}/{filename}
    const parts = fileUrl.split('/ringtones/');
    if (parts.length !== 2) {
      return null;
    }
    return parts[1];
  },

  async upload(file: File, title: string, format: string, duration: number): Promise<Ringtone> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validation de la durée avant l'envoi
    // Les sonneries doivent avoir une durée entre 1 et 40 secondes (selon contrainte DB)
    if (!Number.isFinite(duration) || duration < 1 || duration > 40) {
      throw new Error(`Durée invalide: ${duration}s. La durée doit être entre 1 et 40 secondes.`);
    }

    // S'assurer que la durée est un entier
    const validDuration = Math.round(duration);

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedOriginalName}`;
    const path = `${user.id}/${filename}`;

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ringtones')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from('ringtones').getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    // Créer l'enregistrement dans la base de données avec la durée validée
    return this.create({
      title,
      format,
      duration: validDuration,
      sizeBytes: file.size,
      fileUrl,
    });
  },
};

