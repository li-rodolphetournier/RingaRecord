import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Types pour la base de données
export interface Database {
  public: {
    Tables: {
      ringtones: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          format: string;
          duration: number;
          size_bytes: number;
          file_url: string;
          waveform: Record<string, unknown> | null;
          synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          format: string;
          duration: number;
          size_bytes: number;
          file_url: string;
          waveform?: Record<string, unknown> | null;
          synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          format?: string;
          duration?: number;
          size_bytes?: number;
          file_url?: string;
          waveform?: Record<string, unknown> | null;
          synced_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

