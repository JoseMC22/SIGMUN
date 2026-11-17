import { DatabaseService } from '../../database/database.service';
import {
  ConsultaPrediosFiltersSchema,
  SearchConsultaPrediosDto,
} from './dto/search-consulta-predios.dto';
import { ExportConsultaPrediosDto } from './dto/export-consulta-predios.dto';
import {
  ConsultaPrediosRow,
  SpConsultaPrediosRow,
} from './consulta-predios.types';
import {
  ConsultaPrediosService,
  mapConsultaPredioRow,
} from './consulta-predios.service';

type ExecuteProcedureMock = jest.Mock<
  Promise<unknown>,
  [procedure: string, params: Record<string, unknown>]
>;

/** Real @busc=19 named recordset: `anexo` is already joined, key is `direcion`. */
const BUSC_19_ROW: SpConsultaPrediosRow = {
  codigo: '0000123',
  nombre: 'JUAN PEREZ',
  cod_pred: '0101',
  anexo: '1-0',
  sub_anexo: 0,
  direcion: 'AV. CENTRAL 123',
  uso: 'RESIDENCIAL',
  total_area_constru: 120.5,
  area_terreno: 250,
  porcen_propiedad: 100,
  val_total_terreno: 5000,
  val_total_constru: 8000,
  total_autoavaluo: 13000,
  id_instalas: 'A1',
  num_pisos: 2,
  categoria: 'A',
  ROW: 1,
};

/** Real @busc=21 named recordset without pisos: `anno` carries the title. */
const BUSC_21_BASE_ROW: SpConsultaPrediosRow = {
  codigo: 'COD',
  nombre: 'NOM',
  cod_pred: 'PRED',
  anexo: 'ANX',
  direcion: 'DIR',
  uso: 'USO',
  area_terreno: 'AREA_TER',
  porcen_propiedad: 'PORC',
  total_area_constru: 'T_AREA',
  val_total_terreno: 'VT_TER',
  val_total_constru: 'VT_CON',
  total_autoavaluo: 'AUTO',
  id_instalas: 'INST',
  num_pisos: 'NPIS',
  categoria: 'CAT',
  anno: '2026',
};

/** @busc=21 with @flag_pisos='1': 17 extra keys, each with a distinct value. */
const BUSC_21_PISOS_ROW: SpConsultaPrediosRow = {
  ...BUSC_21_BASE_ROW,
  niv_piso: 'NIV-1',
  tipo_piso: 'TIPO-2',
  mes_cons: 'MES-3',
  ano_cons: 'ANO-4',
  id_clafica: 'CLAF-5',
  id_materia: 'MAT-6',
  id_estados: 'EST-7',
  cat_muros: 'MUR-8',
  cate_techo: 'TEC-9',
  cate_pisos: 'PIS-10',
  cate_puert: 'PUE-11',
  cate_reves: 'REV-12',
  cate_banno: 'BAN-13',
  cate_insel: 'INS-14',
  val_uni: 'VU-15',
  area_const: 'AC-16',
  val_const: 'VC-17',
};

const EXPECTED_DOMAIN_ROW: ConsultaPrediosRow = {
  codigo: '0000123',
  nombre: 'JUAN PEREZ',
  cod_pred: '0101',
  anexo: '1-0',
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
};

const EMPTY_DOMAIN_ROW: ConsultaPrediosRow = {
  codigo: '',
  nombre: '',
  cod_pred: '',
  anexo: '',
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
};

/** Export row without pisos: N + 15 cells in EXPORT_BASE_COLUMNS order. */
const EXPECTED_BASE_EXPORT_ROW = [
  '1',
  'COD',
  'NOM',
  'PRED',
  'ANX',
  'DIR',
  'USO',
  'AREA_TER',
  'PORC',
  'T_AREA',
  'VT_TER',
  'VT_CON',
  'AUTO',
  'INST',
  'NPIS',
  'CAT',
];

/** Export row with pisos: the base cells plus 17 legacy-order piso cells. */
const EXPECTED_PISOS_EXPORT_ROW = [
  ...EXPECTED_BASE_EXPORT_ROW,
  'NIV-1',
  'TIPO-2',
  'MES-3',
  'ANO-4',
  'CLAF-5',
  'MAT-6',
  'EST-7',
  'MUR-8',
  'TEC-9',
  'PIS-10',
  'PUE-11',
  'REV-12',
  'BAN-13',
  'INS-14',
  'VU-15',
  'AC-16',
  'VC-17',
];

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
    'busc': 20,
    'anno': dto.anno,
    'id_via': dto.codVia,
    'nro': dto.nro,
    'dpto': dto.dpto,
    'Mza': dto.mza,
    'Lte': dto.lte,
    'SubLte': dto.sublote,
    'cod_pred': dto.codPred,
    'codigo': dto.codigo,
    'cod_urb': dto.urbBus,
  });

  /** Orden literal del branch @busc=19 (@inicio/@final antes de @cod_urb). */
  const rowsParams = (
    dto: SearchConsultaPrediosDto,
    inicio: number,
    final: number,
  ): Record<string, unknown> => ({
    'busc': 19,
    'anno': dto.anno,
    'id_via': dto.codVia,
    'nro': dto.nro,
    'dpto': dto.dpto,
    'Mza': dto.mza,
    'Lte': dto.lte,
    'SubLte': dto.sublote,
    'cod_pred': dto.codPred,
    'codigo': dto.codigo,
    'inicio': inicio,
    'final': final,
    'cod_urb': dto.urbBus,
  });

  const mockResults = (
    total: readonly SpConsultaPrediosRow[],
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
      mockResults([{ '': 0 }], []);

      await service.search(filters);

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Rentas.sp_Mcontribuyente',
        totalParams(filters),
      );
      expect(Object.keys(executeProcedure.mock.calls[0][1])).toEqual([
        'busc',
        'anno',
        'id_via',
        'nro',
        'dpto',
        'Mza',
        'Lte',
        'SubLte',
        'cod_pred',
        'codigo',
        'cod_urb',
      ]);
    });

    it('invokes @busc=19 with @inicio/@final inserted before @cod_urb', async () => {
      mockResults([{ '': 1 }], []);

      await service.search(filters);

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Rentas.sp_Mcontribuyente',
        rowsParams(filters, 1, 20),
      );
      expect(Object.keys(executeProcedure.mock.calls[1][1])).toEqual([
        'busc',
        'anno',
        'id_via',
        'nro',
        'dpto',
        'Mza',
        'Lte',
        'SubLte',
        'cod_pred',
        'codigo',
        'inicio',
        'final',
        'cod_urb',
      ]);
    });

    it("reads the @busc=20 total from the '' key, not a positional index", async () => {
      mockResults([{ other: 999, '': 57 }, { '': 1 }], []);

      const result = await service.search(filters);

      expect(result.total).toBe(57);
    });

    it('computes 1-based @inicio/@final and totalPages from page/pageSize', async () => {
      const dto = { ...filters, page: 3, pageSize: 10 };
      mockResults([{ '': 95 }], []);

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

    it('maps a named @busc=19 recordset into populated legacy fields', async () => {
      mockResults([{ '': 1 }], [BUSC_19_ROW]);

      const result = await service.search(filters);

      expect(result.data).toEqual([EXPECTED_DOMAIN_ROW]);
    });

    it('does not read a legacy positional array as a named recordset', async () => {
      const positionalRow = [
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
      ] as unknown as SpConsultaPrediosRow;
      mockResults([{ '': 1 }], [positionalRow]);

      const result = await service.search(filters);

      expect(result.data).toEqual([EMPTY_DOMAIN_ROW]);
    });

    it('returns an empty page with totalPages 0 when there are no matches', async () => {
      mockResults([{ '': 0 }], []);

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
    it('reads each legacy field from its SP column name', () => {
      expect(mapConsultaPredioRow(BUSC_19_ROW)).toEqual(EXPECTED_DOMAIN_ROW);
    });

    it('maps missing and null named values without throwing', () => {
      const nullRow: SpConsultaPrediosRow = Object.fromEntries(
        Object.keys(BUSC_19_ROW).map((name) => [name, null]),
      );

      expect(mapConsultaPredioRow({})).toEqual(EMPTY_DOMAIN_ROW);
      expect(mapConsultaPredioRow(nullRow)).toEqual(EMPTY_DOMAIN_ROW);
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
      'busc': '21',
      'codigo': dto.codigo,
      'cod_pred': dto.codPred,
      'id_via': dto.codVia,
      'cod_urb': dto.urbBus,
      'anno': dto.anno,
      'nro': dto.nro,
      'dpto': dto.dpto,
      'Mza': dto.mza,
      'Lte': dto.lte,
      'SubLte': dto.sublote,
      'flag_pisos': flag,
    });

    it("invokes @busc='21' with the exact legacy parameter order", async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_BASE_ROW] });

      await service.exportPredios(exportFilters);

      expect(executeProcedure).toHaveBeenCalledTimes(1);
      expect(executeProcedure).toHaveBeenCalledWith(
        'Rentas.sp_Mcontribuyente',
        exportParams(exportFilters, '0'),
      );
      expect(Object.keys(executeProcedure.mock.calls[0][1])).toEqual([
        'busc',
        'codigo',
        'cod_pred',
        'id_via',
        'cod_urb',
        'anno',
        'nro',
        'dpto',
        'Mza',
        'Lte',
        'SubLte',
        'flag_pisos',
      ]);
    });

    it("maps mostrarPisos true to @flag_pisos '1'", async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_PISOS_ROW] });

      await service.exportPredios({ ...exportFilters, mostrarPisos: true });

      expect(executeProcedure.mock.calls[0][1]['flag_pisos']).toBe('1');
    });

    it("reads the title from the SP's anno key for both flag values", async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_BASE_ROW] });
      const withoutPisos = await service.exportPredios(exportFilters);

      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_PISOS_ROW] });
      const withPisos = await service.exportPredios({
        ...exportFilters,
        mostrarPisos: true,
      });

      expect(withoutPisos.title).toBe('2026');
      expect(withPisos.title).toBe('2026');
      expect(withoutPisos.rows[0]).not.toContain('2026');
      expect(withPisos.rows[0]).not.toContain('2026');
    });

    it('keeps the N column and never emits the title as a data cell', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_BASE_ROW] });

      const result = await service.exportPredios(exportFilters);

      expect(result.rows[0]).toEqual(EXPECTED_BASE_EXPORT_ROW);
      expect(result.rows[0][0]).toBe('1');
      expect(result.columns[0]).toEqual({
        key: 'n',
        label: 'N',
        sourceIndex: -1,
      });
      expect(result.columns.some((column) => column.sourceIndex === 15)).toBe(
        false,
      );
    });

    it('reads every base and piso value from its own SP key', async () => {
      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_BASE_ROW] });
      const withoutPisos = await service.exportPredios(exportFilters);

      executeProcedure.mockResolvedValueOnce({ recordset: [BUSC_21_PISOS_ROW] });
      const withPisos = await service.exportPredios({
        ...exportFilters,
        mostrarPisos: true,
      });

      expect(withoutPisos.columns).toHaveLength(16);
      expect(withoutPisos.rows[0]).toHaveLength(16);
      expect(withPisos.columns).toHaveLength(33);
      expect(withPisos.rows[0]).toHaveLength(33);
      expect(withoutPisos.rows[0]).toEqual(EXPECTED_BASE_EXPORT_ROW);
      expect(withPisos.rows[0]).toEqual(EXPECTED_PISOS_EXPORT_ROW);
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

    it('maps missing and null named values without throwing', async () => {
      const nullRow: SpConsultaPrediosRow = Object.fromEntries(
        Object.keys(BUSC_21_PISOS_ROW).map((name) => [name, null]),
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

  describe('SP parameter binding', () => {
    it('never prefixes an executeProcedure parameter key with @', async () => {
      mockResults([{ '': 0 }], []);
      await service.search(filters);

      executeProcedure.mockResolvedValueOnce({ recordset: [] });
      await service.exportPredios({
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
      });

      const keys = executeProcedure.mock.calls.flatMap(([, params]) =>
        Object.keys(params),
      );
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.filter((key) => key.startsWith('@'))).toEqual([]);
    });
  });

  describe('ConsultaPrediosFiltersSchema anno guard', () => {
    it('defaults an empty anno to the current year', () => {
      const parsed = ConsultaPrediosFiltersSchema.parse({ anno: '' });

      expect(parsed.anno).toBe(String(new Date().getFullYear()));
    });

    it('preserves a real anno value', () => {
      const parsed = ConsultaPrediosFiltersSchema.parse({ anno: '2019' });

      expect(parsed.anno).toBe('2019');
    });
  });
});
