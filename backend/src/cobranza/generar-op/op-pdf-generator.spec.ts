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
    // Rótulo de la segunda columna del detalle (JRXML rpt_orpa: x=49 y=184).
    expect(html).toContain('>AÑO<');
  });

  it('rotula el tributo según el layout de id_valor', () => {
    // '11' elige el reporte vehicular y '01' el predial; cada uno imprime su
    // propio rótulo en la columna TRIBUTO.
    expect(buildOpPdfHtml([opRow()])).toContain('>Vehicular<');

    const predial = buildOpPdfHtml([opRow({ id_valor: '01' })]);
    expect(predial).toContain('>Predial<');
    expect(predial).not.toContain('>Vehicular<');
  });

  it('usa el layout predial solo para tributos distintos de 11', () => {
    // El predial conserva la tabla de tramos; el vehicular no la tiene.
    expect(buildOpPdfHtml([opRow({ id_valor: '01' })])).toContain(
      'AUTOVALUO',
    );
    expect(buildOpPdfHtml([opRow()])).not.toContain('AUTOVALUO');
  });

  it('arma el predial con los márgenes 5/5 y las bandas del JRXML nuevo', () => {
    const html = buildOpPdfHtml([
      opRow({
        id_valor: '01',
        periodoRomano: 'PRIMER',
        fvencimiento: '27/02/2017',
      }),
    ]);

    // Título 40pt + cabecera 148pt, más el margen superior de 5pt: el detalle
    // arranca en 193pt.
    expect(html).toContain('left:11pt;top:204pt;width:30pt');
    // El motivo cambia según la OP cubra uno o más trimestres.
    expect(html).toContain(
      'del PRIMER trimestre del Impuesto predial 2017 la misma que venció el 27/02/2017',
    );
    // El recuadro de recepción ya no va en el cuerpo: se imprime aparte, en el
    // CARGO DE NOTIFICACIÓN.
    expect(html).toContain('CARGO DE NOTIFICACIÓN');
    expect(html).toContain('Fecha de Recepción');
    expect(html).toContain('Calle Luis Medina C-261');
  });

  it('usa el motivo de varios trimestres cuando periodoRomano viene vacío', () => {
    const html = buildOpPdfHtml([
      opRow({ id_valor: '01', periodoRomano: '' }),
    ]);

    expect(html).toContain(
      'de más de un trimestre del Impuesto predial 2017 NO cancelada',
    );
    expect(html).toContain('TRIMESTRES');
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

  it('imprime la placa en la columna PLACA solo en la OP vehicular', () => {
    // En vehicular `cod_pred` es la placa y va en su propia columna.
    const vehicular = buildOpPdfHtml([opRow()]);
    expect(vehicular).toContain('>PLACA<');
    expect(vehicular).toContain('>ADH172<');

    const predial = buildOpPdfHtml([opRow({ id_valor: '01' })]);
    expect(predial).not.toContain('>PLACA<');
    expect(predial).not.toContain('ADH172');
  });

  it('alinea los dos últimos párrafos a la izquierda en el layout vehicular', () => {
    // Misma x (26) y misma distancia vertical en el reporte vehicular: con una
    // fila, el pie arranca en 211pt.
    const html = buildOpPdfHtml([opRow()]);
    expect(html).toContain('left:26pt;top:364pt;width:546pt');
    expect(html).toContain('left:26pt;top:376pt;width:546pt');
  });

  it('pone el párrafo (1) debajo del UIT', () => {
    const html = buildOpPdfHtml([opRow()]);

    // Con una fila de detalle el pie arranca en 211pt: el UIT queda en su
    // propio renglón (225) y el párrafo (1) pasa debajo (232), ambos a x=6.
    expect(html).toContain('left:6pt;top:225pt;width:226pt');
    expect(html).toContain('left:6pt;top:232pt;width:226pt');
  });

  it('dibuja el logo SAT 2026 en la esquina y oculta el www en ambos layouts', () => {
    const logo = { logoDataUri: 'data:image/jpeg;base64,AAAA' };

    // El vehicular no tiene márgenes; el predial arranca en 5/5.
    const posiciones: [OpImpresionRow[], string][] = [
      [[opRow()], 'left:6pt;top:2pt;width:52pt;height:38pt'],
      [[opRow({ id_valor: '01' })], 'left:10pt;top:6pt;width:52pt;height:38pt'],
    ];

    for (const [rows, posicion] of posiciones) {
      const html = buildOpPdfHtml(rows, logo);
      expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
      expect(html).toContain(posicion);
      expect(html).not.toContain('www.satica.gob.pe');
    }

    // Sin logo disponible se mantiene el pie histórico.
    expect(buildOpPdfHtml([opRow()])).toContain('www.satica.gob.pe');
    expect(buildOpPdfHtml([opRow({ id_valor: '01' })])).toContain(
      'www.satica.gob.pe',
    );
  });

  it('imprime la misma OP dos veces por hoja con línea de corte', () => {
    const vehicular = buildOpPdfHtml([opRow()]);
    const predial = buildOpPdfHtml([opRow({ id_valor: '01' })]);

    // El vehicular es una sola hoja A4; el predial suma la hoja del cargo.
    expect(vehicular).toContain('data-content-height="841"');
    expect(predial).toContain('data-content-height="1682"');

    for (const html of [vehicular, predial]) {
      // Dos copias: la numeración de la OP aparece dos veces.
      expect(html.match(/data-op-copy=/g)?.length).toBe(2);
      // El texto de la OP se repite en cada copia.
      expect(html.split('HUAROTO CONISLLA TERESA JESUS').length - 1).toBe(2);
      // Línea de corte a media hoja.
      expect(html).toContain('data-cut-line="1"');
      expect(html).toContain('left:0pt;top:421pt;width:595pt;border-top:1px dashed');
      // La segunda copia arranca en la mitad inferior.
      expect(html).toContain('data-op-copy="2" style="position:absolute;left:0pt;top:421pt');
    }
  });

  it('agrega la hoja del CARGO DE NOTIFICACIÓN duplicada en el predial', () => {
    const html = buildOpPdfHtml([opRow({ id_valor: '01' })]);

    expect(html.match(/data-cargo-copy=/g)?.length).toBe(2);
    expect(html.match(/CARGO DE NOTIFICACIÓN/g)?.length).toBe(2);
    expect(html).toContain('data-page="2"');
    expect(html).toContain('break-before:page');
    // El vehicular no lleva hoja de cargo.
    expect(buildOpPdfHtml([opRow()])).not.toContain('data-cargo-copy');
  });

  it('escala la copia cuando la OP no entra en media hoja', () => {
    // 5 filas de detalle: 176 + 35*5 + 192 = 543pt > 421pt.
    const html = buildOpPdfHtml([
      opRow(),
      opRow({ anno: '2018' }),
      opRow({ anno: '2019' }),
      opRow({ anno: '2020' }),
      opRow({ anno: '2021' }),
    ]);

    expect(html).toContain('transform:scale(0.7753');
    expect(html).toContain('transform-origin:top left');
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
