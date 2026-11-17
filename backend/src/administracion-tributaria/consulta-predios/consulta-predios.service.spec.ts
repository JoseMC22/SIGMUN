import { DatabaseService } from '../../database/database.service';
import { SearchConsultaPrediosDto } from './dto/search-consulta-predios.dto';
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
});
