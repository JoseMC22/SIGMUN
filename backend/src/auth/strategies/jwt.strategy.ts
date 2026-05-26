import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../dto/auth.dto';

/**
 * Estrategia JWT de Passport modificada para extraer el token de una cookie HttpOnly
 * y validar la sesión activa en caché.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      // Extrae el token de la cookie 'access_token'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  /**
   * Valida el payload del token y verifica que la sesión siga activa en caché.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token inválido.');
    }

    // Verificación de seguridad adicional: ¿La sesión existe en la caché?
    // Esto permite invalidar tokens instantáneamente (logout global).
    const isSessionValid = await this.authService.validateSession(payload.sub);
    
    if (!isSessionValid) {
      throw new UnauthorizedException('Sesión expirada o invalidada.');
    }

    return payload;
  }
}
