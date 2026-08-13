/// <reference types="jest" />

import { mapOpPdfRow } from './impresion-dj-alcabala.service';
import { buildOpPdfHtml, generateOpPdf } from './op-pdf-generator';
import { OpPdfRow } from './dto/op-pdf-row.dto';

jest.mock('html-pdf-node', () => ({
  generatePdf: jest.fn(),
}));

// Helper: canonical SP row with all 35 sp_ImprimeOP columns
function opRow(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id_valor: '08',
    num_val: '0000229',
    ano_val: '2025',
    numerOP: '00001234',
    fec_val: '05/02/2026',
    fecvaln: '05/03/2026',
    codigo: '0012345',
    nombre: 'JUAN CARLOS GARCIA LOPEZ',
    num_doc: '12345678',
    Dirfiscal: 'AV. LOS OLIVOS 123',
    anno: '2025',
    cadenaUIT: 'UIT 2025 S/ 5,350.00',
    rtramo01: '1° TRAMO',
    rtramo02: '2° TRAMO',
    rtramo03: '3° TRAMO',
    base_imponible1: 120000,
    imp_anual1: 3600,
    cuotas: '4',
    imp_insol: 900,
    imp_insoltexto: 'SON NOVECIENTOS CON 00/100 SOLES',
    imp_reaj: 45.5,
    mora: 12.3,
    costo_emis: 8.5,
    costo_emistexto: 'COSTO DE EMISION',
    imp_total: 966.3,
    imp_totaltexto: 'SON NOVECIENTOS SESENTA Y SEIS CON 30/100 SOLES',
    cuota_rej: '1',
    cuota_mor: '1',
    direccion: 'AV. LOS OLIVOS 123',
    fecha: '05/02/2026',
    moratorio: '2.5%',
    fech_proyectado: '05/03/2026',
    cod_pred: 'P001',
    fvencimiento: '28/02/2026',
    periodoRomano: 'FEBRERO 2026',
    ...overrides,
  };
}

describe('mapOpPdfRow (T3)', () => {
  it('should map all 35 SP columns into the DTO', () => {
    const mapped: OpPdfRow = mapOpPdfRow(opRow());

    expect(Object.keys(mapped)).toHaveLength(35);
    expect(mapped).toEqual({
      id_valor: '08',
      num_val: '0000229',
      ano_val: '2025',
      numerOP: '00001234',
      fec_val: '05/02/2026',
      fecvaln: '05/03/2026',
      codigo: '0012345',
      nombre: 'JUAN CARLOS GARCIA LOPEZ',
      num_doc: '12345678',
      Dirfiscal: 'AV. LOS OLIVOS 123',
      anno: '2025',
      cadenaUIT: 'UIT 2025 S/ 5,350.00',
      rtramo01: '1° TRAMO',
      rtramo02: '2° TRAMO',
      rtramo03: '3° TRAMO',
      base_imponible1: 120000,
      imp_anual1: 3600,
      cuotas: '4',
      imp_insol: 900,
      imp_insoltexto: 'SON NOVECIENTOS CON 00/100 SOLES',
      imp_reaj: 45.5,
      mora: 12.3,
      costo_emis: 8.5,
      costo_emistexto: 'COSTO DE EMISION',
      imp_total: 966.3,
      imp_totaltexto: 'SON NOVECIENTOS SESENTA Y SEIS CON 30/100 SOLES',
      cuota_rej: '1',
      cuota_mor: '1',
      direccion: 'AV. LOS OLIVOS 123',
      fecha: '05/02/2026',
      moratorio: '2.5%',
      fech_proyectado: '05/03/2026',
      cod_pred: 'P001',
      fvencimiento: '28/02/2026',
      periodoRomano: 'FEBRERO 2026',
    });
  });

  it('should resolve columns case-insensitively (UPPERCASE keys + Dirfiscal mixed case)', () => {
    // Single-casing row: one key per column, mostly UPPERCASE, Dirfiscal mixed case
    const row = {
      ID_VALOR: '08',
      NUM_VAL: '0000229',
      ANO_VAL: '2025',
      NUMEROP: '00009999',
      FEC_VAL: '01/01/2026',
      FECVALN: '02/01/2026',
      CODIGO: '9999999',
      NOMBRE: 'MARIA QUISPE',
      NUM_DOC: '87654321',
      Dirfiscal: 'JR. LIMA 456',
      ANNO: '2024',
      CADENAUIT: 'UIT 2024 S/ 5,150.00',
      RTRAMO01: 'TRAMO A',
      RTRAMO02: 'TRAMO B',
      RTRAMO03: 'TRAMO C',
      BASE_IMPONIBLE1: 80000,
      IMP_ANUAL1: 2400,
      CUOTAS: '2',
      IMP_INSOL: 500,
      IMP_INSOLTEXTO: 'QUINIENTOS',
      IMP_REAJ: 10,
      MORA: 5,
      COSTO_EMIS: 4,
      COSTO_EMISTEXTO: 'EMISION',
      IMP_TOTAL: 519,
      IMP_TOTALTEXTO: 'QUINIENTOS DIECINUEVE',
      CUOTA_REJ: '0',
      CUOTA_MOR: '0',
      DIRECCION: 'JR. LIMA 456',
      FECHA: '01/01/2026',
      MORATORIO: '0%',
      FECH_PROYECTADO: '02/01/2026',
      COD_PRED: 'P999',
      FVENCIMIENTO: '31/01/2026',
      PERIODOROMANO: 'ENERO 2026',
    };

    const mapped: OpPdfRow = mapOpPdfRow(row);

    expect(mapped.numerOP).toBe('00009999');
    expect(mapped.nombre).toBe('MARIA QUISPE');
    expect(mapped.Dirfiscal).toBe('JR. LIMA 456');
    expect(mapped.periodoRomano).toBe('ENERO 2026');
    expect(mapped.base_imponible1).toBe(80000);
    expect(mapped.imp_total).toBe(519);
  });

  it('should resolve lowercase dirfiscal variant to Dirfiscal', () => {
    const row = opRow();
    delete row.Dirfiscal;
    row.dirfiscal = 'JR. PRINCIPAL 789';
    const mapped: OpPdfRow = mapOpPdfRow(row);
    expect(mapped.Dirfiscal).toBe('JR. PRINCIPAL 789');
  });

  it('should default missing optional string columns to empty string', () => {
    const { fvencimiento, periodoRomano, ...rest } = opRow();
    const mapped: OpPdfRow = mapOpPdfRow(rest);
    expect(mapped.fvencimiento).toBe('');
    expect(mapped.periodoRomano).toBe('');
  });

  it('should default missing numeric columns to 0', () => {
    const { imp_insol, imp_reaj, mora, costo_emis, imp_total, base_imponible1, imp_anual1, ...rest } = opRow();
    const mapped: OpPdfRow = mapOpPdfRow(rest);
    expect(mapped.imp_insol).toBe(0);
    expect(mapped.imp_reaj).toBe(0);
    expect(mapped.mora).toBe(0);
    expect(mapped.costo_emis).toBe(0);
    expect(mapped.imp_total).toBe(0);
    expect(mapped.base_imponible1).toBe(0);
    expect(mapped.imp_anual1).toBe(0);
  });

  it('should coerce numeric strings from the SP into numbers', () => {
    const mapped: OpPdfRow = mapOpPdfRow(opRow({ imp_total: '966.30', mora: '12.30' }));
    expect(mapped.imp_total).toBe(966.3);
    expect(mapped.mora).toBe(12.3);
  });
});

describe('generateOpPdf (T4 — PDF)', () => {
  const mockGeneratePdf = (): jest.Mock =>
    (jest.requireMock('html-pdf-node') as { generatePdf: jest.Mock })
      .generatePdf;

  it('should render the OP blocks and return an A4 PDF buffer', async () => {
    mockGeneratePdf().mockResolvedValue(Buffer.from('fake-pdf'));

    const buffer = await generateOpPdf([
      mapOpPdfRow(opRow()),
      mapOpPdfRow(opRow({ numerOP: '00005555' })),
    ]);

    expect(mockGeneratePdf()).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('ORDEN DE PAGO'),
      }),
      { format: 'A4', margin: 0, printBackground: true },
    );
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe('fake-pdf');
  });

  it('should rethrow html-pdf-node errors instead of wrapping them', async () => {
    mockGeneratePdf().mockRejectedValue(new Error('render failed'));

    await expect(generateOpPdf([mapOpPdfRow(opRow())])).rejects.toThrow(
      'render failed',
    );
  });
});

describe('buildOpPdfHtml (T4 — pure)', () => {
  const countPageBreaks = (html: string): number =>
    (html.match(/class="page-break"/g) ?? []).length;

  it('should render one format block per SP row', () => {
    const html = buildOpPdfHtml([
      mapOpPdfRow(opRow()),
      mapOpPdfRow(opRow({ numerOP: '00005555' })),
    ]);
    expect(html).toContain('ORDEN DE PAGO');
    expect(html).toContain('00001234');
    expect(html).toContain('00005555');
  });

  it('should page-break after every 2 blocks (2 rows → 1 break)', () => {
    const html = buildOpPdfHtml([mapOpPdfRow(opRow()), mapOpPdfRow(opRow())]);
    expect(countPageBreaks(html)).toBe(1);
  });

  it('should render a single block with no trailing page break (1 row)', () => {
    const html = buildOpPdfHtml([mapOpPdfRow(opRow())]);
    expect(countPageBreaks(html)).toBe(0);
  });

  it('should page-break after every 2 blocks (3 rows → 1 break, remainder on last page)', () => {
    const html = buildOpPdfHtml([
      mapOpPdfRow(opRow()),
      mapOpPdfRow(opRow()),
      mapOpPdfRow(opRow()),
    ]);
    expect(countPageBreaks(html)).toBe(1);
  });

  it('should include A4 page CSS', () => {
    const html = buildOpPdfHtml([mapOpPdfRow(opRow())]);
    expect(html).toContain('@page');
    expect(html).toContain('size: A4');
  });
});
