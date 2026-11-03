import {
  MIN_CERTIFICADO_QR_SECRET_LENGTH,
  resolveCertificadoQrConfig,
} from './certificado-qr.config';

/**
 * El secreto del QR es el unico factor de autorizacion de la ruta publica:
 * si esta mal cargado (vacio, corto, con espacios) el sistema tiene que
 * detectarlo y decirlo, no emitir tokens firmados con una clave inutil.
 */
describe('certificado-qr.config', () => {
  const secretValido = 's'.repeat(MIN_CERTIFICADO_QR_SECRET_LENGTH);
  const baseUrlValida = 'https://satica.gob.pe/api/publico/certificado-no-adeudo/pdf';

  const env = (over: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv => ({
    CERTIFICADO_QR_SECRET: secretValido,
    CERTIFICADO_QR_BASE_URL: baseUrlValida,
    ...over,
  });

  it('devuelve la configuracion cuando ambas variables son validas', () => {
    const result = resolveCertificadoQrConfig(env());

    expect(result).toEqual({
      ok: true,
      config: { secret: secretValido, baseUrl: baseUrlValida },
    });
  });

  it('falla si falta el secreto', () => {
    const result = resolveCertificadoQrConfig(
      env({ CERTIFICADO_QR_SECRET: undefined }),
    );

    expect(result).toEqual({
      ok: false,
      error: 'falta CERTIFICADO_QR_SECRET',
    });
  });

  it('falla si el secreto esta vacio o es solo espacios', () => {
    expect(
      resolveCertificadoQrConfig(env({ CERTIFICADO_QR_SECRET: '   ' })),
    ).toEqual({ ok: false, error: 'falta CERTIFICADO_QR_SECRET' });
  });

  it('falla si el secreto es mas corto que el minimo', () => {
    const result = resolveCertificadoQrConfig(
      env({ CERTIFICADO_QR_SECRET: 'corto' }),
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain(
      `CERTIFICADO_QR_SECRET debe tener al menos ${MIN_CERTIFICADO_QR_SECRET_LENGTH} caracteres`,
    );
  });

  it('falla si falta la URL base', () => {
    const result = resolveCertificadoQrConfig(
      env({ CERTIFICADO_QR_BASE_URL: undefined }),
    );

    expect(result).toEqual({
      ok: false,
      error: 'falta CERTIFICADO_QR_BASE_URL',
    });
  });

  it('falla si la URL base no es una URL', () => {
    const result = resolveCertificadoQrConfig(
      env({ CERTIFICADO_QR_BASE_URL: 'no-es-una-url' }),
    );

    expect(result).toEqual({
      ok: false,
      error: 'CERTIFICADO_QR_BASE_URL no es una URL valida',
    });
  });

  it('falla si la URL base no usa http ni https', () => {
    const result = resolveCertificadoQrConfig(
      env({ CERTIFICADO_QR_BASE_URL: 'ftp://satica.gob.pe/pdf' }),
    );

    expect(result).toEqual({
      ok: false,
      error: 'CERTIFICADO_QR_BASE_URL debe usar http o https',
    });
  });

  it('acepta http en desarrollo y https en produccion', () => {
    expect(
      resolveCertificadoQrConfig(
        env({ CERTIFICADO_QR_BASE_URL: 'http://localhost:3001/pdf' }),
      ).ok,
    ).toBe(true);
    expect(
      resolveCertificadoQrConfig(
        env({ CERTIFICADO_QR_BASE_URL: 'https://satica.gob.pe/pdf' }),
      ).ok,
    ).toBe(true);
  });

  it('nunca devuelve el valor del secreto en el error', () => {
    const result = resolveCertificadoQrConfig(
      env({ CERTIFICADO_QR_SECRET: 'corto' }),
    );

    expect(result.ok ? '' : result.error).not.toContain('corto');
  });

  it('recorta los espacios del entorno antes de validar', () => {
    const result = resolveCertificadoQrConfig(
      env({
        CERTIFICADO_QR_SECRET: `  ${secretValido}  `,
        CERTIFICADO_QR_BASE_URL: `  ${baseUrlValida}  `,
      }),
    );

    expect(result).toEqual({
      ok: true,
      config: { secret: secretValido, baseUrl: baseUrlValida },
    });
  });
});
