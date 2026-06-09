import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';

@Module({
  imports: [
    // Carga las variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Configuración de Caché (Redis si está disponible, sino memoria)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            store: await redisStore({
              url: redisUrl,
              ttl: 28800000, // 8 horas por defecto
            }),
          };
        }
        // Fallback a memoria si no hay Redis
        return {
          ttl: 28800000,
        };
      },
    }),
    // Módulo global de base de datos
    DatabaseModule,
    // Módulo de autenticación
    AuthModule,
    // Módulo de menú dinámico
    MenuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
