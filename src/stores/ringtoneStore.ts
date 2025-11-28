import { create } from 'zustand';
import { supabaseRingtonesService } from '../services/supabase/ringtones.service';
import type { Ringtone, CreateRingtoneDto, UpdateRingtoneDto } from '../types/ringtone.types';

interface RingtoneState {
  ringtones: Ringtone[];
  selectedRingtone: Ringtone | null;
  isLoading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  create: (dto: CreateRingtoneDto) => Promise<Ringtone>;
  update: (id: string, dto: UpdateRingtoneDto) => Promise<void>;
  delete: (id: string) => Promise<void>;
  upload: (file: File, title: string, format: string, duration: number) => Promise<Ringtone>;
  clearError: () => void;
  clearSelected: () => void;
}

export const useRingtoneStore = create<RingtoneState>((set) => ({
  ringtones: [],
  selectedRingtone: null,
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const ringtones = await supabaseRingtonesService.getAll();
      set({ ringtones, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch ringtones';
      set({ error: message, isLoading: false });
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const ringtone = await supabaseRingtonesService.getById(id);
      set({ selectedRingtone: ringtone, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch ringtone';
      set({ error: message, isLoading: false });
    }
  },

  create: async (dto: CreateRingtoneDto) => {
    set({ isLoading: true, error: null });
    try {
      const ringtone = await supabaseRingtonesService.create(dto);
      set((state) => ({
        ringtones: [ringtone, ...state.ringtones],
        isLoading: false,
      }));
      return ringtone;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create ringtone';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  update: async (id: string, dto: UpdateRingtoneDto) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await supabaseRingtonesService.update(id, dto);
      set((state: RingtoneState) => ({
        ringtones: state.ringtones.map((r: Ringtone) => (r.id === id ? updated : r)),
        selectedRingtone: state.selectedRingtone?.id === id ? updated : state.selectedRingtone,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update ringtone';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  delete: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await supabaseRingtonesService.delete(id);
      set((state: RingtoneState) => ({
        ringtones: state.ringtones.filter((r: Ringtone) => r.id !== id),
        selectedRingtone: state.selectedRingtone?.id === id ? null : state.selectedRingtone,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete ringtone';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  upload: async (file: File, title: string, format: string, duration: number) => {
    set({ isLoading: true, error: null });
    try {
      const ringtone = await supabaseRingtonesService.upload(file, title, format, duration);
      set((state) => ({
        ringtones: [ringtone, ...state.ringtones],
        isLoading: false,
      }));
      return ringtone;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload ringtone';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearSelected: () => {
    set({ selectedRingtone: null });
  },
}));

