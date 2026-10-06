import { GetValoresSchema } from './get-valores.dto';

/** El código es obligatorio (sin código no hay valores que traer) y max 7. */
describe('GetValoresSchema', () => {
  it('acepta un codigo valido', () => {
    expect(GetValoresSchema.parse({ Codigo: '0279126' }).Codigo).toBe(
      '0279126',
    );
  });

  it('rechaza codigo vacio, ausente o mas largo que 7', () => {
    expect(() => GetValoresSchema.parse({ Codigo: '' })).toThrow();
    expect(() => GetValoresSchema.parse({})).toThrow();
    expect(() => GetValoresSchema.parse({ Codigo: '12345678' })).toThrow();
  });
});
