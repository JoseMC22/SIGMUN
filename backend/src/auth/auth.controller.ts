import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
  Request,
  Get,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as dns from 'dns';
import * as os from 'os';
import { promisify } from 'util';

import { AuthService } from './auth.service';
import {
  LoginDto,
  LoginSuccessResponse,
  LogoutSuccessResponse,
  SessionCheckResponse,
  JwtPayload,
  AuthErrorResponse,
} from './dto/auth.dto';
import { loginRequestSchema } from './schemas';
import { ZodError } from 'zod';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const COOKIE_NAME = 'SIGMUN_AUTH';
const SESSION_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/** Extrae la IP real del cliente desde los headers de proxy o el socket */
function extractClientIp(req: Request & { socket: { remoteAddress?: string } }): string {
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

/** Hostnames que NO son nombres reales de PC */
const INVALID_HOSTNAMES = new Set([
  'GATEWAY', 'ROUTER', 'MODEM', 'LOCALHOST', 'UNKNOWN',
  'WORKGROUP', 'MINWINPC', '(UNKNOWN)', '',
]);

/** IPs que representan acceso local (el cliente y servidor en la misma máquina) */
const LOCALHOST_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', '']);

function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Request() req: Request & { socket: { remoteAddress?: string } },
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginSuccessResponse> {
    let dto: LoginDto;
    try {
      dto = loginRequestSchema.parse(body);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue) => issue.message).join(', ');
        throw new BadRequestException({
          authenticated: false,
          errorCode: 'AUTH_CONTRACT_MISMATCH',
          message: messages,
        });
      }
      throw new BadRequestException({
        authenticated: false,
        errorCode: 'AUTH_CONTRACT_MISMATCH',
        message: 'Datos de entrada inválidos.',
      });
    }

    try {
      const clientIp = extractClientIp(req);
      const { accessToken, response: authResponse } =
        await this.authService.login(dto, clientIp);

      response.cookie(COOKIE_NAME, accessToken, getAuthCookieOptions());
      return authResponse;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException({
          authenticated: false,
          errorCode: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        });
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw error;
    }
  }

  @Get('client-info')
  async clientInfo(
    @Request() req: Request & { socket: { remoteAddress?: string } },
  ): Promise<{ hostname: string; ip: string }> {
    const ip = extractClientIp(req);

    // Acceso local: usar el nombre del servidor directamente
    if (LOCALHOST_IPS.has(ip)) {
      return { hostname: os.hostname().toUpperCase(), ip };
    }

    let hostname = ip;
    try {
      const reverseDnsAsync = promisify(dns.reverse);
      const names = await reverseDnsAsync(ip);
      if (names.length > 0) {
        const resolved = names[0].split('.')[0].toUpperCase();
        if (
          resolved !== ip &&
          !/^\d+\.\d+\.\d+\.\d+$/.test(resolved) &&
          !INVALID_HOSTNAMES.has(resolved)
        ) {
          hostname = resolved;
        }
      }
    } catch {
      // DNS reverse lookup failed
    }

    // Fallback: si reverse DNS no sirvió, usar el nombre del servidor
    if (hostname === ip) {
      const serverHostname = os.hostname().toUpperCase();
      hostname = INVALID_HOSTNAMES.has(serverHostname) ? '' : serverHostname;
    }

    return { hostname, ip };
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  async session(
    @Request() req: { user: JwtPayload },
  ): Promise<SessionCheckResponse> {
    // Leer hostname de la sesión cache (guardado durante login)
    const sessionData = await this.authService.getSessionData(req.user.sub);
    return {
      authenticated: true,
      user: {
        id: req.user.sub,
        name: req.user.name,
        roles: req.user.roles,
        hostname: sessionData?.hostname ?? '',
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: { user: { sub: string; username: string } },
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutSuccessResponse> {
    const { sub, username } = req.user;
    await this.authService.logout(sub, username);

    response.clearCookie(COOKIE_NAME, {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });
    response.clearCookie('access_token', {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });

    return {
      success: true,
      message: 'Sesión cerrada correctamente.',
    };
  }
}
