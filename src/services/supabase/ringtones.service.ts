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
      createdAt: data.created_at,
    };
  },

  async update(id: string, dto: UpdateRingtoneDto): Promise<Ringtone> {
    const { data, error } = await supabase
      .from('ringtones')
      .update({
        title: dto.title,
      })
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
      createdAt: data.created_at,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ringtones')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete ringtone: ${error.message}`);
    }
  },

  async upload(file: File, title: string, format: string, duration: number): Promise<Ringtone> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

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

    // Créer l'enregistrement dans la base de données
    return this.create({
      title,
      format,
      duration,
      sizeBytes: file.size,
      fileUrl,
    });
  },
};

