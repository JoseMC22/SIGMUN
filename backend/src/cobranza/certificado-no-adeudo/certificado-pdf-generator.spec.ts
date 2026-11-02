import { generatePdf } from 'html-pdf-node';
import {
  buildCertificadoPdfHtml,
  esc,
  generateCertificadoPdf,
} from './certificado-pdf-generator';
import { CertificadoImpresionRow } from './certificado-no-adeudo.types';

jest.mock('html-pdf-node', () => ({ generatePdf: jest.fn() }));

const mockGeneratePdf = generatePdf as jest.MockedFunction<typeof generatePdf>;

/**
 * Blinda el HTML del certificado contra el JRXML legacy
 * (`rpt_CertificadoNoAdeudo-qr.jrxml`): numero, cuerpo, predios, recibo y
 * firma. Y que todo valor de la DB vaya escapado.
 */
describe('certificado-pdf-generator', () => {
  const fila = (
    overrides: Partial<CertificadoImpresionRow> = {},
  ): CertificadoImpresionRow => ({
    codigo: '0200182',
    nombre: 'ACASIETE UCHUYA GLORIA LAULILA',
    certNro: '0167',
    certAnio: '2025',
    concepto: 'IMPUESTO PREDIAL',
    periodo: 'HASTA EL EJERCICIO FISCAL',
    observacion: 'Y ARBITRIOS MUNICIPALES HASTA EL AÑO 2024',
    predios: 'JR. LIMA 100',
    fecha: '31 de ENERO de 2025',
    numIngr: '004220053',
    usuReg: 'AGABRIEL',
    estacionReg: 'COBRANZA-Lap01',
    anioHr: '2025',
    horaCer: '12:29:45 PM',
    documento: '21487124',
    tipoDoc: 'DNI',
    conyuge: '',
    ...overrides,
  });

  const sinImagenes = { logoDataUri: null, escudoDataUri: null };

  beforeEach(() => {
    mockGeneratePdf.mockReset();
    mockGeneratePdf.mockResolvedValue(Buffer.from('fake-pdf'));
  });

  describe('esc', () => {
    it('escapa los cinco caracteres peligrosos del HTML', () => {
      expect(esc(`<a href="x">b & 'c'</a>`)).toBe(
        '&lt;a href=&quot;x&quot;&gt;b &amp; &#39;c&#39;&lt;/a&gt;',
      );
    });

    it('devuelve cadena vacia para null o undefined', () => {
      expect(esc(null as unknown as string)).toBe('');
      expect(esc(undefined as unknown as string)).toBe('');
    });
  });

  describe('buildCertificadoPdfHtml', () => {
    it('arma el numero con el formato del legacy', () => {
      const html = buildCertificadoPdfHtml([fila()], sinImagenes);

      expect(html).toContain('N° 0167-2025-DC-SGO-G/SAT ICA');
    });

    it('incluye el cuerpo del certificado con concepto, periodo, anio y observacion', () => {
      const html = buildCertificadoPdfHtml([fila()], sinImagenes);

      expect(html).toContain('NO REGISTRA DEUDA');
      expect(html).toContain(
        'IMPUESTO PREDIAL HASTA EL EJERCICIO FISCAL 2025 Y ARBITRIOS MUNICIPALES HASTA EL AÑO 2024',
      );
      expect(html).toContain('Decreto Legislativo N° 776');
      expect(html).toContain('Ica, 31 de ENERO de 2025');
    });

    it('arma una fila por predio y descarta los repetidos y vacios', () => {
      const html = buildCertificadoPdfHtml(
        [
          fila({ predios: 'JR. LIMA 100' }),
          fila({ predios: 'JR. LIMA 100' }),
          fila({ predios: '' }),
          fila({ predios: 'JR. ICA 200' }),
        ],
        sinImagenes,
      );

      expect(html.match(/<tr><td>/g)).toHaveLength(2);
      expect(html).toContain('JR. LIMA 100');
      expect(html).toContain('JR. ICA 200');
    });

    it('sin predios no renderiza la tabla', () => {
      const html = buildCertificadoPdfHtml(
        [fila({ predios: '' })],
        sinImagenes,
      );

      expect(html).not.toContain('<table class="predios">');
    });

    it('imprime el recibo de pago cuando el SP devolvio el ingreso', () => {
      const html = buildCertificadoPdfHtml([fila()], sinImagenes);

      expect(html).toContain('RECIBO DE PAGO N° 004220053');
    });

    it('sin numero de ingreso no imprime el recibo (recibo no cancelado)', () => {
      const html = buildCertificadoPdfHtml(
        [fila({ numIngr: '' })],
        sinImagenes,
      );

      expect(html).not.toContain('RECIBO DE PAGO');
    });

    it('muestra al conyuge solo cuando el SP lo devuelve', () => {
      expect(buildCertificadoPdfHtml([fila()], sinImagenes)).not.toContain(
        'Conyuge',
      );
      expect(
        buildCertificadoPdfHtml(
          [fila({ conyuge: 'PEREZ GOMEZ ANA' })],
          sinImagenes,
        ),
      ).toContain('Conyuge PEREZ GOMEZ ANA');
    });

    it('incluye el pie con usuario y estacion de registro', () => {
      const html = buildCertificadoPdfHtml([fila()], sinImagenes);

      expect(html).toContain('AGABRIEL');
      expect(html).toContain('COBRANZA-Lap01');
    });

    it('renderiza el logo solo si hay imagen disponible', () => {
      expect(
        buildCertificadoPdfHtml([fila()], {
          logoDataUri: 'data:image/png;base64,AAA',
          escudoDataUri: null,
        }),
      ).toContain('<img class="logo"');

      expect(buildCertificadoPdfHtml([fila()], sinImagenes)).not.toContain(
        '<img class="logo"',
      );
    });

    it('escapa los valores que vienen de la DB', () => {
      const html = buildCertificadoPdfHtml(
        [fila({ nombre: 'PEÑA & <SANDRO>', observacion: '"OBS"' })],
        sinImagenes,
      );

      expect(html).toContain('PEÑA &amp; &lt;SANDRO&gt;');
      expect(html).toContain('&quot;OBS&quot;');
      expect(html).not.toContain('<SANDRO>');
    });

    it('sin filas lanza un error explicito', () => {
      expect(() => buildCertificadoPdfHtml([], sinImagenes)).toThrow(
        'Sin filas para generar el certificado',
      );
    });
  });

  describe('generateCertificadoPdf', () => {
    it('genera A4 con margenes del JRXML y fondo impreso', async () => {
      await generateCertificadoPdf([fila()], sinImagenes);

      expect(mockGeneratePdf).toHaveBeenCalledTimes(1);
      const [file, options] = mockGeneratePdf.mock.calls[0];
      expect(file.content).toContain('CERTIFICADO DE NO ADEUDO');
      expect(options).toEqual({
        format: 'A4',
        margin: { top: '7mm', right: '21mm', bottom: '7mm', left: '21mm' },
        printBackground: true,
      });
    });

    it('devuelve el buffer que produce html-pdf-node', async () => {
      const buffer = await generateCertificadoPdf([fila()], sinImagenes);

      expect(buffer.toString()).toBe('fake-pdf');
    });
  });
});
