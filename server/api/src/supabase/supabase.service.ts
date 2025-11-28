import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables');
    }

    // Utiliser Service Role Key pour le backend (bypass RLS si nécessaire)
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  // Méthodes helper pour les opérations courantes
  async getRingtonesByUserId(userId: string) {
    return this.client
      .from('ringtones')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  }

  async getRingtoneById(id: string, userId: string) {
    return this.client
      .from('ringtones')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
  }

  async createRingtone(data: {
    user_id: string;
    title: string;
    format: string;
    duration: number;
    size_bytes: number;
    file_url: string;
    waveform?: Record<string, unknown> | null;
  }) {
    return this.client.from('ringtones').insert(data).select().single();
  }

  async updateRingtone(id: string, userId: string, data: { title?: string }) {
    return this.client
      .from('ringtones')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
  }

  async deleteRingtone(id: string, userId: string) {
    return this.client
      .from('ringtones')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
  }

  // Storage methods
  async uploadFile(bucket: string, path: string, file: Buffer, options?: { contentType?: string }) {
    return this.client.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      upsert: true,
    });
  }

  async deleteFile(bucket: string, path: string) {
    return this.client.storage.from(bucket).remove([path]);
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

