import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, LoginDto, LoginResponse } from './dto/auth.dto';
import { ZodError } from 'zod';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Autentica al usuario y establece una cookie HttpOnly con el JWT.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    // Validación del cuerpo con Zod
    let dto: LoginDto;
    try {
      dto = loginSchema.parse(body);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((issue: { message: string }) => issue.message).join(', ');
        throw new BadRequestException(messages);
      }
      throw new BadRequestException('Datos de entrada inválidos.');
    }

    const { accessToken, response: authResponse } = await this.authService.login(dto);

    // Configuración de la cookie HttpOnly
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'strict', // Previene CSRF
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
      path: '/',
    });

    return authResponse;
  }

  /**
   * POST /auth/logout
   * Limpia la cookie y la sesión en caché.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: { user: { sub: string; username: string } },
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const { sub, username } = req.user;
    
    await this.authService.logout(sub, username);

    // Limpiar la cookie
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Sesión cerrada correctamente.' };
  }
}
