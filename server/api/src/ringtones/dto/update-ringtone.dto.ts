import { IsString, IsOptional } from 'class-validator';

export class UpdateRingtoneDto {
  @IsString()
  @IsOptional()
  title?: string;
}

