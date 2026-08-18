/// <reference types="jest" />

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  esc,
  fmt,
  buildDeclaracionPdfHtml,
  generateDeclaracionPdf,
  loadLogoDataUri,
  DeclaracionPdfOptions,
} from './declaracion-pdf-generator';
import { DeclaracionPdfRow } from './dto/declaracion-pdf-row.dto';

jest.mock('html-pdf-node', () => ({ generatePdf: jest.fn() }));

function declRow(overrides: Partial<DeclaracionPdfRow> = {}): DeclaracionPdfRow {
  return {
    codigo_compra: 'C001',
    comprador: 'JUAN PEREZ',
    comprador_fiscal: 'AV. SOL 100',
    comprador_dni: '12345678',
    codigo_venta: 'V001',
    vendedor: 'MARIA LOPEZ',
    vendedor_fiscal: 'JR. LUNA 200',
    vendedor_dni: '87654321',
    contrato: 'CONTRATO-001',
    direccion_predio: 'CALLE REAL 50',
    fecha_contrato: '01/02/2026',
    tipo_pred: '1',
    monto_letras: 'SON MIL SOLES',
    observacion: 'SIN OBSERVACIONES',
    usuario_ing: 'jadmin',
    fecha_ing: '01/02/2026 10:00:00',
    transferencia: 100000,
    autoavaluo: 95000,
    monto_inafecto: 0,
    monto_afecto: 100000,
    mora: 500,
    tasa_impuesto: 3,
    monto_alcabala: 3000,
    total_alcabala: 3500,
    base_imponible: 100000,
    ...overrides,
  };
}

const opts: DeclaracionPdfOptions = {
  usuario: 'jperez',
  fecha: '01/02/2026 12:00:00',
  logoDataUri: null,
};

describe('esc (T7 — generator)', () => {
  it('escapes & < > " \'', () => {
    expect(esc(`A & B < C > D "E" F 'G'`)).toBe(
      'A &amp; B &lt; C &gt; D &quot;E&quot; F &#39;G&#39;',
    );
  });
});

describe('fmt (T7 — generator)', () => {
  it('formats numbers as S/. #,##0.00', () => {
    expect(fmt(1234.5)).toBe('S/. 1,234.50');
    expect(fmt(0)).toBe('S/. 0.00');
    expect(fmt(3000)).toBe('S/. 3,000.00');
  });
});

describe('buildDeclaracionPdfHtml (T7 — generator)', () => {
  const row = declRow();
  const html = buildDeclaracionPdfHtml(row, opts);

  it('contains title, RECEPCIÓN, sections, firmas and footer', () => {
    expect(html).toContain('IMPUESTO DE ALCABALA');
    expect(html).toContain('RECEPCIÓN');
    expect(html).toContain('COMPRADOR');
    expect(html).toContain('VENDEDOR');
    expect(html).toContain('DATOS GENERALES');
    expect(html).toContain('CÁLCULO DEL IMPUESTO');
    expect(html).toContain('MONTO DE LA ALCABALA');
    expect(html).toContain('OBSERVACIONES');
    expect(html).toContain('FIRMAS');
    expect(html).toContain('USUARIO');
    expect(html).toContain('FECHA');
  });

  it('renders formatted amounts with S/.', () => {
    expect(html).toContain('S/. 3,000.00'); // monto_alcabala
    expect(html).toContain('S/. 100,000.00'); // transferencia
    expect(html).toContain(esc('JUAN PEREZ')); // comprador
    expect(html).toContain(esc('CALLE REAL 50')); // direccion_predio
  });

  it('prints tipo_pred 1/2 as-is (no transformation)', () => {
    const html1 = buildDeclaracionPdfHtml(declRow({ tipo_pred: '1' }), opts);
    const html2 = buildDeclaracionPdfHtml(declRow({ tipo_pred: '2' }), opts);
    expect(html1).toContain(
      '<td class="lbl">TIPO DE PREDIO</td><td>1</td>',
    );
    expect(html2).toContain(
      '<td class="lbl">TIPO DE PREDIO</td><td>2</td>',
    );
  });

  it('embeds logo when provided, omits it when null', () => {
    const withLogo = buildDeclaracionPdfHtml(row, {
      ...opts,
      logoDataUri: 'data:image/png;base64,AAAA',
    });
    expect(withLogo).toContain('<img');
    expect(withLogo).toContain('data:image/png;base64,AAAA');

    const noLogo = buildDeclaracionPdfHtml(row, {
      ...opts,
      logoDataUri: null,
    });
    expect(noLogo).not.toContain('<img');
  });

  it('includes A4 page CSS without CSS margins (margins come from pdf options)', () => {
    expect(html).toContain('@page');
    expect(html).toContain('size: A4');
  });
});

describe('generateDeclaracionPdf (T7 — generator)', () => {
  const mockGeneratePdf = () =>
    (jest.requireMock('html-pdf-node') as { generatePdf: jest.Mock })
      .generatePdf;

  it('renders A4 PDF with 30/30/20/20 margins and returns buffer', async () => {
    mockGeneratePdf().mockResolvedValue(Buffer.from('fake-pdf'));

    const buffer = await generateDeclaracionPdf(declRow(), opts);

    expect(mockGeneratePdf()).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('IMPUESTO DE ALCABALA'),
      }),
      expect.objectContaining({
        format: 'A4',
        margin: { top: '30px', right: '30px', bottom: '20px', left: '20px' },
        printBackground: true,
      }),
    );
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe('fake-pdf');
  });
});

describe('loadLogoDataUri (T7 — generator)', () => {
  const tmp = path.join(os.tmpdir(), 'decl-logo-test');
  afterAll(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('returns null when path is undefined', async () => {
    expect(await loadLogoDataUri(undefined)).toBeNull();
  });

  it('returns null for a missing file', async () => {
    expect(await loadLogoDataUri(path.join(tmp, 'nope.png'))).toBeNull();
  });

  it('returns null for non-image bytes', async () => {
    fs.mkdirSync(tmp, { recursive: true });
    const p = path.join(tmp, 'bad.txt');
    fs.writeFileSync(p, 'not an image');
    expect(await loadLogoDataUri(p)).toBeNull();
  });

  it('returns null for an oversized valid-magic file (>1MB)', async () => {
    const p = path.join(tmp, 'big.png');
    const buf = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(1024 * 1024 + 5000, 0),
    ]);
    fs.writeFileSync(p, buf);
    expect(await loadLogoDataUri(p)).toBeNull();
  });

  it('returns a data URI for a valid PNG', async () => {
    const p = path.join(tmp, 'ok.png');
    fs.writeFileSync(
      p,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const uri = await loadLogoDataUri(p);
    expect(uri).toMatch(/^data:image\/png;base64,/);
  });

  it('returns a data URI for a valid JPEG', async () => {
    const p = path.join(tmp, 'ok.jpg');
    fs.writeFileSync(p, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    const uri = await loadLogoDataUri(p);
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);
  });
});
