import { apiClient } from './client';
import type { Ringtone, CreateRingtoneDto, UpdateRingtoneDto } from '../../types/ringtone.types';

export const ringtonesService = {
  async getAll(): Promise<Ringtone[]> {
    const response = await apiClient.get<Ringtone[]>('/ringtones');
    return response.data;
  },

  async getById(id: string): Promise<Ringtone> {
    const response = await apiClient.get<Ringtone>(`/ringtones/${id}`);
    return response.data;
  },

  async create(dto: CreateRingtoneDto): Promise<Ringtone> {
    const response = await apiClient.post<Ringtone>('/ringtones', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateRingtoneDto): Promise<Ringtone> {
    const response = await apiClient.put<Ringtone>(`/ringtones/${id}`, dto);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(`/ringtones/${id}`);
    return response.data;
  },

  async upload(
    file: File,
    title: string,
    format: string,
    duration: number,
  ): Promise<Ringtone> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('format', format);
    formData.append('duration', duration.toString());

    const response = await apiClient.post<Ringtone>('/ringtones/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

