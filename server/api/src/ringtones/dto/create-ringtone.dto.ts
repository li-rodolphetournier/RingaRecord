import { IsString, IsInt, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateRingtoneDto {
  @IsString()
  title!: string;

  @IsString()
  format!: string;

  @IsInt()
  @Min(1)
  @Max(40)
  duration!: number;

  @IsNumber()
  @Min(1)
  sizeBytes!: number;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  waveform?: Record<string, unknown>;
}

