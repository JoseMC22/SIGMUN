import { AnularValorSchema } from './anular-valor.dto';

/**
 * Contrato de POST /cobranza/anular-valor/anular:
 * - llave completa del valor (Codigo/IdValor/NumVal/AnoVal) con sus maximos,
 * - motivo 20-250 caracteres sobre el texto recortado (trim),
 * - operador opcional con default ''.
 */
describe('AnularValorSchema', () => {
  const valid = {
    Codigo: '0279126',
    IdValor: '01',
    NumVal: '0018351',
    AnoVal: '2024',
    Motivo: 'Error de carga del valor en el periodo 2024',
    Operador: 'mvaez',
  };

  it('acepta una peticion valida y recorta el motivo', () => {
    const parsed = AnularValorSchema.parse({
      ...valid,
      Motivo: `   ${valid.Motivo}   `,
    });
    expect(parsed.Motivo).toBe(valid.Motivo);
    expect(parsed.Operador).toBe('mvaez');
  });

  it('omite Operador y lo rellena con ""', () => {
    const sinOperador = { ...valid, Operador: undefined };
    expect(AnularValorSchema.parse(sinOperador).Operador).toBe('');
  });

  it('exige la llave completa (sin campo o vacio falla)', () => {
    for (const key of [
      'Codigo',
      'IdValor',
      'NumVal',
      'AnoVal',
      'Motivo',
    ] as const) {
      expect(() =>
        AnularValorSchema.parse({ ...valid, [key]: undefined }),
      ).toThrow();
      expect(() => AnularValorSchema.parse({ ...valid, [key]: '' })).toThrow();
    }
  });

  it('respeta los maximos de la llave (7/2/7/4)', () => {
    expect(() =>
      AnularValorSchema.parse({ ...valid, Codigo: '12345678' }),
    ).toThrow();
    expect(() =>
      AnularValorSchema.parse({ ...valid, IdValor: '123' }),
    ).toThrow();
    expect(() =>
      AnularValorSchema.parse({ ...valid, NumVal: '12345678' }),
    ).toThrow();
    expect(() =>
      AnularValorSchema.parse({ ...valid, AnoVal: '12345' }),
    ).toThrow();
  });

  it('rechaza motivo corto con el mensaje del contrato', () => {
    expect(() =>
      AnularValorSchema.parse({ ...valid, Motivo: 'corto' }),
    ).toThrow('El motivo debe tener al menos 20 caracteres');
    // El trim va antes del min: 20 espacios no son 20 caracteres.
    expect(() =>
      AnularValorSchema.parse({ ...valid, Motivo: ' '.repeat(20) }),
    ).toThrow('El motivo debe tener al menos 20 caracteres');
  });

  it('rechaza motivo de 251+ chars (max 250)', () => {
    expect(() =>
      AnularValorSchema.parse({ ...valid, Motivo: 'a'.repeat(251) }),
    ).toThrow();
    expect(
      AnularValorSchema.parse({ ...valid, Motivo: 'a'.repeat(250) }).Motivo,
    ).toHaveLength(250);
  });
});
