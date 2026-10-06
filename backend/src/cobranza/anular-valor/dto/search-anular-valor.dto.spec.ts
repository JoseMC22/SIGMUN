import { SearchAnularValorSchema } from './search-anular-valor.dto';

/**
 * Fase 1: el DTO solo trae page/pageSize (sin filtros, se listan todos).
 * pageSize es selector de modo: 15 grilla, 100000 export. Cualquier otro
 * valor se rechaza en vez de activar silenciosamente un rango inesperado.
 */
describe('SearchAnularValorSchema', () => {
  it('defaultea a page 1 y pageSize 15', () => {
    const dto = SearchAnularValorSchema.parse({});
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(15);
  });

  it('acepta solo el conjunto pageSize {15, 100000}', () => {
    expect(SearchAnularValorSchema.parse({ pageSize: 15 }).pageSize).toBe(15);
    expect(SearchAnularValorSchema.parse({ pageSize: 100000 }).pageSize).toBe(
      100000,
    );
    expect(() => SearchAnularValorSchema.parse({ pageSize: 20 })).toThrow();
    expect(() => SearchAnularValorSchema.parse({ pageSize: 10 })).toThrow();
    expect(() => SearchAnularValorSchema.parse({ pageSize: 100 })).toThrow();
  });

  it('rechaza un page menor a 1', () => {
    expect(() => SearchAnularValorSchema.parse({ page: 0 })).toThrow();
  });
});
