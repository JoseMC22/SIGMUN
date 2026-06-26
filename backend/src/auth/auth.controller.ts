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

const reverseDns = promisify(dns.reverse);
const COOKIE_NAME = 'SIGMUN_AUTH';
const SESSION_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' as const : 'lax' as const,
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
        } as AuthErrorResponse);
      }
      throw new BadRequestException({
        authenticated: false,
        errorCode: 'AUTH_CONTRACT_MISMATCH',
        message: 'Datos de entrada inválidos.',
      } as AuthErrorResponse);
    }

    try {
      const { accessToken, response: authResponse } = await this.authService.login(dto);

      response.cookie(COOKIE_NAME, accessToken, getAuthCookieOptions());
      return authResponse;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException({
          authenticated: false,
          errorCode: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        } as AuthErrorResponse);
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
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || 'unknown';
    const ip = rawIp.replace(/^::ffff:/, '');

    let hostname = ip;
    try {
      const names = await reverseDns(ip);
      if (names.length > 0) {
        const resolved = names[0].split('.')[0].toUpperCase();
        // Only use resolved name if it looks like a real hostname (not an IP)
        if (resolved !== ip && !/^\d+\.\d+\.\d+\.\d+$/.test(resolved)) {
          hostname = resolved;
        }
      }
    } catch {
      // DNS reverse lookup failed
    }

    // Fallback: if reverse DNS didn't resolve a real name, use server hostname
    // This covers the case where the client accesses via IP on the same LAN
    // and the server runs on the same machine as the client
    if (hostname === ip) {
      hostname = os.hostname().toUpperCase();
    }

    return { hostname, ip };
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  async session(
    @Request() req: { user: JwtPayload },
  ): Promise<SessionCheckResponse> {
    return {
      authenticated: true,
      user: {
        id: req.user.sub,
        name: req.user.name,
        roles: req.user.roles,
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
