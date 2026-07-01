import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';

  // Prefijo global para todos los endpoints
  app.setGlobalPrefix('api');

  // Habilitar cookie-parser para manejar JWT en HttpOnly cookies
  app.use(cookieParser());

  if (isProduction) {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
      const forwardedProto = req.headers['x-forwarded-proto'];
      if (req.secure || forwardedProto === 'https') {
        return next();
      }
      const host = req.headers.host;
      if (host) {
        return res.redirect(`https://${host}${req.url}`);
      }
      return next();
    });
  }

  // Habilitar CORS para permitir peticiones desde el frontend Next.js
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  //console.log(`Using FRONTEND_URL=${frontendUrl}`);

  // In development allow LAN hosts commonly used for testing HMR from other machines
  const devAllowedHosts = (process.env.DEV_ALLOWED_ORIGINS ?? 'http://192.168.3.244:3000,http://26.243.170.131:3000').split(',');
  const corsOrigin = process.env.NODE_ENV === 'production' ? frontendUrl : [frontendUrl, ...devAllowedHosts];

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(
    `🚀 Servidor SIGMUN corriendo en: ${isProduction ? `https://localhost:${port}/api` : `http://localhost:${port}/api`}`,
  );
}
bootstrap();
