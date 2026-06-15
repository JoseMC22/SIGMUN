import { PerfilesService, calculatePaginationParams } from './perfiles.service';
import { DatabaseService } from '../../database/database.service';
import {
  SpPerfilRow,
  SpPerfilTotal,
} from './dto/perfiles.types';

// Helper: bypass mssql IRecordSet type strictness in mocks
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

// ─────────────────────────────────────────────────────────
// T3: Pagination math (pure function — zero mocks needed)
// ─────────────────────────────────────────────────────────
describe('calculatePaginationParams', () => {
  it('page 1, pageSize 10 → inicio=1, final=10', () => {
    const result = calculatePaginationParams(1, 10);
    expect(result).toEqual({ inicio: 1, final: 10 });
  });

  it('page 2, pageSize 10 → inicio=11, final=20', () => {
    const result = calculatePaginationParams(2, 10);
    expect(result).toEqual({ inicio: 11, final: 20 });
  });

  it('page 1, pageSize 15 → inicio=1, final=15', () => {
    const result = calculatePaginationParams(1, 15);
    expect(result).toEqual({ inicio: 1, final: 15 });
  });
});

// ─────────────────────────────────────────────────────────
// T1, T4, T5: PerfilesService (mocks required)
// ─────────────────────────────────────────────────────────
describe('PerfilesService', () => {
  let service: PerfilesService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new PerfilesService(db as unknown as DatabaseService);
  });

  // ── T1: Service.search() ─────────────────────────────
  describe('search', () => {
    it('should call SP with busc=6 for count and busc=5 with pagination for rows', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpPerfilTotal>([{ total: 45 }]))
        .mockResolvedValueOnce(mockSpResult<SpPerfilRow>([]));

      await service.search({
        nombre: 'ADMIN',
        page: 1,
        pageSize: 10,
      });

      // First call — count query: busc=6, NO inicio/final
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Acceso].[sp_TblPerfil]',
        expect.objectContaining({
          busc: 6,
          nombre: 'ADMIN',
        }),
      );
      const firstCallParams = (db.executeProcedure as jest.Mock).mock.calls[0][1];
      expect(firstCallParams).not.toHaveProperty('inicio');
      expect(firstCallParams).not.toHaveProperty('final');

      // Second call — data query: busc=5, WITH inicio/final
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Acceso].[sp_TblPerfil]',
        expect.objectContaining({
          busc: 5,
          nombre: 'ADMIN',
          inicio: 1,
          final: 10,
        }),
      );
    });

    it('should pass empty strings for all filter params when filters are empty', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpPerfilTotal>([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult<SpPerfilRow>([]));

      await service.search({ codigo: '', nombre: '', estado: '', page: 1, pageSize: 10 });

      const expectedWithEmpty = expect.objectContaining({
        busc: 6,
        id_perfil: '',
        nombre: '',
        nestado: '',
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Acceso].[sp_TblPerfil]',
        expectedWithEmpty,
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Acceso].[sp_TblPerfil]',
        expect.objectContaining({
          busc: 5,
          id_perfil: '',
          nombre: '',
          nest: '',
          inicio: 1,
          final: 10,
        }),
      );
    });

    it('should map SP result SpPerfilRow[] to PerfilRow[] correctly', async () => {
      const mockRows: SpPerfilRow[] = [
        {
          id_perfil: '0000064',
          nombre: 'ADMINISTRACION',
          nestado: '1',
          ROW: 1,
        },
        {
          id_perfil: '0000001',
          nombre: 'SISTEMAS',
          nestado: '0',
          ROW: 2,
        },
      ];

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpPerfilTotal>([{ total: 2 }]))
        .mockResolvedValueOnce(mockSpResult<SpPerfilRow>(mockRows));

      const result = await service.search({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: '0000064',
        nombre: 'ADMINISTRACION',
        estado: 'ACTIVADO',
      });
      expect(result.data[1]).toEqual({
        id: '0000001',
        nombre: 'SISTEMAS',
        estado: 'DESACTIVADO',
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should return totalPages=0 when total is 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpPerfilTotal>([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult<SpPerfilRow>([]));

      const result = await service.search({ page: 1, pageSize: 10 });

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
