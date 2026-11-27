import { DatabaseService } from '../../database/database.service';
import { SearchContribuyentesProyectadosDto } from './dto/search-contribuyentes-proyectado.dto';
import {
  ContribuyenteProyectadoRow,
  SpContribuyenteProyectadoRow,
} from './estado-cuenta-proyectado.types';
import {
  EstadoCuentaProyectadoService,
  SP_FIELD_BY_KEY,
  mapContribuyenteProyectadoRow,
} from './estado-cuenta-proyectado.service';

type ExecuteProcedureMock = jest.Mock<
  Promise<unknown>,
  [procedure: string, params: Record<string, unknown>]
>;

/** Real @busc=5 named recordset; keys match the SP SELECT aliases. */
const BUSC_5_ROW: SpContribuyenteProyectadoRow = {
  codigo: '0000123',
  id_pers: '01',
  id_docu: '04',
  num_doc: '12345678',
  nombres: 'JUAN',
  // The SP itself prefixes 'SUC. ' for id_tipocontri='04'; never reimplemented.
  paterno: 'SUC. PEREZ',
  materno: 'LOPEZ',
  DireFis: 'AV. CENTRAL 123',
  documento: 'DNI',
  ROW: 1,
};

const EXPECTED_DOMAIN_ROW: ContribuyenteProyectadoRow = {
  codigo: '0000123',
  nombres: 'JUAN SUC. PEREZ LOPEZ',
  documento: '12345678',
  direccion: 'AV. CENTRAL 123',
};

const EMPTY_DOMAIN_ROW: ContribuyenteProyectadoRow = {
  codigo: '',
  nombres: '  ',
  documento: '',
  direccion: '',
};

const BASE_DTO: SearchContribuyentesProyectadosDto = {
  tipoBusqueda: 'C',
  codigo: '0000123',
  criterioNombre: '',
  criterioPaterno: '',
  criterioMaterno: '',
  criterioRazon: '',
  documento: '',
  page: 1,
  pageSize: 20,
};

function countParams(dto: SearchContribuyentesProyectadosDto): Record<string, unknown> {
  return {
    busc: 6,
    codigo: dto.tipoBusqueda === 'C' ? dto.codigo : '',
    nombres: dto.tipoBusqueda === 'N' ? dto.criterioNombre : '',
    num_doc:
      dto.tipoBusqueda === 'D'
        ? dto.documento
        : dto.tipoBusqueda === 'R'
          ? dto.criterioRazon
          : '',
  };
}

function rowsParams(
  dto: SearchContribuyentesProyectadosDto,
  inicio: number,
  final: number,
): Record<string, unknown> {
  return {
    busc: 5,
    codigo: dto.codigo,
    nombres: dto.criterioNombre,
    paterno: dto.criterioPaterno,
    materno: dto.criterioMaterno,
    razon: dto.criterioRazon,
    num_doc: dto.documento,
    tipo_busqueda: dto.tipoBusqueda,
    inicio,
    final,
  };
}

describe('EstadoCuentaProyectadoService', () => {
  let executeProcedure: ExecuteProcedureMock;
  let service: EstadoCuentaProyectadoService;

  function mockResults(
    total: readonly SpContribuyenteProyectadoRow[],
    rows: readonly SpContribuyenteProyectadoRow[],
  ): void {
    executeProcedure
      .mockResolvedValueOnce({ recordset: total })
      .mockResolvedValueOnce({ recordset: rows });
  }

  beforeEach(() => {
    executeProcedure = jest.fn<Promise<unknown>, [string, Record<string, unknown>]>();
    const db = { executeProcedure } as unknown as DatabaseService;
    service = new EstadoCuentaProyectadoService(db);
  });

  describe('search', () => {
    it('invokes @busc=6 first with the legacy count parameter names and order', async () => {
      mockResults([{ '': 0 }], []);

      await service.search(BASE_DTO);

      expect(executeProcedure).toHaveBeenCalledTimes(2);
      expect(executeProcedure).toHaveBeenNthCalledWith(
        1,
        'Rentas.sp_Mcontribuyente',
        countParams(BASE_DTO),
      );
      expect(Object.keys(executeProcedure.mock.calls[0][1])).toEqual([
        'busc',
        'codigo',
        'nombres',
        'num_doc',
      ]);
    });

    it('invokes @busc=5 with the legacy row parameter names and order', async () => {
      mockResults([{ '': 1 }], []);

      await service.search(BASE_DTO);

      expect(executeProcedure).toHaveBeenNthCalledWith(
        2,
        'Rentas.sp_Mcontribuyente',
        rowsParams(BASE_DTO, 1, 20),
      );
      expect(Object.keys(executeProcedure.mock.calls[1][1])).toEqual([
        'busc',
        'codigo',
        'nombres',
        'paterno',
        'materno',
        'razon',
        'num_doc',
        'tipo_busqueda',
        'inicio',
        'final',
      ]);
    });

    it('maps criterion N to @nombres in the count call and sends all name fields to rows', async () => {
      const dto: SearchContribuyentesProyectadosDto = {
        ...BASE_DTO,
        tipoBusqueda: 'N',
        codigo: '',
        criterioNombre: 'JUAN',
        criterioPaterno: 'PEREZ',
        criterioMaterno: 'LOPEZ',
      };
      mockResults([{ '': 1 }], []);

      await service.search(dto);

      expect(executeProcedure.mock.calls[0][1]).toEqual(countParams(dto));
      expect(executeProcedure.mock.calls[0][1]['nombres']).toBe('JUAN');
      expect(executeProcedure.mock.calls[1][1]).toEqual(rowsParams(dto, 1, 20));
      expect(executeProcedure.mock.calls[1][1]['tipo_busqueda']).toBe('N');
    });

    it('maps criterion D to @num_doc from the documento filter', async () => {
      const dto: SearchContribuyentesProyectadosDto = {
        ...BASE_DTO,
        tipoBusqueda: 'D',
        codigo: '',
        documento: '12345678',
      };
      mockResults([{ '': 1 }], []);

      await service.search(dto);

      expect(executeProcedure.mock.calls[0][1]['num_doc']).toBe('12345678');
      expect(executeProcedure.mock.calls[1][1]['num_doc']).toBe('12345678');
      expect(executeProcedure.mock.calls[1][1]['tipo_busqueda']).toBe('D');
    });

    it('maps criterion R to @num_doc in count and @razon in rows', async () => {
      const dto: SearchContribuyentesProyectadosDto = {
        ...BASE_DTO,
        tipoBusqueda: 'R',
        codigo: '',
        criterioRazon: 'EMPRESA SA',
      };
      mockResults([{ '': 1 }], []);

      await service.search(dto);

      expect(executeProcedure.mock.calls[0][1]['num_doc']).toBe('EMPRESA SA');
      expect(executeProcedure.mock.calls[1][1]['razon']).toBe('EMPRESA SA');
      expect(executeProcedure.mock.calls[1][1]['tipo_busqueda']).toBe('R');
    });

    it("reads the @busc=6 total from the '' key, not a positional index", async () => {
      mockResults([{ other: 999, '': 57 }, { '': 1 }], []);

      const result = await service.search(BASE_DTO);

      expect(result.total).toBe(57);
    });

    it('computes 1-based @inicio/@final and totalPages from page/pageSize', async () => {
      const dto = { ...BASE_DTO, page: 3, pageSize: 10 };
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

    it('uses the fixed page size 20 by default', async () => {
      mockResults([{ '': 45 }], []);

      const result = await service.search(BASE_DTO);

      expect(executeProcedure.mock.calls[1][1]['inicio']).toBe(1);
      expect(executeProcedure.mock.calls[1][1]['final']).toBe(20);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    it('maps a named @busc=5 recordset into the four legacy columns', async () => {
      mockResults([{ '': 1 }], [BUSC_5_ROW]);

      const result = await service.search(BASE_DTO);

      expect(result.data).toEqual([EXPECTED_DOMAIN_ROW]);
    });

    it('preserves the SUC. prefix returned by the SP instead of reimplementing it', async () => {
      mockResults([{ '': 1 }], [BUSC_5_ROW]);

      const result = await service.search(BASE_DTO);

      expect(result.data[0].nombres).toContain('SUC. PEREZ');
    });

    it('never prefixes an executeProcedure parameter key with @', async () => {
      mockResults([{ '': 0 }], []);

      await service.search(BASE_DTO);

      const keys = executeProcedure.mock.calls.flatMap(([, params]) =>
        Object.keys(params),
      );
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.filter((key) => key.startsWith('@'))).toEqual([]);
    });

    it('returns an empty page with totalPages 0 when there are no matches', async () => {
      mockResults([{ '': 0 }], []);

      const result = await service.search(BASE_DTO);

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

      const result = await service.search(BASE_DTO);

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('mapContribuyenteProyectadoRow', () => {
    it('reads each field from its SP column name', () => {
      expect(mapContribuyenteProyectadoRow(BUSC_5_ROW)).toEqual(EXPECTED_DOMAIN_ROW);
    });

    it('declares an explicit SP column for every domain key', () => {
      expect(SP_FIELD_BY_KEY).toEqual({
        codigo: 'codigo',
        nombres: 'nombres',
        paterno: 'paterno',
        materno: 'materno',
        documento: 'num_doc',
        direccion: 'DireFis',
      });
    });

    it('maps null named values without throwing', () => {
      const nullRow: SpContribuyenteProyectadoRow = Object.fromEntries(
        Object.keys(BUSC_5_ROW).map((name) => [name, null]),
      );

      expect(mapContribuyenteProyectadoRow(nullRow)).toEqual(EMPTY_DOMAIN_ROW);
      expect(() =>
        mapContribuyenteProyectadoRow(undefined as unknown as SpContribuyenteProyectadoRow),
      ).not.toThrow();
    });
  });
});
