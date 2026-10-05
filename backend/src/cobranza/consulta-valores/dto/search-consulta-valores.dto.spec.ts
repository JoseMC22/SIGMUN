import { SearchConsultaValoresSchema } from './search-consulta-valores.dto';

/**
 * Verifica el contrato de transporte del body que arma el frontend.
 *
 * Por qué importa: zod NO valida ni complain de claves desconocidas, las descarta.
 * Si el action mandara `codigo` en minúscula en vez de `Codigo`, el DTO devolvería
 * Codigo: '' y la consulta traería TODOS los valores sin ningún error visible.
 * Estos tests son la única red contra esa trampa.
 */
describe('SearchConsultaValoresSchema', () => {
  it('normaliza a "" los tres criterios ausentes', () => {
    const dto = SearchConsultaValoresSchema.parse({ page: 1, pageSize: 15 });
    expect(dto.Codigo).toBe('');
    expect(dto.Unombre).toBe('');
    expect(dto.NumVal).toBe('');
  });

  it('preserva los ceros a la izquierda (llegan como string)', () => {
    const dto = SearchConsultaValoresSchema.parse({
      page: 1,
      pageSize: 15,
      NumVal: '0005259',
    });
    expect(dto.NumVal).toBe('0005259');
    expect(typeof dto.NumVal).toBe('string');
  });

  it('descarta en silencio una clave Codigo en minúscula (trampa documentada)', () => {
    const parsed = SearchConsultaValoresSchema.parse({
      page: 1,
      pageSize: 15,
      codigo: '0204199', // minúscula: NO es la clave del contrato
    });
    // Esto es exactamente lo que haría que el SP devuelva todo sin avisar.
    expect(parsed.Codigo).toBe('');
  });

  it('acepta solo el conjunto pageSize {15, 100000}', () => {
    expect(SearchConsultaValoresSchema.parse({ pageSize: 15 }).pageSize).toBe(15);
    expect(SearchConsultaValoresSchema.parse({ pageSize: 100000 }).pageSize).toBe(100000);
    expect(() => SearchConsultaValoresSchema.parse({ pageSize: 20 })).toThrow();
    expect(() => SearchConsultaValoresSchema.parse({ pageSize: 10 })).toThrow();
    expect(() => SearchConsultaValoresSchema.parse({ pageSize: 100 })).toThrow();
  });

  it('rechaza un Codigo mas largo que 7 caracteres (varchar(7) del SP)', () => {
    expect(() =>
      SearchConsultaValoresSchema.parse({ Codigo: '12345678' }),
    ).toThrow();
  });

  it('rechaza un NumVal mas largo que 7 caracteres (char(7) del SP)', () => {
    expect(() =>
      SearchConsultaValoresSchema.parse({ NumVal: '12345678' }),
    ).toThrow();
  });

  it('rechaza un Unombre mas largo que 200 caracteres (varchar(200) del SP)', () => {
    expect(() =>
      SearchConsultaValoresSchema.parse({ Unombre: 'x'.repeat(201) }),
    ).toThrow();
  });

  it('rechaza un page menor a 1', () => {
    expect(() => SearchConsultaValoresSchema.parse({ page: 0 })).toThrow();
  });
});
