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
import { execFile } from 'child_process';
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
const execFileAsync = promisify(execFile);

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
   * Resolves the client's hostname from its IP.
   *
   * Strategy: prefer `nslookup` (the Windows-native resolver) over
   * Node's `dns.reverse()`. In some Windows environments Node's
   * resolver returns placeholder names like "GATEWAY" while
   * `nslookup` returns the real PTR record (e.g. "INFOSAT-03").
   * Since this backend always runs on Windows / Windows Server, we
   * trust the native tool.
   *
   * Returns '' if neither path resolves a valid hostname.
   */
  async resolveHostname(ip: string): Promise<string> {
    // Local access: the client and the server are on the same machine.
    if (AuthService.LOCALHOST_IPS.has(ip)) {
      const host = os.hostname().toUpperCase();
      this.logger.debug(`resolveHostname: IP local '${ip}' → os.hostname() = '${host}'`);
      return host;
    }

    // 1) Try Windows-native nslookup first.
    if (process.platform === 'win32') {
      const nslookupResult = await this.resolveViaNslookup(ip);
      if (nslookupResult) {
        this.logger.debug(`resolveHostname: IP '${ip}' → nslookup = '${nslookupResult}'`);
        return nslookupResult;
      }
    }

    // 2) Fallback to Node's dns.reverse (kept for cross-platform safety).
    try {
      const names = await reverseDns(ip);
      if (names.length > 0) {
        const resolved = names[0].split('.')[0].toUpperCase();
        if (
          resolved !== ip &&
          !/^\d+\.\d+\.\d+\.\d+$/.test(resolved) &&
          !INVALID_HOSTNAMES.has(resolved)
        ) {
          this.logger.debug(`resolveHostname: IP '${ip}' → dns.reverse = '${resolved}'`);
          return resolved;
        }
        this.logger.debug(
          `resolveHostname: IP '${ip}' → dns.reverse '${resolved}' rechazado (inválido)`,
        );
      }
    } catch {
      this.logger.debug(`resolveHostname: IP '${ip}' → dns.reverse falló`);
    }

    // No fallback to os.hostname() — that returns the SERVER's name,
    // which is wrong when the server and client are different machines.
    this.logger.warn(
      `resolveHostname: IP '${ip}' → sin hostname válido. El cliente debe setear el PC name manualmente.`,
    );
    return '';
  }

  /**
   * Runs `nslookup <ip>` via the OS native tool (Windows / Windows Server
   * only) and parses the first PTR record from the output. Returns '' on
   * any failure so the caller can fall back to other strategies.
   *
   * Example Windows output (es-PE locale):
   *   Servidor:  SATICA.local
   *   Address:  192.168.3.230
   *
   *   Nombre:  INFOSAT-03.SATICA.local
   *   Address:  192.168.3.244
   */
  private async resolveViaNslookup(ip: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('nslookup', [ip], { timeout: 5000 });
      // Match the "Nombre:" / "Name:" line of the ANSWER section (the
      // second one, after the server's own header). We take the last
      // match to skip the header that may include a server name.
      const matches = [...stdout.matchAll(/^\s*(?:Nombre|Name)\s*:\s*(.+)\s*$/gim)];
      for (let i = matches.length - 1; i >= 0; i--) {
        const raw = matches[i][1].trim();
        // Strip the FQDN suffix to get the bare hostname.
        const host = raw.split('.')[0].toUpperCase();
        if (
          host &&
          host !== ip &&
          !/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
          !INVALID_HOSTNAMES.has(host)
        ) {
          return host;
        }
      }
    } catch (err) {
      this.logger.debug(
        `resolveViaNslookup: nslookup ${ip} falló: ${(err as Error).message}`,
      );
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
