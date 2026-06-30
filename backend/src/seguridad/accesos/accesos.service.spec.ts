import { AccesosService, calculatePaginationParams } from './accesos.service';
import { DatabaseService } from '../../database/database.service';
import { SpAccesoRow, SpAccesoTotal } from './dto/accesos.types';

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
// T1, T4, T5: AccesosService (mocks required)
// ─────────────────────────────────────────────────────────
describe('AccesosService', () => {
  let service: AccesosService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new AccesosService(db as unknown as DatabaseService);
  });

  // ── T1: Service.search() ─────────────────────────────
  describe('search', () => {
    it('should call SP with busc=6 for count and busc=5 with pagination for rows', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpAccesoTotal>([{ total: 45 }]))
        .mockResolvedValueOnce(mockSpResult<SpAccesoRow>([]));

      await service.search({
        nombre: 'ADMIN',
        page: 1,
        pageSize: 10,
      });

      // First call — count query: busc=6, NO inicio/final
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Acceso].[SP_MAcceso]',
        expect.objectContaining({
          busc: 6,
          nombre: 'ADMIN',
        }),
      );
      const firstCallParams = (db.executeProcedure as jest.Mock).mock
        .calls[0][1];
      expect(firstCallParams).not.toHaveProperty('inicio');
      expect(firstCallParams).not.toHaveProperty('final');

      // Second call — data query: busc=5, WITH inicio/final
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Acceso].[SP_MAcceso]',
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
        .mockResolvedValueOnce(mockSpResult<SpAccesoTotal>([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult<SpAccesoRow>([]));

      await service.search({
        id_acceso: '',
        nombre: '',
        orden: '',
        menu: '',
        pantalla: '',
        page: 1,
        pageSize: 10,
      });

      const expectedWithEmpty = expect.objectContaining({
        busc: 6,
        id_acceso: '',
        nombre: '',
        orden: '',
        menu: '',
        pantalla: '',
      });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        '[Acceso].[SP_MAcceso]',
        expectedWithEmpty,
      );

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        '[Acceso].[SP_MAcceso]',
        expect.objectContaining({
          busc: 5,
          id_acceso: '',
          nombre: '',
          orden: '',
          menu: '',
          pantalla: '',
          inicio: 1,
          final: 10,
        }),
      );
    });

    it('should map SP result SpAccesoRow[] to AccesoRow[] correctly', async () => {
      const mockRows: SpAccesoRow[] = [
        {
          id_acceso: '01.00.00',
          orden: 'M',
          nombre: 'Administración Tributaria',
          id_objeto: '',
          icono: '',
          doform: '',
          nestado: '1',
          ROW: 1,
        },
        {
          id_acceso: '01.01.01',
          orden: 'O',
          nombre: 'Consulta De Predios',
          id_objeto: '',
          icono: '',
          doform: 'consultapred/index',
          nestado: '0',
          ROW: 2,
        },
      ];

      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpAccesoTotal>([{ total: 2 }]))
        .mockResolvedValueOnce(mockSpResult<SpAccesoRow>(mockRows));

      const result = await service.search({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id_acceso: '01.00.00',
        orden: 'M',
        nombre: 'Administración Tributaria',
        id_objeto: '',
        icono: '',
        doform: '',
        nestado: '1',
      });
      expect(result.data[1]).toEqual({
        id_acceso: '01.01.01',
        orden: 'O',
        nombre: 'Consulta De Predios',
        id_objeto: '',
        icono: '',
        doform: 'consultapred/index',
        nestado: '0',
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should return totalPages=0 when total is 0', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult<SpAccesoTotal>([{ total: 0 }]))
        .mockResolvedValueOnce(mockSpResult<SpAccesoRow>([]));

      const result = await service.search({ page: 1, pageSize: 10 });

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  // ── T4: Service.getMenus() ───────────────────────────
  describe('getMenus', () => {
    it('should call SP with busc=8', async () => {
      const mockRows = [
        { id_acceso: '01', nommenu: 'Catastro' },
        { id_acceso: '02', nommenu: 'Tributaria' },
      ];
      db.executeProcedure.mockResolvedValue(mockSpResult(mockRows));

      const result = await service.getMenus();

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Acceso].[SP_MAcceso]',
        { busc: 8 },
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id_acceso: '01', nommenu: 'Catastro' });
      expect(result[1]).toEqual({ id_acceso: '02', nommenu: 'Tributaria' });
    });

    it('should map result to MenuOption[]', async () => {
      const mockRows = [
        { id_acceso: '01', nommenu: 'Catastro', extra: 'ignored' },
      ];
      db.executeProcedure.mockResolvedValue(mockSpResult(mockRows));

      const result = await service.getMenus();

      expect(result).toEqual([{ id_acceso: '01', nommenu: 'Catastro' }]);
    });
  });

  // ── T5: Service.getModulos() ─────────────────────────
  describe('getModulos', () => {
    it('should call SP with busc=9 and menuId', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult([]));

      await service.getModulos('01');

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Acceso].[SP_MAcceso]',
        { busc: 9, id_acceso: '01' },
      );
    });

    it('should return empty array when menuId is empty (without calling SP)', async () => {
      const result = await service.getModulos('');

      expect(db.executeProcedure).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
