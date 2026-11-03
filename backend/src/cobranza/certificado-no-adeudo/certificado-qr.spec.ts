import { createHmac } from 'crypto';
import {
  buildCertificadoQrPayload,
  buildCertificadoQrSvg,
  buildCertificadoQrToken,
  buildCertificadoQrUrl,
  resolveCertificadoQr,
  verifyCertificadoQrToken,
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

  /**
   * El verificador publico recibe el token desde el QR, o sea input no
   * confiable: nunca debe aceptar una firma ajena ni un payload mal formado,
   * y no debe distinguir "firma mala" de "payload malo" hacia afuera.
   */
  describe('verifyCertificadoQrToken', () => {
    const conFirma = (datos: string, clave: string): string => {
      const cuerpo = Buffer.from(datos, 'utf8').toString('base64url');
      const firma = createHmac('sha256', clave)
        .update(datos, 'utf8')
        .digest('base64url');
      return `v1.${cuerpo}.${firma}`;
    };

    it('devuelve el payload de un token valido', () => {
      const token = buildCertificadoQrToken(payload, secret);

      expect(verifyCertificadoQrToken(token, secret)).toEqual({
        codigo: '0200182',
        certNro: 170,
        certAnio: '2025',
      });
    });

    it('acepta un certificado de mas digitos en el numero', () => {
      const otro = { codigo: '0012345', certNro: 1234567, certAnio: '2024' };
      const token = buildCertificadoQrToken(otro, secret);

      expect(verifyCertificadoQrToken(token, secret)).toEqual(otro);
    });

    it('rechaza el token firmado con otro secreto', () => {
      const token = buildCertificadoQrToken(payload, 'otro-secreto');

      expect(verifyCertificadoQrToken(token, secret)).toBeNull();
    });

    it('rechaza una firma alterada', () => {
      const token = buildCertificadoQrToken(payload, secret);
      const [version, cuerpo, firma] = token.split('.');
      const alterada =
        firma.slice(0, -1) + (firma.endsWith('A') ? 'B' : 'A');

      expect(
        verifyCertificadoQrToken(`${version}.${cuerpo}.${alterada}`, secret),
      ).toBeNull();
    });

    it('rechaza un payload alterado con la firma original', () => {
      const token = buildCertificadoQrToken(payload, secret);
      const [, , firma] = token.split('.');
      const otroCuerpo = Buffer.from('0200182/171-2025', 'utf8').toString(
        'base64url',
      );

      expect(
        verifyCertificadoQrToken(`v1.${otroCuerpo}.${firma}`, secret),
      ).toBeNull();
    });

    it('rechaza un payload bien firmado pero mal formado', () => {
      expect(
        verifyCertificadoQrToken(conFirma('0200182-170/2025', secret), secret),
      ).toBeNull();
      expect(
        verifyCertificadoQrToken(conFirma('0200182/170-25', secret), secret),
      ).toBeNull();
      expect(
        verifyCertificadoQrToken(conFirma('20182/170-2025', secret), secret),
      ).toBeNull();
      expect(
        verifyCertificadoQrToken(conFirma('0200182/170-2025/x', secret), secret),
      ).toBeNull();
    });

    it('rechaza una version desconocida aunque la firma sea correcta', () => {
      const token = buildCertificadoQrToken(payload, secret).replace(
        /^v1\./,
        'v2.',
      );

      expect(verifyCertificadoQrToken(token, secret)).toBeNull();
    });

    it('rechaza tokens incompletos o vacios', () => {
      expect(verifyCertificadoQrToken('', secret)).toBeNull();
      expect(verifyCertificadoQrToken('v1', secret)).toBeNull();
      expect(verifyCertificadoQrToken('v1.solo-dos', secret)).toBeNull();
      expect(verifyCertificadoQrToken('v1..', secret)).toBeNull();
      expect(
        verifyCertificadoQrToken('v1.a.b.c', secret),
      ).toBeNull();
    });

    it('rechaza una firma con caracteres fuera de base64url', () => {
      const token = buildCertificadoQrToken(payload, secret);
      const [version, cuerpo, firma] = token.split('.');

      expect(
        verifyCertificadoQrToken(`${version}.${cuerpo}.${firma}+`, secret),
      ).toBeNull();
      expect(
        verifyCertificadoQrToken(`${version}.${cuerpo}.${firma.slice(0, 42)}`, secret),
      ).toBeNull();
    });

    it('rechaza un secreto vacio en vez de aceptar cualquier token', () => {
      expect(verifyCertificadoQrToken(buildCertificadoQrToken(payload, ''), '')).toBeNull();
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
    // La configuracion exige un secreto de al menos 32 caracteres.
    const secretConfigurable = 's'.repeat(32);

    afterEach(() => {
      process.env = { ...original };
    });

    it('sin configuracion devuelve null (el certificado se emite sin QR)', async () => {
      delete process.env.CERTIFICADO_QR_SECRET;
      delete process.env.CERTIFICADO_QR_BASE_URL;

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('con secreto pero sin baseUrl devuelve null', async () => {
      process.env.CERTIFICADO_QR_SECRET = secretConfigurable;
      delete process.env.CERTIFICADO_QR_BASE_URL;

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('con ambas variables devuelve el SVG', async () => {
      process.env.CERTIFICADO_QR_SECRET = secretConfigurable;
      process.env.CERTIFICADO_QR_BASE_URL = 'https://satica.gob.pe/documentos';

      const svg = await resolveCertificadoQr(payload);

      expect(svg).not.toBeNull();
      expect(svg?.trimStart().startsWith('<svg')).toBe(true);
    });

    it('con una baseUrl invalida devuelve null en vez de romper el PDF', async () => {
      process.env.CERTIFICADO_QR_SECRET = secretConfigurable;
      process.env.CERTIFICADO_QR_BASE_URL = 'no-es-una-url';

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('con un secreto corto devuelve null en vez de firmar con una clave debil', async () => {
      process.env.CERTIFICADO_QR_SECRET = 'corto';
      process.env.CERTIFICADO_QR_BASE_URL = 'https://satica.gob.pe/documentos';

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });
  });
});
