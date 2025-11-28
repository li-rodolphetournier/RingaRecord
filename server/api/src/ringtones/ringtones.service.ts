import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateRingtoneDto } from './dto/create-ringtone.dto';
import { UpdateRingtoneDto } from './dto/update-ringtone.dto';

@Injectable()
export class RingtonesService {
  constructor(private supabase: SupabaseService) {}

  async create(userId: string, dto: CreateRingtoneDto) {
    const { data, error } = await this.supabase.createRingtone({
      user_id: userId,
      title: dto.title,
      format: dto.format,
      duration: dto.duration,
      size_bytes: dto.sizeBytes,
      file_url: dto.fileUrl,
      waveform: dto.waveform || undefined,
    });

    if (error) {
      throw new Error(`Failed to create ringtone: ${error.message}`);
    }

    return data;
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase.getRingtonesByUserId(userId);

    if (error) {
      throw new Error(`Failed to fetch ringtones: ${error.message}`);
    }

    return data || [];
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.getRingtoneById(id, userId);

    if (error || !data) {
      throw new NotFoundException(`Ringtone with ID ${id} not found`);
    }

    return data;
  }

  async update(id: string, userId: string, dto: UpdateRingtoneDto) {
    const { data, error } = await this.supabase.updateRingtone(id, userId, dto);

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Ringtone with ID ${id} not found`);
      }
      throw new Error(`Failed to update ringtone: ${error.message}`);
    }

    return data;
  }

  async delete(id: string, userId: string) {
    const { data, error } = await this.supabase.deleteRingtone(id, userId);

    if (error || !data) {
      throw new NotFoundException(`Ringtone with ID ${id} not found`);
    }

    return data;
  }
}
