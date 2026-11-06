import { SearchFraccDetalladoSchema } from './search-fracc-detallado.dto';

/**
 * Verifica el contrato de transporte del body que arma el frontend en
 * actions/cobranza/reporte-fracc-detallado.ts.
 *
 * Por qué importa: zod NO valida ni se queja de claves desconocidas, las
 * descarta. Si el action mandara `codigo` en minúscula en vez de `Codigo`, el
 * DTO devolvería Codigo: '' y el reporte traería TODOS los registros sin ningún
 * error visible. Estos tests son la única red contra esa trampa.
 */
describe('SearchFraccDetalladoSchema', () => {
  // Body exacto que produce el server action.
  const frontendBody = (
    codigo: string,
    anno: string,
    idMes: string | number,
  ) => ({
    page: 1,
    pageSize: 15,
    Codigo: codigo,
    Anno: anno,
    IdMes: idMes,
  });

  it('entrega Codigo al service cuando se busca por codigo', () => {
    const dto = SearchFraccDetalladoSchema.parse(
      frontendBody('0200274', '2026', 11),
    );
    expect(dto.Codigo).toBe('0200274');
    expect(dto.Anno).toBe('2026');
    expect(dto.IdMes).toBe(11);
  });

  it('acepta un codigo parcial: el SP filtra con LIKE contiene', () => {
    // Un codigo parcial es una busqueda valida: NO se padea a 7 digitos.
    const dto = SearchFraccDetalladoSchema.parse(
      frontendBody('02002', '2026', 11),
    );
    expect(dto.Codigo).toBe('02002');
  });

  it('preserva los ceros a la izquierda del codigo (llega como string)', () => {
    const dto = SearchFraccDetalladoSchema.parse(
      frontendBody('0001234', '2026', 11),
    );
    expect(dto.Codigo).toBe('0001234');
    expect(typeof dto.Codigo).toBe('string');
  });

  it('normaliza a "" el codigo ausente (sin acotar)', () => {
    const dto = SearchFraccDetalladoSchema.parse({
      page: 1,
      pageSize: 15,
      Anno: '2026',
      IdMes: 11,
    });
    expect(dto.Codigo).toBe('');
  });

  it('normaliza a "" un codigo de solo espacios (sin acotar, igual que el vacío)', () => {
    const dto = SearchFraccDetalladoSchema.parse(
      frontendBody('   ', '2026', 11),
    );

    expect(dto.Codigo).toBe('');
  });

  it('descarta en silencio una clave Codigo en minúscula (trampa documentada)', () => {
    const parsed = SearchFraccDetalladoSchema.parse({
      page: 1,
      pageSize: 15,
      codigo: '0200274', // snake/lowercase: NO es la clave del contrato
      Anno: '2026',
      IdMes: 11,
    });
    // Esto es exactamente lo que haría que el SP devuelva todo el universo.
    expect(parsed.Codigo).toBe('');
  });

  it('acepta solo el conjunto pageSize {15, 100000}', () => {
    expect(
      SearchFraccDetalladoSchema.parse({ Anno: '2026', IdMes: 1, pageSize: 15 })
        .pageSize,
    ).toBe(15);
    expect(
      SearchFraccDetalladoSchema.parse({
        Anno: '2026',
        IdMes: 1,
        pageSize: 100000,
      }).pageSize,
    ).toBe(100000);
    expect(() =>
      SearchFraccDetalladoSchema.parse({ Anno: '2026', IdMes: 1, pageSize: 20 }),
    ).toThrow();
    expect(() =>
      SearchFraccDetalladoSchema.parse({ Anno: '2026', IdMes: 1, pageSize: 10 }),
    ).toThrow();
    expect(() =>
      SearchFraccDetalladoSchema.parse({
        Anno: '2026',
        IdMes: 1,
        pageSize: 100,
      }),
    ).toThrow();
  });

  it('rechaza un Codigo mas largo que 7 caracteres (varchar(7) del SP)', () => {
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('12345678', '2026', 11)),
    ).toThrow();
  });

  it('rechaza un body sin Anno (obligatorio: el SP devuelve 0 filas sin él)', () => {
    expect(() =>
      SearchFraccDetalladoSchema.parse({ page: 1, pageSize: 15, IdMes: 11 }),
    ).toThrow();
  });

  it('rechaza un Anno que no sea 4 dígitos en vez de ignorarlo', () => {
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('', '20', 11)),
    ).toThrow();
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('', '20261', 11)),
    ).toThrow();
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('', '202a', 11)),
    ).toThrow();
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('', '', 11)),
    ).toThrow();
  });

  it('rechaza un body sin IdMes (obligatorio: el SP devuelve 0 filas sin él)', () => {
    expect(() =>
      SearchFraccDetalladoSchema.parse({ page: 1, pageSize: 15, Anno: '2026' }),
    ).toThrow();
  });

  it('rechaza un IdMes fuera de 1-12', () => {
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('', '2026', 0)),
    ).toThrow();
    expect(() =>
      SearchFraccDetalladoSchema.parse(frontendBody('', '2026', 13)),
    ).toThrow();
  });

  it('entrega IdMes como number sin ceros a la izquierda', () => {
    // El SP filtra MES_SALDO = @id_mes con igualdad exacta: '8', nunca '08'.
    const dto = SearchFraccDetalladoSchema.parse(
      frontendBody('', '2026', '8'),
    );
    expect(dto.IdMes).toBe(8);
    expect(typeof dto.IdMes).toBe('number');
  });

  it('rechaza un page menor a 1', () => {
    expect(() =>
      SearchFraccDetalladoSchema.parse({
        page: 0,
        Anno: '2026',
        IdMes: 11,
      }),
    ).toThrow();
  });
});
