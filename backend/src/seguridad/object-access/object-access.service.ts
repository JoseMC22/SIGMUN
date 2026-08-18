import { Injectable, Logger, InternalServerErrorException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DatabaseService } from '../../database/database.service';
import { ObjectPermission, SpObjectAccessRow } from './dto/object-access.types';

const OBJECT_ACCESS_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class ObjectAccessService {
  private readonly logger = new Logger(ObjectAccessService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPermissions(
    username: string,
    id_acceso: number,
  ): Promise<ObjectPermission[]> {
    const cacheKey = `access:objects:${username}:${id_acceso}`;

    const cached = await this.cacheManager.get<ObjectPermission[]>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.db.executeProcedure<SpObjectAccessRow>(
        '[Acceso].[SP_MAcceso]',
        { busc: 7, id_acceso, username },
      );

      const permissions: ObjectPermission[] = (result.recordset ?? []).map(
        (row) => ({
          id_objeto: row.id_objeto,
          bacceso: row.bacceso as 0 | 1,
        }),
      );

      await this.cacheManager.set(cacheKey, permissions, OBJECT_ACCESS_TTL_MS);
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
}
