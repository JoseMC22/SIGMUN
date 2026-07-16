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
import * as dns from 'dns';
import * as os from 'os';
import { promisify } from 'util';
import { DatabaseService } from '../database/database.service';
import {
  LoginDto,
  LoginSuccessResponse,
  SpLoginResult,
  JwtPayload,
} from './dto/auth.dto';

const INACTIVITY_TTL_MS = 20 * 60 * 1000; // 20 minutos sin actividad → sesión expira
const reverseDns = promisify(dns.reverse);

/** Hostnames que NO son nombres reales de PC */
const INVALID_HOSTNAMES = new Set([
  'GATEWAY', 'ROUTER', 'MODEM', 'LOCALHOST', 'UNKNOWN',
  'WORKGROUP', 'MINWINPC', '(UNKNOWN)', '',
]);

/** Datos extendidos de sesión (JWT payload + metadata del cliente) */
export interface SessionData {
  payload: JwtPayload;
  hostname: string;
  ip: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /** IPs que representan acceso local (cliente y servidor en la misma máquina) */
  private static readonly LOCALHOST_IPS = new Set([
    '127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', '',
  ]);

  /**
   * Resuelve el hostname del cliente a partir de su IP.
   * - Si la IP es localhost → usa os.hostname() directamente (el servidor SÍ es la PC del usuario).
   * - Si no, intenta DNS reverse y valida que no sea un nombre genérico.
   * - Si todo falla, retorna string vacío.
   */
  async resolveHostname(ip: string): Promise<string> {
    // Acceso local: el cliente y el servidor están en la misma máquina
    if (AuthService.LOCALHOST_IPS.has(ip)) {
      const host = os.hostname().toUpperCase();
      this.logger.debug(`resolveHostname: IP local '${ip}' → os.hostname() = '${host}'`);
      return host;
    }

    try {
      const names = await reverseDns(ip);
      if (names.length > 0) {
        const resolved = names[0].split('.')[0].toUpperCase();
        if (
          resolved !== ip &&
          !/^\d+\.\d+\.\d+\.\d+$/.test(resolved) &&
          !INVALID_HOSTNAMES.has(resolved)
        ) {
          this.logger.debug(`resolveHostname: IP '${ip}' → reverse DNS = '${resolved}'`);
          return resolved;
        }
        this.logger.debug(`resolveHostname: IP '${ip}' → reverse DNS '${resolved}' rechazado (inválido)`);
      }
    } catch {
      this.logger.debug(`resolveHostname: IP '${ip}' → reverse DNS falló`);
    }

    // Fallback: si reverse DNS no sirvió, intentar con os.hostname()
    const serverHostname = os.hostname().toUpperCase();
    if (!INVALID_HOSTNAMES.has(serverHostname)) {
      this.logger.debug(`resolveHostname: IP '${ip}' → fallback os.hostname() = '${serverHostname}'`);
      return serverHostname;
    }

    return '';
  }

  async login(
    dto: LoginDto,
    clientIp: string,
  ): Promise<{ accessToken: string; response: LoginSuccessResponse }> {
    try {
      const result = await this.db.executeProcedure<SpLoginResult>(
        '[Acceso].[sp_LogOut]',
        {
          buscar: 1,
          parametro: dto.username,
          password: dto.password,
        },
      );

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

      // Resolver hostname del cliente y guardar en sesión extendida
      const hostname = await this.resolveHostname(clientIp);
      const sessionData: SessionData = { payload, hostname, ip: clientIp };

      await this.cacheManager.set(
        `session:${userData.id_usuario}`,
        sessionData,
        INACTIVITY_TTL_MS,
      );

      this.logger.log(
        `Inicio de sesión exitoso: usuario=${userData.vlogin} | perfil=${userData.nomb_perfil}`,
      );

      return {
        accessToken,
        response: {
          authenticated: true,
          user: {
            id: userData.id_usuario,
            username: userData.vlogin,
            name: userData.nombre,
            profileId: userData.id_perfil,
            profileName: userData.nomb_perfil,
            areaId: userData.area,
            areaName: userData.nomb_area,
            isEncargado: userData.cajero,
            isRemoto: userData.remoto,
          },
          sessionExpiresAt: new Date(
            Date.now() + INACTIVITY_TTL_MS,
          ).toISOString(),
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
      throw new InternalServerErrorException(
        'Error al procesar el cierre de sesión.',
      );
    }
  }

  async validateSession(userId: string): Promise<boolean> {
    const session = await this.cacheManager.get(`session:${userId}`);
    if (!session) return false;

    // Sliding expiration: cada request autenticado refresca el TTL a 20min
    await this.cacheManager.set(
      `session:${userId}`,
      session,
      INACTIVITY_TTL_MS,
    );
    return true;
  }

  async getSessionData(userId: string): Promise<SessionData | null> {
    const session = await this.cacheManager.get<SessionData>(`session:${userId}`);
    if (!session) return null;
    // Sliding expiration
    await this.cacheManager.set(`session:${userId}`, session, INACTIVITY_TTL_MS);
    return session;
  }
}
