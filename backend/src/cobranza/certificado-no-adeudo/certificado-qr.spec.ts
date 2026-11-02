import {
  buildCertificadoQrPayload,
  buildCertificadoQrSvg,
  buildCertificadoQrToken,
  buildCertificadoQrUrl,
  resolveCertificadoQr,
} from './certificado-qr';

/**
 * El token tiene que ser verificable por el sistema: payload legible y firma
 * HMAC. Nada de cifrado propietario del legacy, cuya clase Java
 * (`encriptar.TextoEncryptor`) no esta en el repositorio.
 */
describe('certificado-qr', () => {
  const payload = { codigo: '0200182', certNro: 170, certAnio: '2025' };
  const secret = 'secreto-de-prueba';

  describe('buildCertificadoQrPayload', () => {
    it('usa la misma forma que el legacy: codigo/certNro-certAnio', () => {
      expect(buildCertificadoQrPayload(payload)).toBe('0200182/170-2025');
    });
  });

  describe('buildCertificadoQrToken', () => {
    it('arma v1.<payload base64url>.<hmac base64url>', () => {
      const token = buildCertificadoQrToken(payload, secret);
      const partes = token.split('.');

      expect(partes).toHaveLength(3);
      expect(partes[0]).toBe('v1');
      expect(Buffer.from(partes[1], 'base64url').toString('utf8')).toBe(
        '0200182/170-2025',
      );
      expect(partes[2]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('es determinista para el mismo payload y secreto', () => {
      expect(buildCertificadoQrToken(payload, secret)).toBe(
        buildCertificadoQrToken(payload, secret),
      );
    });

    it('cambia la firma con otro secreto', () => {
      expect(buildCertificadoQrToken(payload, secret)).not.toBe(
        buildCertificadoQrToken(payload, 'otro-secreto'),
      );
    });

    it('cambia el token con otro certificado', () => {
      expect(buildCertificadoQrToken(payload, secret)).not.toBe(
        buildCertificadoQrToken({ ...payload, certNro: 171 }, secret),
      );
    });

    it('solo usa caracteres seguros para una URL', () => {
      expect(buildCertificadoQrToken(payload, secret)).toMatch(
        /^[A-Za-z0-9._-]+$/,
      );
    });
  });

  describe('buildCertificadoQrUrl', () => {
    it('pone el token en el parametro codigo', () => {
      const url = new URL(
        buildCertificadoQrUrl(payload, {
          secret,
          baseUrl: 'https://satica.gob.pe/documentos',
        }),
      );

      expect(url.origin).toBe('https://satica.gob.pe');
      expect(url.pathname).toBe('/documentos');
      expect(url.searchParams.get('codigo')).toBe(
        buildCertificadoQrToken(payload, secret),
      );
    });

    it('respeta un baseUrl con query propio', () => {
      const url = new URL(
        buildCertificadoQrUrl(payload, {
          secret,
          baseUrl: 'https://sigmun.ica.gob.pe/verificar?tipo=certificado',
        }),
      );

      expect(url.searchParams.get('tipo')).toBe('certificado');
      expect(url.searchParams.get('codigo')).not.toBeNull();
    });
  });

  describe('buildCertificadoQrSvg', () => {
    it('devuelve un SVG inline', async () => {
      const svg = await buildCertificadoQrSvg('https://satica.gob.pe/x');

      expect(svg.trimStart().startsWith('<svg')).toBe(true);
      expect(svg).toContain('</svg>');
    });
  });

  describe('resolveCertificadoQr', () => {
    const original = { ...process.env };

    afterEach(() => {
      process.env = { ...original };
    });

    it('sin configuracion devuelve null (el certificado se emite sin QR)', async () => {
      delete process.env.CERTIFICADO_QR_SECRET;
      delete process.env.CERTIFICADO_QR_BASE_URL;

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('con secreto pero sin baseUrl devuelve null', async () => {
      process.env.CERTIFICADO_QR_SECRET = secret;
      delete process.env.CERTIFICADO_QR_BASE_URL;

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('con ambas variables devuelve el SVG', async () => {
      process.env.CERTIFICADO_QR_SECRET = secret;
      process.env.CERTIFICADO_QR_BASE_URL = 'https://satica.gob.pe/documentos';

      const svg = await resolveCertificadoQr(payload);

      expect(svg).not.toBeNull();
      expect(svg?.trimStart().startsWith('<svg')).toBe(true);
    });

    it('con una baseUrl invalida devuelve null en vez de romper el PDF', async () => {
      process.env.CERTIFICADO_QR_SECRET = secret;
      process.env.CERTIFICADO_QR_BASE_URL = 'no-es-una-url';

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });
  });
});
