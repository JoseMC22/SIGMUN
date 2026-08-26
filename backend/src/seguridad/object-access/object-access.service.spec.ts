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
        { busc: 7, id_acceso, operador: username },
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

    it('should write flat keys for each permission on SP result', async () => {
      (cache.get as jest.Mock).mockResolvedValue(null);
      const spRows: SpObjectAccessRow[] = [
        { id_objeto: 'btnGuardar', bacceso: 1 },
        { id_objeto: 'btnEliminar', bacceso: 0 },
      ];
      (db.executeProcedure as jest.Mock).mockResolvedValue(mockSpResult(spRows));

      await service.getPermissions(username, id_acceso);

      expect(cache.set).toHaveBeenCalledWith(
        'access:object:testuser:btnGuardar',
        1,
        1800000,
      );
      expect(cache.set).toHaveBeenCalledWith(
        'access:object:testuser:btnEliminar',
        0,
        1800000,
      );
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

    it('should delete flat keys when submenu cache has permissions', async () => {
      const mockRedis = { publish: jest.fn().mockResolvedValue(1) };
      service = new ObjectAccessService(db as any, cache, mockRedis as any);

      // Simulate submenu cache having permissions
      (cache.get as jest.Mock)
        .mockResolvedValueOnce([
          { id_objeto: 'btnGuardar', bacceso: 1 },
          { id_objeto: 'btnEliminar', bacceso: 0 },
        ]);

      await service.invalidateAndNotify(42, ['alice']);

      // Submenu cache deleted
      expect(cache.del).toHaveBeenCalledWith('access:objects:alice:42');
      // Flat keys deleted
      expect(cache.del).toHaveBeenCalledWith('access:object:alice:btnGuardar');
      expect(cache.del).toHaveBeenCalledWith('access:object:alice:btnEliminar');
    });
  });

  describe('checkObjectAccess', () => {
    const username = 'testuser';
    const id_objeto = 'btnGuardar';
    const id_acceso = 42;
    const flatKey = `access:object:${username}:${id_objeto}`;

    it('should return bacceso from flat cache hit', async () => {
      (cache.get as jest.Mock).mockResolvedValue(1);

      const result = await service.checkObjectAccess(username, id_objeto, id_acceso);

      expect(result).toBe(1);
      expect(cache.get).toHaveBeenCalledWith(flatKey);
      expect(db.executeProcedure).not.toHaveBeenCalled();
    });

    it('should return 0 from flat cache hit when bacceso is 0', async () => {
      (cache.get as jest.Mock).mockResolvedValue(0);

      const result = await service.checkObjectAccess(username, 'btnEliminar', id_acceso);

      expect(result).toBe(0);
    });

    it('should fallback to getPermissions on flat cache miss', async () => {
      // First call: flat key miss
      // Second call: submenu cache miss (inside getPermissions)
      (cache.get as jest.Mock)
        .mockResolvedValueOnce(null)  // flat key miss
        .mockResolvedValueOnce(null); // submenu cache miss
      const spRows: SpObjectAccessRow[] = [
        { id_objeto: 'btnGuardar', bacceso: 1 },
        { id_objeto: 'btnEliminar', bacceso: 0 },
      ];
      (db.executeProcedure as jest.Mock).mockResolvedValue(mockSpResult(spRows));

      const result = await service.checkObjectAccess(username, id_objeto, id_acceso);

      expect(result).toBe(1);
      expect(db.executeProcedure).toHaveBeenCalled();
    });

    it('should return 0 when SP returns no matching object', async () => {
      (cache.get as jest.Mock)
        .mockResolvedValueOnce(null)  // flat key miss
        .mockResolvedValueOnce(null); // submenu cache miss
      const spRows: SpObjectAccessRow[] = [
        { id_objeto: 'btnOtro', bacceso: 1 },
      ];
      (db.executeProcedure as jest.Mock).mockResolvedValue(mockSpResult(spRows));

      const result = await service.checkObjectAccess(username, id_objeto, id_acceso);

      expect(result).toBe(0);
    });
  });
});
