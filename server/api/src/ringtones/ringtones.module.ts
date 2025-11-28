import { Module } from '@nestjs/common';
import { RingtonesService } from './ringtones.service';
import { RingtonesController } from './ringtones.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [SupabaseModule, UploadModule],
  providers: [RingtonesService],
  controllers: [RingtonesController],
  exports: [RingtonesService],
})
export class RingtonesModule {}
