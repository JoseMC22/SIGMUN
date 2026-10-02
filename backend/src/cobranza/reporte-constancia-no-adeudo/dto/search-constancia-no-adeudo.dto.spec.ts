import { SearchConstanciaNoAdeudoSchema } from './search-constancia-no-adeudo.dto';

/**
 * Verifica el contrato de transporte del body que arma el frontend en
 * actions/cobranza/reporte-constancia-no-adeudo.ts.
 *
 * Por qué importa: zod NO valida ni complains de claves desconocidas, las
 * descarta. Si el action mandara `codigo` en minúscula en vez de `Codigo`,
 * el DTO devolvería Codigo: '' y el SP traería TODOS los registros sin
 * ningún error visible. Estos tests son la única red contra esa trampa.
 */
describe('SearchConstanciaNoAdeudoSchema', () => {
  // Body exacto que produce el server action (Codigo con C mayúscula).
  const frontendBody = (codigo: string) => ({
    page: 1,
    pageSize: 20,
    Codigo: codigo,
    fini: '2026-01-01',
    ffin: '2026-12-31',
  });

  it('entrega Codigo al service cuando se busca por codigo', () => {
    const dto = SearchConstanciaNoAdeudoSchema.parse(frontendBody('0282418'));
    expect(dto.Codigo).toBe('0282418');
  });

  it('preserva los ceros a la izquierda del codigo (llega como string)', () => {
    const dto = SearchConstanciaNoAdeudoSchema.parse(frontendBody('0001234'));
    expect(dto.Codigo).toBe('0001234');
    expect(typeof dto.Codigo).toBe('string');
  });

  it('normaliza a "" el codigo ausente, para que el SP reciba un valor y no null', () => {
    const dto = SearchConstanciaNoAdeudoSchema.parse({ page: 1, pageSize: 20 });
    expect(dto.Codigo).toBe('');
    expect(dto.fini).toBe('');
    expect(dto.ffin).toBe('');
  });

  it('descarta en silencio una clave Codigo en minúscula (trampa documentada)', () => {
    const parsed = SearchConstanciaNoAdeudoSchema.parse({
      page: 1,
      pageSize: 20,
      codigo: '0282418', // snake/lowercase: NO es la clave del contrato
    });
    // Esto es exactamente lo que haría que el SP devuelva todo sin avisar.
    expect(parsed.Codigo).toBe('');
  });

  it('acepta solo el conjunto pageSize {20, 100000}', () => {
    expect(SearchConstanciaNoAdeudoSchema.parse({ pageSize: 20 }).pageSize).toBe(20);
    expect(SearchConstanciaNoAdeudoSchema.parse({ pageSize: 100000 }).pageSize).toBe(100000);
    expect(() => SearchConstanciaNoAdeudoSchema.parse({ pageSize: 15 })).toThrow();
    expect(() => SearchConstanciaNoAdeudoSchema.parse({ pageSize: 10 })).toThrow();
    expect(() => SearchConstanciaNoAdeudoSchema.parse({ pageSize: 100 })).toThrow();
  });

  it('rechaza un Codigo mas largo que 20 caracteres', () => {
    expect(() => SearchConstanciaNoAdeudoSchema.parse(frontendBody('1'.repeat(21)))).toThrow();
  });
});
