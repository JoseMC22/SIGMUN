import { NestFactory } from '@nestjs/core';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todos los endpoints
  app.setGlobalPrefix('api');

  // Habilitar cookie-parser para manejar JWT en HttpOnly cookies
  app.use(cookieParser());

  // Habilitar CORS para permitir peticiones desde el frontend Next.js
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  //console.log(`Using FRONTEND_URL=${frontendUrl}`);

  // In development allow local LAN host commonly used for testing HMR from other machines
  const devAllowedHost = process.env.DEV_ALLOWED_ORIGIN ?? 'http://192.168.3.244:3000';
  const corsOrigin = process.env.NODE_ENV === 'production' ? frontendUrl : [frontendUrl, devAllowedHost];

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true, 
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 Servidor SIGMUN corriendo en: http://localhost:${port}/api`);
}
bootstrap();

