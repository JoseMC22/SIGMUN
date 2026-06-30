import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../dto/auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request?.cookies?.SIGMUN_AUTH ||
          request?.cookies?.access_token ||
          null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token inválido.');
    }

    const isSessionValid = await this.authService.validateSession(payload.sub);
    if (!isSessionValid) {
      throw new UnauthorizedException('Sesión expirada o invalidada.');
    }

    return payload;
  }
}
