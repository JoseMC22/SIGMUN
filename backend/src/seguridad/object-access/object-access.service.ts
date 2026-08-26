import { Injectable, Logger, InternalServerErrorException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { DatabaseService } from '../../database/database.service';
import { ObjectPermission, SpObjectAccessRow } from './dto/object-access.types';

const OBJECT_ACCESS_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class ObjectAccessService {
  private readonly logger = new Logger(ObjectAccessService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS_PUB_CLIENT') private readonly redisPub: Redis | null,
  ) {}

  async getPermissions(
    username: string,
    id_acceso: string | number,
  ): Promise<ObjectPermission[]> {
    const cacheKey = `access:objects:${username}:${id_acceso}`;

    const cached = await this.cacheManager.get<ObjectPermission[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.db.executeProcedure<SpObjectAccessRow>(
        '[Acceso].[SP_MAcceso]',
        { busc: 7, id_acceso, operador: username },
      );

      const permissions: ObjectPermission[] = (result.recordset ?? []).map(
        (row) => ({
          id_objeto: row.id_objeto,
          bacceso: (row.bacceso ? 1 : 0) as 0 | 1,
        }),
      );

      await this.cacheManager.set(cacheKey, permissions, OBJECT_ACCESS_TTL_MS);

      // Write flat keys for single-object lookups (guard fast path)
      await this.writeFlatKeys(username, permissions);

      return permissions;
    } catch (error) {
      this.logger.error(
        `Error fetching object permissions for ${username}, id_acceso=${id_acceso}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch object permissions',
      );
    }
  }

  async invalidateAndNotify(
    id_acceso: string | number,
    usernames: string[],
  ): Promise<void> {
    for (const username of usernames) {
      const cacheKey = `access:objects:${username}:${id_acceso}`;

      // Delete submenu cache + flat keys for this user+acceso
      try {
        // Read permissions BEFORE deleting submenu cache (needed for flat key cleanup)
        const permissions =
          await this.cacheManager.get<ObjectPermission[]>(cacheKey);
        await this.cacheManager.del(cacheKey);
        if (permissions) {
          for (const perm of permissions) {
            const flatKey = `access:object:${username}:${perm.id_objeto}`;
            await this.cacheManager.del(flatKey);
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to delete cache key ${cacheKey}`,
          err,
        );
      }

      const channel = `access:changed:${username}`;
      const payload = JSON.stringify({ id_acceso });
      if (this.redisPub) {
        try {
          await this.redisPub.publish(channel, payload);
        } catch (err) {
          this.logger.error(
            `Failed to publish to ${channel}`,
            err,
          );
        }
      }
    }
  }

  async checkObjectAccess(
    username: string,
    id_objeto: string,
    id_acceso: string | number,
  ): Promise<0 | 1> {
    const flatKey = `access:object:${username}:${id_objeto}`;
    const cached = await this.cacheManager.get<0 | 1>(flatKey);
    if (cached !== null && cached !== undefined) return cached;

    // Cache miss — load all permissions (also writes flat keys)
    const permissions = await this.getPermissions(username, id_acceso);
    const match = permissions.find((p) => p.id_objeto === id_objeto);
    return match?.bacceso ?? 0;
  }

  private async writeFlatKeys(
    username: string,
    permissions: ObjectPermission[],
  ): Promise<void> {
    for (const perm of permissions) {
      const flatKey = `access:object:${username}:${perm.id_objeto}`;
      try {
        await this.cacheManager.set(flatKey, perm.bacceso, OBJECT_ACCESS_TTL_MS);
      } catch (err) {
        this.logger.warn(`Failed to write flat key ${flatKey}`, err);
      }
    }
  }

}
