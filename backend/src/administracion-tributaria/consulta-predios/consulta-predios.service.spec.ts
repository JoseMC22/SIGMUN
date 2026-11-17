import { DatabaseService } from '../../database/database.service';
import { SearchConsultaPrediosDto } from './dto/search-consulta-predios.dto';
import { ExportConsultaPrediosDto } from './dto/export-consulta-predios.dto';
import { SpConsultaPrediosRow } from './consulta-predios.types';
import {
  ConsultaPrediosService,
  mapConsultaPredioRow,
} from './consulta-predios.service';

type ExecuteProcedureMock = jest.Mock<
  Promise<unknown>,
  [procedure: string, params: Record<string, unknown>]
>;

describe('ConsultaPrediosService', () => {
  let executeProcedure: ExecuteProcedureMock;
  let service: ConsultaPrediosService;

  const filters = {
    codigo: '0000123',
    codPred: '0101',
    anno: '2026',
    codVia: '12',
    urbBus: 'URB1',
    nro: '45',
    dpto: 'A',
    mza: 'B',
    lte: 'C',
    sublote: 'D',
    page: 1,
    pageSize: 20,
  } satisfies SearchConsultaPrediosDto;

  /** Orden literal del branch @busc=20 del controller legacy. */
  const totalParams = (dto: SearchConsultaPrediosDto): Record<string, unknown> => ({
    '@busc': 20,
    '@anno': dto.anno,
    '@id_via': dto.codVia,
    '@nro': dto.nro,
    '@dpto': dto.dpto,
    '@Mza': dto.mza,
    '@Lte': dto.lte,
    '@SubLte': dto.sublote,
    '@cod_pred': dto.codPred,
    '@codigo': dto.codigo,
    '@cod_urb': dto.urbBus,
  });

  /** Orden literal del branch @busc=19 (@inicio/@final antes de @cod_urb). */
  const rowsParams = (
    dto: SearchConsultaPrediosDto,
    inicio: number,
    final: number,
  ): Record<string, unknown> => ({
    '@busc': 19,
    '@anno': dto.anno,
    '@id_via': dto.codVia,
    '@nro': dto.nro,
    '@dpto': dto.dpto,
    '@Mza': dto.mza,
    '@Lte': dto.lte,
    '@SubLte': dto.sublote,
    '@cod_pred': dto.codPred,
    '@codigo': dto.codigo,
    '@inicio': inicio,
    '@final': final,
    '@cod_urb': dto.urbBus,
  });

  const mockResults = (
    total: readonly (readonly unknown[])[],
    rows: readonly SpConsultaPrediosRow[],
  ): void => {
    executeProcedure
      .mockResolvedValueOnce({ recordset: total })
      .mockResolvedValueOnce({ recordset: rows });
  };

  beforeEach(() => {
    executeProcedure = jest.fn<Promise<unknown>, [string, Record<string, unknown>]>();
    const db = { executeProcedure } as unknown as DatabaseService;
    service = new ConsultaPrediosService(db);
  });

  describe('search', () => {
    it('invokes @busc=20 first with the 10 filters in legacy parameter order', async () => {
      mockResults([[0]], []);

      await service.search(filters);

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Rentas.sp_Mcontribuyente',
        totalParams(filters),
      );
      expect(Object.keys(executeProcedure.mock.calls[0][1])).toEqual([
        '@busc',
        '@anno',
        '@id_via',
        '@nro',
        '@dpto',
        '@Mza',
        '@Lte',
        '@SubLte',
        '@cod_pred',
        '@codigo',
        '@cod_urb',
      ]);
    });

    it('invokes @busc=19 with @inicio/@final inserted before @cod_urb', async () => {
      mockResults([[1]], []);

      await service.search(filters);

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Rentas.sp_Mcontribuyente',
        rowsParams(filters, 1, 20),
      );
      expect(Object.keys(executeProcedure.mock.calls[1][1])).toEqual([
        '@busc',
        '@anno',
        '@id_via',
        '@nro',
        '@dpto',
        '@Mza',
        '@Lte',
        '@SubLte',
        '@cod_pred',
        '@codigo',
        '@inicio',
        '@final',
        '@cod_urb',
      ]);
    });

    it('reads the total from the first column of the first row of @busc=20', async () => {
      mockResults([[57, 999]], []);

      const result = await service.search(filters);

      expect(result.total).toBe(57);
    });

    it('computes 1-based @inicio/@final and totalPages from page/pageSize', async () => {
      const dto = { ...filters, page: 3, pageSize: 10 };
      mockResults([[95]], []);

      const result = await service.search(dto);

      expect(executeProcedure.mock.calls[1][1]).toEqual(rowsParams(dto, 21, 30));
      expect(result).toEqual({
        data: [],
        total: 95,
        page: 3,
        pageSize: 10,
        totalPages: 10,
      });
    });

    it('maps the 16 positional columns into the domain row, joining anexo', async () => {
      const spRow: SpConsultaPrediosRow = [
        '0000123',
        'JUAN PEREZ',
        '0101',
        '12',
        '3',
        'AV. CENTRAL 123',
        'RESIDENCIAL',
        120.5,
        250,
        100,
        5000,
        8000,
        13000,
        'A1',
        2,
        'A',
      ];
      mockResults([[1]], [spRow]);

      const result = await service.search(filters);

      expect(result.data).toEqual([
        {
          codigo: '0000123',
          nombre: 'JUAN PEREZ',
          cod_pred: '0101',
          anexo: '12-3',
          direccion: 'AV. CENTRAL 123',
          uso: 'RESIDENCIAL',
          t_area_const: 120.5,
          area_terreno: 250,
          porcen: 100,
          val_terreno: 5000,
          val_constru: 8000,
          autoavaluo: 13000,
          id_instalas: 'A1',
          num_pisos: 2,
          categoria: 'A',
        },
      ]);
    });

    it('returns an empty page with totalPages 0 when there are no matches', async () => {
      mockResults([[0]], []);

      const result = await service.search(filters);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });

    it('treats a missing total row as zero', async () => {
      mockResults([], []);

      const result = await service.search(filters);

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('mapConsultaPredioRow', () => {
    it('maps null and undefined cells without throwing', () => {
      const emptyRow = mapConsultaPredioRow([]);
      const nullRow = mapConsultaPredioRow([
        null,
        undefined,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);

      expect(emptyRow).toEqual({
        codigo: '',
        nombre: '',
        cod_pred: '',
        anexo: '-',
        direccion: '',
        uso: '',
        t_area_const: 0,
        area_terreno: 0,
        porcen: 0,
        val_terreno: 0,
        val_constru: 0,
        autoavaluo: 0,
        id_instalas: '',
        num_pisos: 0,
        categoria: '',
      });
      expect(nullRow).toEqual(emptyRow);
      expect(() =>
        mapConsultaPredioRow(undefined as unknown as SpConsultaPrediosRow),
      ).not.toThrow();
    });
  });

  describe('exportPredios', () => {
    const exportFilters: ExportConsultaPrediosDto = {
      codigo: '0000123',
      codPred: '0101',
      anno: '2026',
      codVia: '12',
      urbBus: 'URB1',
      nro: '45',
      dpto: 'A',
      mza: 'B',
      lte: 'C',
      sublote: 'D',
      mostrarPisos: false,
    };

    const exportParams = (
      dto: ExportConsultaPrediosDto,
      flag: '1' | '0',
    ): Record<string, unknown> => ({
      '@busc': '21',
      '@codigo': dto.codigo,
      '@cod_pred': dto.codPred,
      '@id_via': dto.codVia,
      '@cod_urb': dto.urbBus,
      '@anno': dto.anno,
      '@nro': dto.nro,
      '@dpto': dto.dpto,
      '@Mza': dto.mza,
      '@Lte': dto.lte,
      '@SubLte': dto.sublote,
      '@flag_pisos': flag,
    });

    /** Fila con las 33 celdas del SP; el índice 15 es el título del reporte. */
    const exportRow: SpConsultaPrediosRow = [
      '0000123',
      'JUAN PEREZ',
      '0101',
      '12',
      '3',
      'AV. CENTRAL 123',
      'RESIDENCIAL',
      250,
      100,
      120.5,
      5000,
      8000,
      13000,
      'A1',
      2,
      'REPORTE DE PREDIOS - URB1',
      'P1',
      'N1',
      '05',
      '2020',
      'RES',
      'CONCRETO',
      'BUENO',
      'M1',
      'T1',
      'P1',
      'PU1',
      'REV1',
      'B1',
      'IN1',
      1200,
      90,
      7000,
    ];

    it("invokes @busc='21' with the exact legacy parameter order", async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [exportRow] });

      await service.exportPredios(exportFilters);

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_Mcontribuyente',
        exportParams(exportFilters, '0'),
      );
      expect(Object.keys(executeProcedure.mock.calls[0][1])).toEqual([
        '@busc',
        '@codigo',
        '@cod_pred',
        '@id_via',
        '@cod_urb',
        '@anno',
        '@nro',
        '@dpto',
        '@Mza',
        '@Lte',
        '@SubLte',
        '@flag_pisos',
      ]);
    });

    it("maps mostrarPisos true to @flag_pisos '1'", async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [exportRow] });

      await service.exportPredios({ ...exportFilters, mostrarPisos: true });

      expect(executeProcedure.mock.calls[0][1]['@flag_pisos']).toBe('1');
    });

    it('uses row[15] as the title and never emits it as a data cell', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [exportRow] });

      const result = await service.exportPredios(exportFilters);

      expect(result.title).toBe('REPORTE DE PREDIOS - URB1');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).not.toContain('REPORTE DE PREDIOS - URB1');
      expect(result.rows[0][0]).toBe('1');
      expect(result.rows[0][1]).toBe('0000123');
      expect(result.columns.some((column) => column.sourceIndex === 15)).toBe(
        false,
      );
    });

    it('returns 16 columns without pisos and 33 columns with pisos', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [exportRow] });
      const withoutPisos = await service.exportPredios(exportFilters);

      executeProcedure.mockResolvedValueOnce({ recordset: [exportRow] });
      const withPisos = await service.exportPredios({
        ...exportFilters,
        mostrarPisos: true,
      });

      expect(withoutPisos.columns).toHaveLength(16);
      expect(withoutPisos.rows[0]).toHaveLength(16);
      expect(withPisos.columns).toHaveLength(33);
      expect(withPisos.rows[0]).toHaveLength(33);
      expect(withoutPisos.columns[8]).toEqual({
        key: 'porcen',
        label: '% Propiedad',
        sourceIndex: 7,
      });
      expect(withPisos.columns[16]).toEqual({
        key: 'item_piso',
        label: 'Item Piso',
        sourceIndex: 16,
      });
    });

    it('maps null and undefined cells without throwing', async () => {
      const nullRow: SpConsultaPrediosRow = Array.from(
        { length: 33 },
        () => null,
      );
      executeProcedure.mockResolvedValueOnce({ recordset: [nullRow] });

      const result = await service.exportPredios({
        ...exportFilters,
        mostrarPisos: true,
      });

      expect(result.title).toBe('');
      expect(result.rows[0]).toHaveLength(33);
      expect(result.rows[0].slice(1)).toEqual(Array(32).fill(''));
    });

    it('returns an empty title and rows when the SP has no data', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [] });

      const result = await service.exportPredios(exportFilters);

      expect(result.title).toBe('');
      expect(result.rows).toEqual([]);
      expect(result.columns).toHaveLength(16);
    });
  });
});
