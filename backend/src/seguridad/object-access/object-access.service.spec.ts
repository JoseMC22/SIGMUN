/// <reference types="jest" />

import { ObjectAccessService } from './object-access.service';
import { DatabaseService } from '../../database/database.service';
import { Cache } from 'cache-manager';
import { SpObjectAccessRow } from './dto/object-access.types';

function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

describe('ObjectAccessService', () => {
  let service: ObjectAccessService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;
  let cache: jest.Mocked<Cache>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() } as any;
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;
    const mockRedis = { publish: jest.fn().mockResolvedValue(1) };
    service = new ObjectAccessService(db as any, cache, mockRedis as any);
  });

  describe('getPermissions', () => {
    const username = 'testuser';
    const id_acceso = 42;
    const cacheKey = `access:objects:${username}:${id_acceso}`;

    it('should return cached data on cache hit without calling SP', async () => {
      const cachedPermissions = [
        { id_objeto: 'btnGuardar', bacceso: 1 },
        { id_objeto: 'btnEliminar', bacceso: 0 },
      ];
      (cache.get as jest.Mock).mockResolvedValue(cachedPermissions);

      const result = await service.getPermissions(username, id_acceso);

      expect(result).toEqual(cachedPermissions);
      expect(cache.get).toHaveBeenCalledWith(cacheKey);
      expect(db.executeProcedure).not.toHaveBeenCalled();
    });

    it('should call SP and cache result on cache miss', async () => {
      (cache.get as jest.Mock).mockResolvedValue(null);
      const spRows: SpObjectAccessRow[] = [
        { id_objeto: 'btnGuardar', bacceso: 1 },
        { id_objeto: 'btnEliminar', bacceso: 0 },
        { id_objeto: 'btnEditar', bacceso: 1 },
      ];
      (db.executeProcedure as jest.Mock).mockResolvedValue(mockSpResult(spRows));

      const result = await service.getPermissions(username, id_acceso);

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Acceso].[SP_MAcceso]',
        { busc: 7, id_acceso, username },
      );
      expect(cache.set).toHaveBeenCalledWith(
        cacheKey,
        [
          { id_objeto: 'btnGuardar', bacceso: 1 },
          { id_objeto: 'btnEliminar', bacceso: 0 },
          { id_objeto: 'btnEditar', bacceso: 1 },
        ],
        1800000,
      );
      expect(result).toEqual([
        { id_objeto: 'btnGuardar', bacceso: 1 },
        { id_objeto: 'btnEliminar', bacceso: 0 },
        { id_objeto: 'btnEditar', bacceso: 1 },
      ]);
    });

    it('should return error without caching when SP fails', async () => {
      (cache.get as jest.Mock).mockResolvedValue(null);
      (db.executeProcedure as jest.Mock).mockRejectedValue(
        new Error('SQL connection failed'),
      );

      await expect(
        service.getPermissions(username, id_acceso),
      ).rejects.toThrow('Failed to fetch object permissions');

      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should return empty array when SP returns no rows', async () => {
      (cache.get as jest.Mock).mockResolvedValue(null);
      (db.executeProcedure as jest.Mock).mockResolvedValue(mockSpResult([]));

      const result = await service.getPermissions(username, id_acceso);

      expect(result).toEqual([]);
      expect(cache.set).toHaveBeenCalledWith(cacheKey, [], 1800000);
    });
  });

  describe('invalidateAndNotify', () => {
    const id_acceso = 42;
    const usernames = ['alice', 'bob'];

    it('should delete cache keys for each username', async () => {
      const mockRedis = { publish: jest.fn().mockResolvedValue(1) };
      service = new ObjectAccessService(db as any, cache, mockRedis as any);

      await service.invalidateAndNotify(id_acceso, usernames);

      expect(cache.del).toHaveBeenCalledWith('access:objects:alice:42');
      expect(cache.del).toHaveBeenCalledWith('access:objects:bob:42');
      expect(cache.del).toHaveBeenCalledTimes(2);
    });

    it('should publish invalidation message to Redis for each username', async () => {
      const mockRedis = { publish: jest.fn().mockResolvedValue(1) };
      service = new ObjectAccessService(db as any, cache, mockRedis as any);

      await service.invalidateAndNotify(id_acceso, usernames);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'access:changed:alice',
        JSON.stringify({ id_acceso: 42 }),
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'access:changed:bob',
        JSON.stringify({ id_acceso: 42 }),
      );
      expect(mockRedis.publish).toHaveBeenCalledTimes(2);
    });

    it('should handle empty usernames list gracefully', async () => {
      const mockRedis = { publish: jest.fn().mockResolvedValue(1) };
      service = new ObjectAccessService(db as any, cache, mockRedis as any);

      await service.invalidateAndNotify(id_acceso, []);

      expect(cache.del).not.toHaveBeenCalled();
      expect(mockRedis.publish).not.toHaveBeenCalled();
    });

    it('should still publish even if cache delete fails', async () => {
      const mockRedis = { publish: jest.fn().mockResolvedValue(1) };
      (cache.del as jest.Mock).mockRejectedValue(new Error('Redis down'));
      service = new ObjectAccessService(db as any, cache, mockRedis as any);

      // Should not throw — publish is independent of cache delete
      await service.invalidateAndNotify(id_acceso, ['alice']);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'access:changed:alice',
        JSON.stringify({ id_acceso: 42 }),
      );
    });
  });
});
