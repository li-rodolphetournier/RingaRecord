import { config } from 'dotenv';
import { resolve } from 'path';

// Charger .env AVANT toute autre chose pour que Prisma puisse le lire
// process.cwd() pointe vers server/api/ quand on lance depuis server/api/
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });
console.log('Loading .env from:', envPath);

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Plus besoin de servir les fichiers statiques localement
  // Les fichiers sont maintenant dans Supabase Storage
  
  // Activer la validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non définies dans le DTO
      forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés non autorisées
      transform: true, // Transforme automatiquement les types
    }),
  );
  
  // Configurer CORS pour le frontend
  app.enableCors({
    origin: 'http://localhost:5173', // URL du frontend Vite
    credentials: true,
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📦 Using Supabase for database and storage`);
}
bootstrap();
