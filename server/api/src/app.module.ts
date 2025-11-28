import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RingtonesModule } from './ringtones/ringtones.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    AuthModule,
    RingtonesModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
