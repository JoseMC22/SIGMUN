import {
  buildCertificadoQrSvg,
  buildCertificadoQrUrl,
  resolveCertificadoQr,
} from './certificado-qr';

describe('certificado-qr', () => {
  const payload = { codigo: '0200182', certNro: 170, certAnio: '2025' };

  describe('buildCertificadoQrUrl', () => {
    const baseUrl = 'https://reportes.satica.gob.pe:4036/sigmunreportes/index.jsp';

    it('codifica la URL del servidor de reportes con la estructura legacy', () => {
      const url = new URL(buildCertificadoQrUrl(payload, { baseUrl }));

      expect(url.origin).toBe('https://reportes.satica.gob.pe:4036');
      expect(url.pathname).toBe('/sigmunreportes/index.jsp');
      expect(url.searchParams.get('tipo')).toBe('pdf2');
      expect(url.searchParams.get('nombrereporte')).toBe(
        'rpt_CertificadoNoAdeudo-qr',
      );
      expect(url.searchParams.get('param')).toBe(
        'codigo^0200182|cert_nro^170|cert_anio^2025',
      );
    });

    it('sigue el payload con otro certificado', () => {
      const otro = { codigo: '0012345', certNro: 42, certAnio: '2024' };
      const url = new URL(buildCertificadoQrUrl(otro, { baseUrl }));

      expect(url.searchParams.get('param')).toBe(
        'codigo^0012345|cert_nro^42|cert_anio^2024',
      );
    });

    it('respeta un baseUrl con query propio', () => {
      const url = new URL(
        buildCertificadoQrUrl(payload, {
          baseUrl: `${baseUrl}?origen=qr`,
        }),
      );

      expect(url.searchParams.get('origen')).toBe('qr');
      expect(url.searchParams.get('tipo')).toBe('pdf2');
      expect(url.searchParams.get('param')).not.toBeNull();
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
    const baseUrlReportes =
      'https://reportes.satica.gob.pe:4036/sigmunreportes/index.jsp';

    afterEach(() => {
      process.env = { ...original };
    });

    it('sin configuracion devuelve null (el certificado se emite sin QR)', async () => {
      delete process.env.CERTIFICADO_QR_SECRET;
      delete process.env.CERTIFICADO_QR_BASE_URL;

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('sin baseUrl devuelve null (el certificado se emite sin QR)', async () => {
      delete process.env.CERTIFICADO_QR_BASE_URL;

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });

    it('con la configuracion valida devuelve el SVG', async () => {
      process.env.CERTIFICADO_QR_SECRET = 's'.repeat(32);
      process.env.CERTIFICADO_QR_BASE_URL = baseUrlReportes;

      const svg = await resolveCertificadoQr(payload);

      expect(svg).not.toBeNull();
      expect(svg?.trimStart().startsWith('<svg')).toBe(true);
    });

    it('genera el SVG aunque falte CERTIFICADO_QR_SECRET', async () => {
      delete process.env.CERTIFICADO_QR_SECRET;
      process.env.CERTIFICADO_QR_BASE_URL = baseUrlReportes;

      const svg = await resolveCertificadoQr(payload);

      expect(svg).not.toBeNull();
      expect(svg?.trimStart().startsWith('<svg')).toBe(true);
    });

    it('con una baseUrl invalida devuelve null en vez de romper el PDF', async () => {
      process.env.CERTIFICADO_QR_BASE_URL = 'no-es-una-url';

      expect(await resolveCertificadoQr(payload)).toBeNull();
    });
  });
});
