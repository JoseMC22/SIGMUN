/// <reference types="jest" />

import { buildOpPdfHtml, generateOpPdf } from './op-pdf-generator';
import { OpImpresionRow } from './generar-op.types';

jest.mock('html-pdf-node', () => ({
  generatePdf: jest.fn(),
}));

/** Fila real de `Rentas.sp_ImprimeOP @buscar=2` para la OP 0000025-2026. */
function opRow(overrides: Partial<OpImpresionRow> = {}): OpImpresionRow {
  return {
    id_valor: '11',
    num_val: '0000025',
    ano_val: '2026',
    numerOP:
      'Orden de Pago Vehicular Nº 0000025-2026-VEH-DC-SGO-G/SAT-ICA',
    fec_val: '21/10/2026',
    fecvaln: null,
    codigo: '0281986',
    nombre: 'HUAROTO CONISLLA TERESA JESUS',
    num_doc: '21568241',
    Dirfiscal:
      'PP.JJ. LOS ANGELES -  MZ LOS ANGELES NRO. 00157 MZ K LTE 16',
    anno: '2017',
    cadenaUIT: '2017=4050.00',
    rtramo01: 505,
    rtramo02: 0,
    rtramo03: 0,
    base_imponible1: '50,500.00',
    imp_anual1: '505.00',
    cuotas: '01, 04, 02, 03',
    imp_insol: 512.6,
    imp_insoltexto: '505.00',
    imp_reaj: 0,
    mora: 591.45,
    costo_emis: 7.6,
    costo_emistexto: '7.60',
    imp_total: 1104.05,
    imp_totaltexto: '1,104.05',
    cuota_rej:
      '2017-01-1.00000, 2017-04-1.00000, 2017-02-1.00000, 2017-03-1.00000, 2017-01-1.00000',
    cuota_mor:
      '2017-01-1.22630, 2017-04-1.11630, 2017-01-1.18950, 2017-03-1.15270, 2017-01-0.00000',
    direccion:
      'PP.JJ. LOS ANGELES -  MZ LOS ANGELES NRO. 00157 MZ K LTE 16',
    fecha: 'Actualización',
    moratorio: ' ',
    fech_proyectado: '21/10/2026',
    cod_pred: 'ADH172   ',
    fvencimiento: null,
    periodoRomano: null,
    ...overrides,
  };
}

describe('buildOpPdfHtml', () => {
  it('incluye los datos de la OP real', () => {
    const html = buildOpPdfHtml([opRow()]);

    expect(html).toContain(
      'Orden de Pago Vehicular Nº 0000025-2026-VEH-DC-SGO-G/SAT-ICA',
    );
    expect(html).toContain('HUAROTO CONISLLA TERESA JESUS');
    expect(html).toContain('1,104.05');
    expect(html).toContain('21/10/2026');
    expect(html).toContain('TOTAL');
    expect(html).toContain('Base Legal');
    expect(html).toContain('tasa diaria de 0.03%');
  });

  it('rotula el tributo según id_valor', () => {
    expect(buildOpPdfHtml([opRow()])).toContain('>Vehicular<');

    const predial = buildOpPdfHtml([opRow({ id_valor: '01' })]);
    expect(predial).toContain('>Predial<');
    expect(predial).not.toContain('>Vehicular<');
  });

  it('alinea el colon de Declaracion Jurada con el del motivo', () => {
    const html = buildOpPdfHtml([opRow()]);

    // El texto del motivo arranca en 110pt (donde termina su label) y el de
    // Declaracion Jurada se ancla en la misma x para que los dos puntos
    // queden en columna.
    expect(html).toContain('<b>Motivo de la Determinación</b>');
    expect(html).toContain('left:110pt;top:142pt;width:110pt');
    // El año corre a la derecha para no chocar con el texto desplazado.
    expect(html).toContain('left:214pt;top:143pt;width:25pt');
  });

  it('pone el motivo y su texto en una sola fila', () => {
    const html = buildOpPdfHtml([opRow()]);

    expect(html).toContain(
      '<b>Motivo de la Determinación</b>: Se ha verificado la existencia de una deuda tributaria no cancelado dentro de los plazos establecidos',
    );
    // Una sola caja: el label y la frase comparten el mismo div.
    expect(html).toContain('white-space:nowrap');
    expect(html).not.toContain('top:53pt;width:74pt');
  });

  it('calcula el alto del contenido como 176 + 35*filas + 185', () => {
    expect(buildOpPdfHtml([opRow()])).toContain('data-content-height="396"');
    expect(buildOpPdfHtml([opRow(), opRow({ anno: '2018' })])).toContain(
      'data-content-height="431"',
    );
  });

  it('escapa HTML inyectado en los valores', () => {
    const html = buildOpPdfHtml([
      opRow({ nombre: '<script>alert(1)</script>' }),
    ]);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('generateOpPdf', () => {
  const mockGeneratePdf = (): jest.Mock =>
    (jest.requireMock('html-pdf-node') as { generatePdf: jest.Mock })
      .generatePdf;

  it('genera el PDF A4 sin márgenes con el HTML de la OP', async () => {
    mockGeneratePdf().mockResolvedValue(Buffer.from('fake-pdf'));

    const buffer = await generateOpPdf([opRow()], {
      logoDataUri: 'data:image/png;base64,AAAA',
    });

    expect(mockGeneratePdf()).toHaveBeenCalledWith(
      {
        content: expect.stringContaining(
          'Orden de Pago Vehicular Nº 0000025-2026-VEH-DC-SGO-G/SAT-ICA',
        ),
      },
      { format: 'A4', margin: 0, printBackground: true },
    );
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});
