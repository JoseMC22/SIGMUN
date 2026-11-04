import {
  SearchContribuyenteSchema,
  TipoBusquedaSchema,
} from './search-contribuyente.dto';

/**
 * Contrato de transporte del body que arma el frontend en
 * actions/cobranza/certificado-no-adeudo.ts.
 *
 * Claves con mayuscula inicial y valores string: zod descarta en silencio las
 * claves desconocidas, asi que un `codigo` en minuscula haria que el SP
 * buscara sin filtro sin devolver ningun error visible.
 */
describe('SearchContribuyenteSchema', () => {
  it('aplica los defaults page=1 y pageSize=15', () => {
    const dto = SearchContribuyenteSchema.parse({ TipoBusqueda: 'N' });

    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(15);
  });

  it('coacciona page y pageSize enviados como string', () => {
    const dto = SearchContribuyenteSchema.parse({
      TipoBusqueda: 'N',
      page: '3',
      pageSize: '100000',
    });

    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(100000);
    expect(typeof dto.page).toBe('number');
  });

  it('rechaza page menor a 1 o no entero', () => {
    for (const page of [0, -1, 1.5, '0']) {
      expect(() =>
        SearchContribuyenteSchema.parse({ TipoBusqueda: 'N', page }),
      ).toThrow();
    }
  });

  it('acepta solo pageSize {15, 100000}', () => {
    for (const pageSize of [15, 100000]) {
      expect(
        SearchContribuyenteSchema.parse({ TipoBusqueda: 'N', pageSize })
          .pageSize,
      ).toBe(pageSize);
    }
    for (const pageSize of [20, 10, 100, 1000]) {
      expect(() =>
        SearchContribuyenteSchema.parse({ TipoBusqueda: 'N', pageSize }),
      ).toThrow();
    }
  });

  it('acepta los criterios C, N, R y D', () => {
    for (const criterio of ['C', 'N', 'R', 'D'] as const) {
      expect(
        SearchContribuyenteSchema.parse({ TipoBusqueda: criterio })
          .TipoBusqueda,
      ).toBe(criterio);
    }
  });

  it('rechaza criterios fuera del enum (minusculas, vacio y ausente)', () => {
    for (const TipoBusqueda of ['c', 'X', '', undefined]) {
      expect(() => SearchContribuyenteSchema.parse({ TipoBusqueda })).toThrow();
    }
    expect(TipoBusquedaSchema.options).toEqual(['C', 'N', 'R', 'D']);
  });

  it('normaliza a "" todos los filtros opcionales ausentes', () => {
    const dto = SearchContribuyenteSchema.parse({ TipoBusqueda: 'C' });

    expect(dto.Codigo).toBe('');
    expect(dto.Paterno).toBe('');
    expect(dto.Materno).toBe('');
    expect(dto.Nombres).toBe('');
    expect(dto.Razon).toBe('');
    expect(dto.NumDoc).toBe('');
  });

  it('preserva los ceros a la izquierda del codigo y del numero de documento', () => {
    const dto = SearchContribuyenteSchema.parse({
      TipoBusqueda: 'C',
      Codigo: '0012345',
      NumDoc: '00000001',
    });

    expect(dto.Codigo).toBe('0012345');
    expect(dto.NumDoc).toBe('00000001');
    expect(typeof dto.Codigo).toBe('string');
  });

  it('descarta en silencio una clave codigo en minuscula (trampa del contrato)', () => {
    const dto = SearchContribuyenteSchema.parse({
      TipoBusqueda: 'C',
      codigo: '0012345',
    });

    expect(dto.Codigo).toBe('');
  });

  it('respeta los maximos por campo (7/50/50/200/200/11)', () => {
    const maximos = {
      Codigo: 7,
      Paterno: 50,
      Materno: 50,
      Nombres: 200,
      Razon: 200,
      NumDoc: 11,
    } as const;

    for (const [campo, maximo] of Object.entries(maximos) as [
      keyof typeof maximos,
      number,
    ][]) {
      expect(() =>
        SearchContribuyenteSchema.parse({
          TipoBusqueda: 'N',
          [campo]: 'a'.repeat(maximo + 1),
        }),
      ).toThrow();
      expect(
        SearchContribuyenteSchema.parse({
          TipoBusqueda: 'N',
          [campo]: 'a'.repeat(maximo),
        })[campo],
      ).toHaveLength(maximo);
    }
  });
});
