import { SearchFraccCuotasImpagasSchema } from './search-fracc-cuotas-impagas.dto';

/**
 * Verifica el contrato de transporte del body que arma el frontend en
 * actions/cobranza/reporte-fracc-cuotas-impagas.ts.
 *
 * Por qué importa: zod NO valida ni complain de claves desconocidas, las descarta.
 * Si el action mandara `codigo` en minúscula en vez de `Codigo`, el DTO devolvería
 * Codigo: '' y el reporte traería TODOS los registros sin ningún error visible.
 * Estos tests son la única red contra esa trampa.
 */
describe('SearchFraccCuotasImpagasSchema', () => {
  // Body exacto que produce el server action.
  const frontendBody = (codigo: string, fechCorte: string) => ({
    page: 1,
    pageSize: 15,
    Codigo: codigo,
    FechCorte: fechCorte,
  });

  it('entrega Codigo al service cuando se busca por codigo', () => {
    const dto = SearchFraccCuotasImpagasSchema.parse(frontendBody('0200274', ''));
    expect(dto.Codigo).toBe('0200274');
  });

  it('preserva los ceros a la izquierda del codigo (llega como string)', () => {
    const dto = SearchFraccCuotasImpagasSchema.parse(frontendBody('0001234', ''));
    expect(dto.Codigo).toBe('0001234');
    expect(typeof dto.Codigo).toBe('string');
  });

  it('normaliza a "" el codigo y la fecha ausentes', () => {
    const dto = SearchFraccCuotasImpagasSchema.parse({ page: 1, pageSize: 15 });
    expect(dto.Codigo).toBe('');
    expect(dto.FechCorte).toBe('');
  });

  it('descarta en silencio una clave Codigo en minúscula (trampa documentada)', () => {
    const parsed = SearchFraccCuotasImpagasSchema.parse({
      page: 1,
      pageSize: 15,
      codigo: '0200274', // snake/lowercase: NO es la clave del contrato
    });
    // Esto es exactamente lo que haría que el SP devuelva todo sin avisar.
    expect(parsed.Codigo).toBe('');
  });

  it('acepta solo el conjunto pageSize {15, 100000}', () => {
    expect(SearchFraccCuotasImpagasSchema.parse({ pageSize: 15 }).pageSize).toBe(15);
    expect(SearchFraccCuotasImpagasSchema.parse({ pageSize: 100000 }).pageSize).toBe(100000);
    expect(() => SearchFraccCuotasImpagasSchema.parse({ pageSize: 20 })).toThrow();
    expect(() => SearchFraccCuotasImpagasSchema.parse({ pageSize: 10 })).toThrow();
    expect(() => SearchFraccCuotasImpagasSchema.parse({ pageSize: 100 })).toThrow();
  });

  it('rechaza un Codigo mas largo que 7 caracteres (varchar(7) del SP)', () => {
    expect(() =>
      SearchFraccCuotasImpagasSchema.parse(frontendBody('12345678', '')),
    ).toThrow();
  });

  it('rechaza una FechCorte que no sea YYYY-MM-DD en vez de ignorarla', () => {
    // Ignorarla en silencio haría que la pantalla prometa un filtro por fecha de corte
    // y muestre el listado completo.
    expect(() =>
      SearchFraccCuotasImpagasSchema.parse(frontendBody('', '05/09/2016')),
    ).toThrow();
    expect(() =>
      SearchFraccCuotasImpagasSchema.parse(frontendBody('', '2026/03/09')),
    ).toThrow();
    expect(() =>
      SearchFraccCuotasImpagasSchema.parse(frontendBody('', 'ayer')),
    ).toThrow();
  });

  it('acepta una FechCorte vacia, que es el caso sin filtro de fecha', () => {
    const dto = SearchFraccCuotasImpagasSchema.parse(frontendBody('', ''));
    expect(dto.FechCorte).toBe('');
  });

  it('acepta una FechCorte ISO valida', () => {
    const dto = SearchFraccCuotasImpagasSchema.parse(frontendBody('', '2026-03-09'));
    expect(dto.FechCorte).toBe('2026-03-09');
  });

  it('rechaza un page menor a 1', () => {
    expect(() => SearchFraccCuotasImpagasSchema.parse({ page: 0 })).toThrow();
  });
});