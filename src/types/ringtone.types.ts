export interface Ringtone {
  id: string;
  userId: string;
  title: string;
  format: string;
  duration: number;
  sizeBytes: number;
  fileUrl: string;
  waveform?: Record<string, unknown> | null;
  syncedAt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface CreateRingtoneDto {
  title: string;
  format: string;
  duration: number;
  sizeBytes: number;
  fileUrl: string;
  waveform?: Record<string, unknown>;
}

export interface UpdateRingtoneDto {
  title?: string;
}

