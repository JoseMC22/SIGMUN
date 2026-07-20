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
      const { accessToken, response: authResponse } =
        await this.authService.login(dto);

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
