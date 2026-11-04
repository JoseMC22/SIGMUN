import { resolveCertificadoQrConfig } from './certificado-qr.config';

/**
 * Configuracion del QR: solo la URL del servidor de reportes. El error
 * describe la variable culpable, nunca su valor.
 */
describe('certificado-qr.config', () => {
  const baseUrlValida = 'https://reportes.satica.gob.pe:4036/sigmunreportes/index.jsp';

  const env = (over: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv => ({
    CERTIFICADO_QR_BASE_URL: baseUrlValida,
    ...over,
  });

  describe('resolveCertificadoQrConfig', () => {
    it('devuelve la configuracion cuando la URL es valida', () => {
      const result = resolveCertificadoQrConfig(env());

      expect(result).toEqual({
        ok: true,
        config: { baseUrl: baseUrlValida },
      });
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

    it('recorta los espacios de la URL antes de validar', () => {
      const result = resolveCertificadoQrConfig(
        env({ CERTIFICADO_QR_BASE_URL: `  ${baseUrlValida}  ` }),
      );

      expect(result).toEqual({
        ok: true,
        config: { baseUrl: baseUrlValida },
      });
    });
  });
});
