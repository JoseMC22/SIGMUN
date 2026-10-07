import { GetMotivoSchema } from './get-motivo.dto';

/**
 * Llave del valor para leer su motivo de anulación
 * (Rentas.SP_Mvalores @msquery=14). Mismas longitudes que anular.
 */
describe('GetMotivoSchema', () => {
  const base = { IdValor: '01', NumVal: '0018351', AnoVal: '2024' };

  it('acepta la llave completa', () => {
    expect(GetMotivoSchema.parse(base)).toEqual(base);
  });

  it('rechaza vacíos', () => {
    expect(() =>
      GetMotivoSchema.parse({ ...base, IdValor: '' }),
    ).toThrow();
    expect(() => GetMotivoSchema.parse({ ...base, NumVal: '' })).toThrow();
    expect(() => GetMotivoSchema.parse({ ...base, AnoVal: '' })).toThrow();
  });

  it('rechaza sobrelongitudes (2/7/4)', () => {
    expect(() =>
      GetMotivoSchema.parse({ ...base, IdValor: '001' }),
    ).toThrow();
    expect(() =>
      GetMotivoSchema.parse({ ...base, NumVal: '00000001' }),
    ).toThrow();
    expect(() =>
      GetMotivoSchema.parse({ ...base, AnoVal: '20245' }),
    ).toThrow();
  });
});
