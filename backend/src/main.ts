import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // FRONTEND_URL non défini (dev local) -> ouvert à tout domaine, pratique
  // pour tester depuis un mobile sur le même réseau. En prod, le définir
  // restreint les requêtes à la seule origine du frontend déployé.
  app.enableCors({ origin: process.env.FRONTEND_URL || true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0'); // écoute sur toutes les interfaces pour être accessible depuis le réseau local (mobile, etc.)
}

bootstrap();
