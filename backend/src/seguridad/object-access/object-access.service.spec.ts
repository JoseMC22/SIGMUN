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
    service = new ObjectAccessService(db as any, cache);
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
});
