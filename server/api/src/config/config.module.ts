import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger .env manuellement AVANT que NestJS ne démarre
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath, override: false });

// S'assurer que DATABASE_URL est dans process.env
if (result.parsed && result.parsed.DATABASE_URL) {
  // Retirer les guillemets si présents
  const cleanUrl = result.parsed.DATABASE_URL.replace(/^["']|["']$/g, '');
  process.env.DATABASE_URL = cleanUrl;
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Ne pas écraser les variables déjà chargées
      ignoreEnvFile: false,
    }),
  ],
})
export class ConfigModule {}

