import { PrediosUsoService, calculatePaginationParams } from './predios-uso.service';
import { DatabaseService } from '../../database/database.service';
import { SpPredioUsoRow } from './dto/predios-uso.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

// ─────────────────────────────────────────────────────────
// Pure function: calculatePaginationParams — zero mocks
// ─────────────────────────────────────────────────────────
describe('calculatePaginationParams', () => {
  it('page 1, pageSize 15 → start=0, end=15', () => {
    const result = calculatePaginationParams(1, 15);
    expect(result).toEqual({ start: 0, end: 15 });
  });

  it('page 2, pageSize 15 → start=15, end=30', () => {
    const result = calculatePaginationParams(2, 15);
    expect(result).toEqual({ start: 15, end: 30 });
  });

  it('page 1, pageSize 10 → start=0, end=10', () => {
    const result = calculatePaginationParams(1, 10);
    expect(result).toEqual({ start: 0, end: 10 });
  });
});

// ─────────────────────────────────────────────────────────
// PrediosUsoService — mocks DatabaseService
// ─────────────────────────────────────────────────────────
describe('PrediosUsoService', () => {
  let service: PrediosUsoService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>;

  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    db = { executeProcedure: jest.fn() };
    service = new PrediosUsoService(db as unknown as DatabaseService);
  });

  describe('search', () => {
    it('should call SP with @BUSC=1 and all filters when provided', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult<SpPredioUsoRow>([]));

      await service.search({
        codigo: '123',
        anno: 2025,
        uso: 'COMERCIO',
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledTimes(1);
      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Rentas].[Rpt_Rentas_General]',
        expect.objectContaining({
          BUSC: 1,
          CODIGO: '123',
          anno: 2025,
          uso: 'COMERCIO',
        }),
      );
    });

    it('should default anno to current year and pass empty strings when filters omitted', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult<SpPredioUsoRow>([]));

      await service.search({
        page: 1,
        pageSize: 15,
      });

      expect(db.executeProcedure).toHaveBeenCalledWith(
        '[Rentas].[Rpt_Rentas_General]',
        expect.objectContaining({
          BUSC: 1,
          CODIGO: '',
          anno: currentYear,
          uso: '',
        }),
      );
    });

    it('should map SP result SpPredioUsoRow[] to PredioUsoRow[] correctly', async () => {
      const mockRows: SpPredioUsoRow[] = [
        {
          tipo: 'U',
          uso: 'COMERCIO',
          predios: 123,
          condicion: 'UNICOS 100%',
          count: 45,
          anno: 2026,
          id_uso: '001',
          ROW: 1,
        },
        {
          tipo: 'U',
          uso: 'INDUSTRIA',
          predios: 67,
          condicion: 'PREDIAL',
          count: 12,
          anno: 2026,
          id_uso: '002',
          ROW: 2,
        },
      ];

      db.executeProcedure.mockResolvedValue(mockSpResult<SpPredioUsoRow>(mockRows));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        tipo: 'U',
        uso: 'COMERCIO',
        predios: 123,
        condicion: 'UNICOS 100%',
        count: 45,
        anno: 2026,
        id_uso: '001',
      });
      expect(result.data[1]).toEqual({
        tipo: 'U',
        uso: 'INDUSTRIA',
        predios: 67,
        condicion: 'PREDIAL',
        count: 12,
        anno: 2026,
        id_uso: '002',
      });
    });

    it('should apply in-memory pagination: page 2, pageSize 2 returns rows 3-4', async () => {
      const allRows: SpPredioUsoRow[] = Array.from({ length: 10 }, (_, i) => ({
        tipo: 'U',
        uso: `USO_${i + 1}`,
        predios: (i + 1) * 10,
        condicion: 'TEST',
        count: i + 1,
        anno: 2026,
        id_uso: String(i + 1).padStart(3, '0'),
        ROW: i + 1,
      }));

      db.executeProcedure.mockResolvedValue(mockSpResult<SpPredioUsoRow>(allRows));

      const result = await service.search({ page: 2, pageSize: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].uso).toBe('USO_3');
      expect(result.data[1].uso).toBe('USO_4');
      expect(result.total).toBe(10);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(2);
      expect(result.totalPages).toBe(5);
    });

    it('should return empty data and totalPages=0 when SP returns no rows', async () => {
      db.executeProcedure.mockResolvedValue(mockSpResult<SpPredioUsoRow>([]));

      const result = await service.search({ page: 1, pageSize: 15 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle last page with partial data', async () => {
      const allRows: SpPredioUsoRow[] = Array.from({ length: 5 }, (_, i) => ({
        tipo: 'U',
        uso: `USO_${i + 1}`,
        predios: (i + 1) * 10,
        condicion: 'TEST',
        count: i + 1,
        anno: 2026,
        id_uso: String(i + 1).padStart(3, '0'),
        ROW: i + 1,
      }));

      db.executeProcedure.mockResolvedValue(mockSpResult<SpPredioUsoRow>(allRows));

      const result = await service.search({ page: 2, pageSize: 3 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].uso).toBe('USO_4');
      expect(result.data[1].uso).toBe('USO_5');
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(2);
    });
  });
});
