import { CatalogosFraccDetalladoSchema } from './catalogos-fracc-detallado.dto';

/**
 * Verifica el contrato del body del endpoint /catalogos: sin Anno solo se piden
 * los años, con Anno se agregan los meses del año. Un Anno mal formado se
 * rechaza en vez de ignorarse: si se descartara en silencio el combo mostraría
 * meses de otro año sin avisar.
 */
describe('CatalogosFraccDetalladoSchema', () => {
  it('acepta un body sin Anno (solo años)', () => {
    const dto = CatalogosFraccDetalladoSchema.parse({});
    expect(dto.Anno).toBeUndefined();
  });

  it('acepta un Anno de 4 dígitos (agrega meses de ese año)', () => {
    const dto = CatalogosFraccDetalladoSchema.parse({ Anno: '2026' });
    expect(dto.Anno).toBe('2026');
  });

  it('coerce un Anno numérico a string', () => {
    const dto = CatalogosFraccDetalladoSchema.parse({ Anno: 2026 });
    expect(dto.Anno).toBe('2026');
    expect(typeof dto.Anno).toBe('string');
  });

  it('rechaza un Anno que no sea 4 dígitos en vez de ignorarlo', () => {
    expect(() => CatalogosFraccDetalladoSchema.parse({ Anno: '20' })).toThrow();
    expect(() =>
      CatalogosFraccDetalladoSchema.parse({ Anno: '20261' }),
    ).toThrow();
    expect(() =>
      CatalogosFraccDetalladoSchema.parse({ Anno: '202a' }),
    ).toThrow();
    expect(() => CatalogosFraccDetalladoSchema.parse({ Anno: '' })).toThrow();
  });
});
