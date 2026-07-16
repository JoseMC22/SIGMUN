import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { SeguridadModule } from './seguridad/seguridad.module';
import { ImpuestoVehicularModule } from './impuesto-vehicular/impuesto-vehicular.module';
import { FiscalizacionTributariaModule } from './fiscalizacion-tributaria/fiscalizacion-tributaria.module';
import { MantenimientoViasModule } from './administracion-tributaria/mantenimiento-vias/mantenimiento-vias.module';
import { DeclaracionJuradaModule } from './administracion-tributaria/declaracion-jurada/declaracion-jurada.module';
import { ReportesModule } from './reportes-gerenciales/reportes-gerenciales.module';
import { MantenimientoUitModule } from './mantenimiento-tablas/mantenimiento-uit/mantenimiento-uit.module';
import { ConvenioEstadoModule } from './mantenimiento-tablas/mantenimiento-estado-convenios/convenio-estado.module';

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
    // Módulo de seguridad
    SeguridadModule,
    // Módulo de administración tributaria - mantenimiento de vías
    MantenimientoViasModule,
    // Módulo de administración tributaria - declaración jurada
    DeclaracionJuradaModule,
    // Módulo de reportes gerenciales
    ReportesModule,
    // Módulo de impuestos vehicular
    ImpuestoVehicularModule,
    // Módulo de fiscalización tributaria
    FiscalizacionTributariaModule,
    // Módulo de mantenimiento de tablas - UIT
    MantenimientoUitModule,
    // Módulo de mantenimiento - estados de convenio
    ConvenioEstadoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
