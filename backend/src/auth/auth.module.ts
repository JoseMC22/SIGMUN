import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Módulo de autenticación.
 * Registra el JwtModule con la clave secreta y el tiempo de expiración
 * definidos en las variables de entorno del servidor.
 */
@Module({
  imports: [
    // Módulo de Passport con la estrategia por defecto 'jwt'
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Módulo JWT con configuración asíncrona desde variables de entorno
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') as string,
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '8h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Exportamos JwtAuthGuard y PassportModule para uso en otros módulos
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
