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
  SpLoginResult,
  JwtPayload,
  LoginResponse,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  /** Logger con el nombre del servicio para trazabilidad en consola */
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Autentica al usuario ejecutando el SP legacy [Acceso].[sp_LogOut].
   * @param dto - Credenciales validadas por Zod
   * @returns Token JWT (para cookie) y datos del usuario autenticado
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; response: LoginResponse }> {
    try {
      // Ejecución del Stored Procedure usando mssql
      const result = await this.db.executeProcedure<SpLoginResult>(
        '[Acceso].[sp_LogOut]',
        {
          buscar: 1,
          parametro: dto.username,
          password: dto.password,
        },
      );

      const spResult = result.recordset;

      // Validamos que el SP haya devuelto al menos un registro
      if (!spResult || spResult.length === 0) {
        throw new UnauthorizedException('Usuario o contraseña incorrectos.');
      }

      const userData = spResult[0];

      // Construimos el payload que irá firmado dentro del JWT (sin password ni datos sensibles)
      const payload: JwtPayload = {
        sub: userData.id_usuario,
        username: userData.vlogin,
        profileId: userData.id_perfil,
        profileName: userData.nomb_perfil,
        areaId: userData.area,
        areaName: userData.nomb_area,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      // Almacenamos la sesión en caché para mayor seguridad (logout global, invalidación)
      // Key: session:<userId>, Value: payload
      await this.cacheManager.set(`session:${userData.id_usuario}`, payload, 28800000); // 8 horas

      this.logger.log(
        `Inicio de sesión exitoso: usuario=${userData.vlogin} | perfil=${userData.nomb_perfil}`,
      );

      // Respuesta estructurada SIN el token (se enviará por cookie)
      return {
        accessToken,
        response: {
          user: {
            id: userData.id_usuario,
            username: userData.vlogin,
            fullName: userData.nombre,
            profileId: userData.id_perfil,
            profileName: userData.nomb_perfil,
            areaId: userData.area,
            areaName: userData.nomb_area,
            isEncargado: userData.encargado,
            isRemoto: userData.remoto,
          },
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

  /**
   * Cierra la sesión del usuario.
   * Invalida la caché y ejecuta el SP [Acceso].[sp_LogOut].
   * @param userId - ID del usuario
   * @param username - Nombre de usuario
   */
  async logout(userId: string, username: string): Promise<void> {
    try {
      // Invalida la sesión en caché
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

  /**
   * Verifica si una sesión es válida en la caché.
   */
  async validateSession(userId: string): Promise<boolean> {
    const session = await this.cacheManager.get(`session:${userId}`);
    return !!session;
  }
}
