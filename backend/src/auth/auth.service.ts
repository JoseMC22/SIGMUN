import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DatabaseService } from '../database/database.service';
import {
  LoginDto,
  LoginSuccessResponse,
  SpLoginResult,
  JwtPayload,
} from './dto/auth.dto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; response: LoginSuccessResponse }> {
    try {
      const result = await this.db.executeProcedure<SpLoginResult>('[Acceso].[sp_LogOut]', {
        buscar: 1,
        parametro: dto.email,
        password: dto.password,
      });

      const spResult = result.recordset;
      if (!spResult || spResult.length === 0) {
        throw new UnauthorizedException('Usuario o contraseña incorrectos.');
      }

      const userData = spResult[0];
      const payload: JwtPayload = {
        sub: userData.id_usuario,
        username: userData.vlogin,
        name: userData.nombre,
        roles: [userData.nomb_perfil],
        profileId: userData.id_perfil,
        profileName: userData.nomb_perfil,
        areaId: userData.area,
        areaName: userData.nomb_area,
      };

      const accessToken = await this.jwtService.signAsync(payload);
      await this.cacheManager.set(`session:${userData.id_usuario}`, payload, SESSION_TTL_MS);

      this.logger.log(
        `Inicio de sesión exitoso: usuario=${userData.vlogin} | perfil=${userData.nomb_perfil}`,
      );

      return {
        accessToken,
        response: {
          authenticated: true,
          userId: userData.id_usuario,
          email: userData.vlogin,
          sessionExpiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
          message: 'Inicio de sesión exitoso.',
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Error al ejecutar el SP de autenticación', error);
      throw new InternalServerErrorException(
        'Error al conectar con la base de datos. Intente nuevamente.',
      );
    }
  }

  async logout(userId: string, username: string): Promise<void> {
    try {
      await this.cacheManager.del(`session:${userId}`);
      await this.db.executeProcedure('[Acceso].[sp_LogOut]', {
        buscar: 1,
        parametro: username,
        password: '',
      });
      this.logger.log(`Sesión cerrada para el usuario: ${username}`);
    } catch (error) {
      this.logger.error(`Error al cerrar sesión para ${username}`, error);
      throw new InternalServerErrorException('Error al procesar el cierre de sesión.');
    }
  }

  async validateSession(userId: string): Promise<boolean> {
    const session = await this.cacheManager.get(`session:${userId}`);
    return !!session;
  }
}
