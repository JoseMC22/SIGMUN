import { SearchAnularValorSchema } from './search-anular-valor.dto';

/**
 * TipoBusqueda es obligatorio (char(1) C/N/R/D): sin criterio el SP no sabe
 * qué filtrar. Los campos del criterio sobrante viajan '' y el SP los ignora.
 * pageSize es selector de modo: 15 grilla, 100000 exportación interna.
 */
describe('SearchAnularValorSchema', () => {
  const base = { TipoBusqueda: 'C' as const };

  it('defaultea a page 1, pageSize 15 y criterios vacios', () => {
    const dto = SearchAnularValorSchema.parse(base);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(15);
    expect(dto.Codigo).toBe('');
    expect(dto.Paterno).toBe('');
    expect(dto.Materno).toBe('');
    expect(dto.Nombres).toBe('');
    expect(dto.Razon).toBe('');
    expect(dto.NumDoc).toBe('');
  });

  it('acepta los cuatro tipos C/N/R/D y rechaza otro', () => {
    for (const t of ['C', 'N', 'R', 'D'] as const) {
      expect(
        SearchAnularValorSchema.parse({ TipoBusqueda: t }).TipoBusqueda,
      ).toBe(t);
    }
    expect(() =>
      SearchAnularValorSchema.parse({ TipoBusqueda: 'X' }),
    ).toThrow();
    expect(() => SearchAnularValorSchema.parse({})).toThrow();
  });

  it('acepta solo el conjunto pageSize {15, 100000}', () => {
    expect(
      SearchAnularValorSchema.parse({ ...base, pageSize: 100000 }).pageSize,
    ).toBe(100000);
    expect(() =>
      SearchAnularValorSchema.parse({ ...base, pageSize: 20 }),
    ).toThrow();
  });

  it('rechaza longitudes mayores que las del SP', () => {
    expect(() =>
      SearchAnularValorSchema.parse({ ...base, Codigo: '12345678' }),
    ).toThrow();
    expect(() =>
      SearchAnularValorSchema.parse({ ...base, Paterno: 'x'.repeat(51) }),
    ).toThrow();
    expect(() =>
      SearchAnularValorSchema.parse({ ...base, Nombres: 'x'.repeat(201) }),
    ).toThrow();
    expect(() =>
      SearchAnularValorSchema.parse({ ...base, NumDoc: 'x'.repeat(12) }),
    ).toThrow();
  });

  it('rechaza un page menor a 1', () => {
    expect(() =>
      SearchAnularValorSchema.parse({ ...base, page: 0 }),
    ).toThrow();
  });
});
