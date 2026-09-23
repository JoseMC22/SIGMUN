/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import {
  PrediosInconsistenciaService,
  TIPO_MSQUERY_MAP,
  GRID_PAGE_SIZE,
  EXPORT_MAX_ROWS,
  TOTAL_MSQUERY,
  resolveMsquery,
  gridRange,
  exportRange,
  resolveRange,
} from './predios-inconsistencia.service';
import { DatabaseService } from '../../database/database.service';
import { PredioInconsistenciaRow } from './predios-inconsistencia.types';
import { SearchInconsistenciaPrediosDto } from './dto/search-inconsistencia-predios.dto';

// Helper: bypass mssql IRecordSet type strictness in mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSpResult<T>(rows: T[]): any {
  return { recordset: rows };
}

const SP = '[Rentas].[sp_inconsistencias]';

describe('PrediosInconsistenciaService', () => {
  let service: PrediosInconsistenciaService;
  let db: jest.Mocked<Pick<DatabaseService, 'executeProcedure' | 'query'>>;

  beforeEach(() => {
    db = { executeProcedure: jest.fn(), query: jest.fn() };
    service = new PrediosInconsistenciaService(
      db as unknown as DatabaseService,
    );
  });

  const baseDto: SearchInconsistenciaPrediosDto = {
    idAcceso: '30.01.01',
    anno: 2026,
    page: 1,
    pageSize: 10,
  };

  // ── resolveMsquery ───────────────────────────────────

  describe('resolveMsquery', () => {
    it.each([
      ['30.01.01', 1],
      ['30.01.02', 3],
      ['30.01.03', 5],
      ['30.01.04', 7],
      ['30.01.05', 9],
    ])('maps idAcceso %s to @msquery %i', (idAcceso, expected) => {
      expect(resolveMsquery(idAcceso)).toBe(expected);
    });

    it('returns undefined for an idAcceso outside the mapping table', () => {
      expect(resolveMsquery('30.01.99')).toBeUndefined();
    });

    it('exposes the five supported access codes in TIPO_MSQUERY_MAP', () => {
      expect(TIPO_MSQUERY_MAP).toEqual({
        '30.01.01': 1,
        '30.01.02': 3,
        '30.01.03': 5,
        '30.01.04': 7,
        '30.01.05': 9,
      });
    });
  });

  // ── rangos de paginación ─────────────────────────────

  describe('gridRange / exportRange / resolveRange', () => {
    it('gridRange(1) is the first page rows 1..10', () => {
      expect(gridRange(1)).toEqual({ inicio: 1, final: 10 });
    });

    it('gridRange(2) is rows 11..20', () => {
      expect(gridRange(2)).toEqual({ inicio: 11, final: 20 });
    });

    it('gridRange(3) is rows 21..30', () => {
      expect(gridRange(3)).toEqual({ inicio: 21, final: 30 });
    });

    it('uses a fixed grid page size of 10', () => {
      expect(GRID_PAGE_SIZE).toBe(10);
    });

    it('exportRange() is the full range 1..EXPORT_MAX_ROWS', () => {
      expect(EXPORT_MAX_ROWS).toBe(100000);
      expect(exportRange()).toEqual({ inicio: 1, final: EXPORT_MAX_ROWS });
    });

    it('resolveRange picks the grid range when pageSize <= 10', () => {
      expect(resolveRange(1, GRID_PAGE_SIZE)).toEqual(gridRange(1));
    });

    it('resolveRange picks the export range when pageSize > 10', () => {
      expect(resolveRange(1, EXPORT_MAX_ROWS)).toEqual(exportRange());
    });
  });

  // ── search ───────────────────────────────────────────

  describe('search', () => {
    it('calls the SP with the mapped @msquery and page range, then the total with @msquery=2', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([{ total: 5 }]));

      await service.search(baseDto);

      expect(db.executeProcedure).toHaveBeenNthCalledWith(1, SP, {
        msquery: 1,
        anno: 2026,
        inicio: 1,
        final: 10,
      });
      expect(db.executeProcedure).toHaveBeenNthCalledWith(2, SP, {
        msquery: TOTAL_MSQUERY,
        anno: 2026,
        inicio: 1,
        final: EXPORT_MAX_ROWS,
      });
    });

    it('maps 30.01.05 to @msquery=9 for the data call', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]));

      await service.search({ ...baseDto, idAcceso: '30.01.05' });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        1,
        SP,
        expect.objectContaining({ msquery: 9 }),
      );
    });

    it('page 2 requests rows 11..20 and keeps the total range page-independent', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([{ total: 100 }]));

      await service.search({ ...baseDto, page: 2 });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(1, SP, {
        msquery: 1,
        anno: 2026,
        inicio: 11,
        final: 20,
      });
      expect(db.executeProcedure).toHaveBeenNthCalledWith(
        2,
        SP,
        expect.objectContaining({
          msquery: TOTAL_MSQUERY,
          anno: 2026,
          inicio: 1,
          final: EXPORT_MAX_ROWS,
        }),
      );
    });

    it('rejects an unmapped idAcceso with BadRequestException and never calls the SP', async () => {
      await expect(
        service.search({ ...baseDto, idAcceso: '30.01.99' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(db.executeProcedure).not.toHaveBeenCalled();
    });

    it('rejects an unmapped idAcceso with the canonical validation_error envelope', async () => {
      await expect(
        service.search({ ...baseDto, idAcceso: '30.99.99' }),
      ).rejects.toMatchObject({
        response: {
          code: 'validation_error',
          message: 'Validation failed',
        },
      });
    });

    it('always computes totalPages = ceil(total / 10), even for an export-sized pageSize', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([{ total: 45 }]));

      const result = await service.search({
        ...baseDto,
        pageSize: EXPORT_MAX_ROWS,
      });

      expect(result.totalPages).toBe(5);
      expect(result.pageSize).toBe(EXPORT_MAX_ROWS);
      expect(result.total).toBe(45);
    });

    it('reads the total positionally (first value of the first record, unknown column name)', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([{ columna_desconocida: 60 }]));

      const result = await service.search(baseDto);

      expect(result.total).toBe(60);
      expect(result.totalPages).toBe(6);
    });

    it('returns empty data and totalPages=0 when the SP returns no rows', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([]));

      const result = await service.search(baseDto);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
    });

    it('maps the 13 result columns including the misspelled direcion', async () => {
      const spRow = {
        codigo: 'C-001',
        nombre: 'JUAN PEREZ',
        cod_pred: 'P-001',
        anexo: 'A-1',
        sub_anexo: 'S-1',
        direcion: 'AV. SIEMPRE VIVA 123',
        uso: 'CASA HABITACION',
        area_terreno: 120.5,
        porcen_propiedad: 100,
        val_total_terreno: 50000,
        val_total_constru: 30000,
        total_autoavaluo: 80000,
        ROW: 1,
      };
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([spRow]))
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]));

      const result = await service.search(baseDto);

      const expected: PredioInconsistenciaRow = {
        codigo: 'C-001',
        nombre: 'JUAN PEREZ',
        cod_pred: 'P-001',
        anexo: 'A-1',
        sub_anexo: 'S-1',
        direcion: 'AV. SIEMPRE VIVA 123',
        uso: 'CASA HABITACION',
        area_terreno: 120.5,
        porcen_propiedad: 100,
        val_total_terreno: 50000,
        val_total_constru: 30000,
        total_autoavaluo: 80000,
        ROW: 1,
      };
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(expected);
    });

    it('is case-insensitive when the SP returns a different column casing', async () => {
      const spRow = {
        CODIGO: 'C-002',
        NOMBRE: 'MARIA',
        COD_PRED: 'P-002',
        DIRECION: 'CALLE 2',
        ROW: 7,
      };
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([spRow]))
        .mockResolvedValueOnce(mockSpResult([{ total: 1 }]));

      const result = await service.search(baseDto);

      expect(result.data[0].codigo).toBe('C-002');
      expect(result.data[0].direcion).toBe('CALLE 2');
      expect(result.data[0].ROW).toBe(7);
    });

    it('uses the export range when pageSize exceeds the grid size', async () => {
      db.executeProcedure
        .mockResolvedValueOnce(mockSpResult([]))
        .mockResolvedValueOnce(mockSpResult([{ total: 0 }]));

      await service.search({ ...baseDto, pageSize: EXPORT_MAX_ROWS });

      expect(db.executeProcedure).toHaveBeenNthCalledWith(1, SP, {
        msquery: 1,
        anno: 2026,
        inicio: 1,
        final: EXPORT_MAX_ROWS,
      });
    });
  });

  // ── getTiposInconsistencia ───────────────────────────

  describe('getTiposInconsistencia', () => {
    it('queries Macceso with static SQL and maps to TipoInconsistenciaOption[]', async () => {
      db.query.mockResolvedValue(
        mockSpResult([
          { id_acceso: '30.01.01', nombre: 'OMISION DE PREDIO' },
          { id_acceso: '30.01.02', nombre: 'SUBVALUACION' },
        ]),
      );

      const result = await service.getTiposInconsistencia();

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id_acceso, nombre FROM Acceso.Macceso WHERE id_acceso LIKE '30.01.%' AND nestado = '3'",
      );
      expect(result).toEqual([
        { id_acceso: '30.01.01', nombre: 'OMISION DE PREDIO' },
        { id_acceso: '30.01.02', nombre: 'SUBVALUACION' },
      ]);
    });

    it('returns an empty array when the query has no rows', async () => {
      db.query.mockResolvedValue(mockSpResult([]));

      expect(await service.getTiposInconsistencia()).toEqual([]);
    });
  });

  // ── getUsosPredio ────────────────────────────────────

  describe('getUsosPredio', () => {
    it('queries TblUsoPredio with static SQL and maps to UsoPredioOption[]', async () => {
      db.query.mockResolvedValue(
        mockSpResult([
          { id_uso: '1', uso: 'CASA HABITACION' },
          { id_uso: '2', uso: 'COMERCIO' },
        ]),
      );

      const result = await service.getUsosPredio();

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id_uso, uso FROM Contenedor.TblUsoPredio WHERE tipo_pred = 1 ORDER BY uso',
      );
      expect(result).toEqual([
        { id_uso: '1', uso: 'CASA HABITACION' },
        { id_uso: '2', uso: 'COMERCIO' },
      ]);
    });

    it('returns an empty array when the query has no rows', async () => {
      db.query.mockResolvedValue(mockSpResult([]));

      expect(await service.getUsosPredio()).toEqual([]);
    });
  });
});
