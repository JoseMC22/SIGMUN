import { generatePdf } from 'html-pdf-node';
import { OpImpresionRow } from './generar-op.types';

/**
 * Generador del PDF de la Orden de Pago.
 *
 * Replica el layout del JRXML `rpt_orpa` (Jasper, A4 595x842 pt, márgenes 0)
 * con posicionamiento absoluto en pt: cada elemento del reporte es un div
 * `position:absolute` con left/top/width/height en pt dentro de un contenedor
 * de 595pt de ancho.
 */

export interface OpPdfImages {
  logoDataUri?: string;
  selloDataUri?: string;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
/** Alto del contenedor de cada hoja en el HTML (A4 real en pt). */
const PAGE_BOX_H = 841;
const HEADER_Y = 41;
const DETAIL_Y = 176;
const DETAIL_H = 35;
/** Copias de la misma OP que se imprimen en una hoja A4. */
const OP_COPIES_PER_PAGE = 2;

// Layout predial: JRXML con leftMargin=5 y topMargin=5. Título 40pt, cabecera
// 148pt, detalle 35pt por fila y pie 175pt.
const P_MARGIN_X = 5;
const P_MARGIN_Y = 5;
const P_TITLE_H = 40;
const P_HEADER_H = 148;
const P_DETAIL_Y = P_MARGIN_Y + P_TITLE_H + P_HEADER_H; // 193
const P_FOOTER_H = 175;

// CARGO DE NOTIFICACIÓN (subreporte rpt_orpa_cargo): márgenes 5/7.
const C_MARGIN_X = 5;
const C_MARGIN_Y = 7;
/** Alto real del bloque de cargo (título 39 + pageHeader 35 + constancia). */
const CARGO_H = 245;

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface BoxStyle {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
  height?: number;
  nowrap?: boolean;
}

function boxStyle(left: number, top: number, width: number, style: BoxStyle = {}): string {
  const css = [
    'position:absolute',
    `left:${left}pt`,
    `top:${top}pt`,
    `width:${width}pt`,
    `font-size:${style.size ?? 8}pt`,
  ];
  if (style.height !== undefined) css.push(`height:${style.height}pt`);
  if (style.bold) css.push('font-weight:bold');
  if (style.italic) css.push('font-style:italic');
  if (style.underline) css.push('text-decoration:underline');
  if (style.align) css.push(`text-align:${style.align}`);
  if (style.nowrap) css.push('white-space:nowrap');
  return css.join(';');
}

/** Caja de texto con escape de HTML. */
function text(
  left: number,
  top: number,
  width: number,
  value: unknown,
  style: BoxStyle = {},
): string {
  return `<div style="${boxStyle(left, top, width, style)}">${esc(value)}</div>`;
}

/** Caja con HTML ya armado (para mezclar negrita con valores escapados). */
function html(
  left: number,
  top: number,
  width: number,
  inner: string,
  style: BoxStyle = {},
): string {
  return `<div style="${boxStyle(left, top, width, style)}">${inner}</div>`;
}

function hLine(left: number, top: number, width: number): string {
  return `<div style="position:absolute;left:${left}pt;top:${top}pt;width:${width}pt;border-top:1px solid #000"></div>`;
}

function vLine(left: number, top: number, height: number): string {
  return `<div style="position:absolute;left:${left}pt;top:${top}pt;height:${height}pt;border-left:1px solid #000"></div>`;
}

function numText(value: number | null): string {
  return value === null ? '' : String(value);
}

function titleBandVehicular(row: OpImpresionRow, logoDataUri?: string): string {
  const parts: string[] = [];
  // El logo SAT 2026 ocupa el bloque de marca de la esquina superior izquierda
  // y reemplaza al pie "www". Sin logo, se mantiene el texto.
  if (logoDataUri) {
    parts.push(
      `<img src="${esc(logoDataUri)}" alt="logo" style="position:absolute;left:6pt;top:2pt;width:52pt;height:38pt" />`,
    );
  }
  parts.push(
    text(102, 1, 183, 'SERVICIO DE ADMINISTRACION TRIBUTARIA', {
      bold: true,
      align: 'center',
    }),
    text(102, 11, 183, 'SUB GERENCIA DE OPERACIONES', {
      bold: true,
      align: 'center',
    }),
    text(102, 21, 183, 'DEPARTAMENTO DE COBRANZAS.', {
      bold: true,
      align: 'center',
    }),
  );
  if (!logoDataUri) {
    parts.push(text(14, 29, 66, 'www.satica.gob.pe', { size: 7, bold: true }));
  }
  parts.push(
    text(443, 22, 57, 'Fecha', { bold: true }),
    text(502, 22, 62, ': ' + (row.fec_val ?? '')),
  );
  return parts.join('\n');
}

/** Título del layout predial (banda de 40pt, con márgenes 5/5). */
function titleBandPredial(row: OpImpresionRow, logoDataUri?: string): string {
  const y = P_MARGIN_Y;
  const px = (x: number) => P_MARGIN_X + x;
  const parts: string[] = [];

  if (logoDataUri) {
    parts.push(
      `<img src="${esc(logoDataUri)}" alt="logo" style="position:absolute;left:${px(5)}pt;top:${y + 1}pt;width:52pt;height:38pt" />`,
    );
  } else {
    parts.push(
      text(px(14), y + 31, 66, 'www.satica.gob.pe', { size: 7, bold: true }),
    );
  }

  parts.push(
    text(px(102), y + 1, 216, 'SERVICIO DE ADMINISTRACION TRIBUTARIA DE ICA', {
      bold: true,
    }),
    text(
      px(102),
      y + 11,
      288,
      'SUB GERENCIA DE OPERACIONES - DEPARTAMENTO DE COBRANZAS',
      { bold: true },
    ),
    text(px(443), y + 22, 57, 'Fecha', { bold: true }),
    text(px(504), y + 22, 62, ': ' + (row.fec_val ?? '')),
  );

  return parts.join('\n');
}

function headerBandPredial(row: OpImpresionRow): string {
  const y = P_MARGIN_Y + P_TITLE_H; // 45
  const px = (x: number) => P_MARGIN_X + x;
  const parts: string[] = [];

  parts.push(
    text(px(6), y + 1, 566, row.numerOP, {
      bold: true,
      underline: true,
      align: 'center',
      height: 13,
    }),
    text(px(5), y + 14, 97, 'Nombre y Razon Social', { bold: true }),
    text(px(107), y + 15, 324, ': ' + (row.nombre ?? '')),
    text(px(443), y + 15, 57, 'CODIGO', { bold: true }),
    text(px(503), y + 15, 65, ': ' + (row.codigo ?? '')),
    text(px(5), y + 27, 100, 'Documento de Identidad', { bold: true }),
    text(px(107), y + 28, 148, ': ' + (row.num_doc ?? '')),
    text(px(5), y + 40, 97, 'Domicilio Fiscal', { bold: true }),
    text(px(107), y + 40, 462, ': ' + (row.Dirfiscal ?? '')),
  );

  // Dos párrafos separados por un salto de línea, como el `\n` del JRXML.
  const parrafo1 =
    'De acuerdo a lo señalado en el Art. 78° numeral 1 del TUO Código Tributario corresponde la emisión total o parcial de la Orden de Pago debido a la omisión total o parcial al pago del trbituo autoliquidado por el deudor tributario.';
  const parrafo2 =
    'Por lo que se requiere la cancelacion de la deuda contenida en el presente documento, en un plazo de (3) días hábiles contados a partir del dia siguiente de su notificacion, bajo apercibimiento de iniciar el procedimiento de Ejecucion Coactiva. La presente se emite por los tributos y periodos de deudas pendientes que se indican, cuyo monto se ha actualizado al ' +
    (row.fech_proyectado ?? '') +
    ' luego de esta fecha se actualizara con una tasa diaria de 0.03%, conforme a la Tasa de Interes Moratorio fijada.';
  parts.push(
    html(
      px(5),
      y + 51,
      567,
      `${esc(parrafo1)}<br />${esc(parrafo2)}`,
      { align: 'justify', height: 62 },
    ),
  );

  // Motivo determinante: el texto cambia según la OP cubra un trimestre puntual
  // o más de uno (periodoRomano vacío).
  const periodo = String(row.periodoRomano ?? '').trim();
  const motivo =
    periodo === ''
      ? `: Se ha verificado la existencia de la deuda tributaria de más de un trimestre del Impuesto predial ${row.anno ?? ''} NO cancelada dentro de los plazos establecidos.`
      : `: Se ha verificado la existencia de la deuda tributaria del ${periodo} trimestre del Impuesto predial ${row.anno ?? ''} la misma que venció el ${row.fvencimiento ?? ''}.`;
  parts.push(
    // Label y frase en una sola caja: el label nunca se parte en dos líneas.
    html(
      px(6),
      y + 104,
      560,
      `<b>Motivo Determinante</b>${esc(motivo)}`,
      { height: 20 },
    ),
  );

  // Tabla: línea superior, verticales y encabezados.
  parts.push(hLine(px(6), y + 130, 565));
  [
    [343, 130, 21],
    [70, 130, 21],
    [44, 130, 21],
    [214, 130, 21],
    [119, 130, 21],
    [182, 130, 21],
    [257, 130, 21],
    [293, 130, 21],
    [433, 130, 21],
    [480, 130, 21],
    [389, 130, 21],
    [5, 131, 20],
    [570, 131, 20],
    [525, 131, 20],
  ].forEach(([x, top, h]) => parts.push(vLine(px(x), y + top, h)));

  const th = (left: number, top: number, width: number, label: string) =>
    text(px(left), y + top, width, label, {
      size: 7,
      bold: true,
      align: 'center',
    });

  parts.push(
    th(6, 133, 37, 'TRIBUTO'),
    th(46, 132, 24, 'AÑO'),
    th(73, 130, 44, 'BASE'),
    th(73, 140, 44, 'IMPONIBLE'),
    th(122, 130, 55, 'TRAMO DE'),
    th(122, 140, 55, 'AUTOVALUO'),
    // "ALI-CUOTA" no entra en 32pt: se le da 38pt centrados para que no se
    // parta en dos líneas y choque con "CUOTA".
    text(px(182), y + 131, 35, 'ALI-', {
      size: 5.5,
      bold: true,
      align: 'center',
      nowrap: true,
    }),
    th(182, 140, 35, 'CUOTA'),
    th(218, 130, 38, 'INSOLUTO'),
    th(258, 130, 35, 'IMP'),
    th(258, 140, 35, 'ANUAL'),
    th(296, 131, 47, periodo === '' ? 'TRIMESTRES' : 'TRIMESTRE'),
    th(296, 141, 47, periodo === '' ? 'ADEUDADOS' : 'ADEUDADO'),
    th(348, 130, 38, 'INSOLUTO'),
    th(390, 130, 43, 'FORMULARIO'),
    th(438, 130, 40, 'REAJUSTE'),
    th(437, 140, 40, '(1)'),
    th(482, 131, 42, 'INTERESES'),
    th(482, 140, 42, '(2)'),
    th(529, 133, 34, 'TOTAL'),
  );

  parts.push(hLine(px(5), y + 152, 566));

  return parts.join('\n');
}

/**
 * Placa del vehículo.
 *
 * El SP no devuelve una columna `placa`: en la OP vehicular el código predial
 * (`cod_pred`) ES la placa (formato `ADH172`); en predial es el código del
 * predio (`0259376`). Por eso solo se usa en el layout vehicular.
 */
function placaVehiculo(row: OpImpresionRow): string {
  return String(row.cod_pred ?? '').trim();
}

/** Una fila del detalle predial (banda de 35pt del JRXML). */
function detailBandPredial(row: OpImpresionRow, y: number): string {
  const px = (x: number) => P_MARGIN_X + x;
  const parts: string[] = [];

  [
    [70, 3, 34],
    [389, 3, 34],
    [343, 3, 34],
    [293, 3, 34],
    [570, 5, 34],
    [5, 5, 34],
    [44, 3, 34],
    [257, 3, 34],
    [182, 3, 34],
    [214, 4, 33],
    [525, 6, 33],
    [433, 5, 34],
    [119, 6, 31],
    [480, 6, 32],
  ].forEach(([x, top, h]) => parts.push(vLine(px(x), y + top, h)));
  parts.push(hLine(px(6), y + 39, 565));

  parts.push(
    text(px(6), y + 11, 30, 'Impuesto ', { size: 6, align: 'center' }),
    text(px(6), y + 19, 30, 'Predial', { size: 6, align: 'center' }),
    text(px(45), y + 12, 25, row.anno, { size: 7, align: 'center' }),
    text(px(73), y + 12, 44, row.base_imponible1, {
      size: 6,
      align: 'right',
      height: 16,
    }),
    text(px(122), y + 6, 60, 'Hasta 15 UIT', { size: 6, align: 'center' }),
    text(px(121), y + 16, 60, 'Mas de 15 a 60 UIT', {
      size: 6,
      align: 'center',
    }),
    text(px(122), y + 26, 60, 'Mas de 60 UIT', { size: 6, align: 'center' }),
    text(px(190), y + 6, 17, '0.2%', { size: 6, align: 'center' }),
    text(px(190), y + 16, 17, '0.6%', { size: 6, align: 'center' }),
    text(px(189), y + 26, 17, '1.0%', { size: 6, align: 'center' }),
    text(px(218), y + 5, 37, numText(row.rtramo01), {
      size: 6,
      align: 'center',
    }),
    text(px(218), y + 16, 37, numText(row.rtramo02), {
      size: 6,
      align: 'center',
    }),
    text(px(218), y + 26, 37, numText(row.rtramo03), {
      size: 6,
      align: 'center',
    }),
    text(px(259), y + 14, 34, row.imp_anual1, {
      size: 6,
      align: 'center',
      height: 21,
    }),
    text(px(297), y + 15, 43, row.cuotas, { size: 6, align: 'center' }),
    text(px(344), y + 14, 43, row.imp_insoltexto, {
      size: 7,
      align: 'right',
      height: 21,
    }),
    text(px(392), y + 14, 37, numText(row.costo_emis), {
      size: 6,
      align: 'right',
    }),
    text(px(440), y + 15, 37, numText(row.imp_reaj), {
      size: 6,
      align: 'right',
    }),
    text(px(485), y + 15, 37, numText(row.mora), { size: 7, align: 'right' }),
    text(px(527), y + 15, 42, row.imp_totaltexto, {
      size: 8,
      bold: true,
      align: 'right',
    }),
  );

  return parts.join('\n');
}

function footerBandPredial(rows: OpImpresionRow[], selloDataUri?: string): string {
  const y = P_DETAIL_Y + DETAIL_H * rows.length;
  const px = (x: number) => P_MARGIN_X + x;
  const last = rows[rows.length - 1];
  const totalCosto = rows.reduce((acc, row) => acc + (row.costo_emis ?? 0), 0);
  const parts: string[] = [];

  // Renglón de totales y su línea inferior.
  parts.push(hLine(px(6), y + 18, 564));
  [
    [343, 3, 16],
    [389, 2, 16],
    [480, 4, 14],
    [525, 5, 13],
    [433, 4, 14],
    [570, 5, 14],
    [5, 5, 14],
  ].forEach(([x, top, h]) => parts.push(vLine(px(x), y + top, h)));

  parts.push(
    text(px(124), y + 5, 123, 'TOTAL DEUDA S/.', { bold: true, align: 'center' }),
    text(px(394), y + 5, 37, totalCosto.toFixed(2), {
      size: 6,
      bold: true,
      align: 'right',
    }),
    text(px(344), y + 6, 43, last.imp_insoltexto, { size: 7, align: 'right' }),
    text(px(439), y + 6, 37, numText(last.imp_reaj), {
      size: 6,
      align: 'right',
    }),
    text(px(485), y + 6, 37, numText(last.mora), { size: 7, align: 'right' }),
    text(px(529), y + 6, 40, last.imp_totaltexto, { size: 7, align: 'right' }),
    html(px(6), y + 24, 222, `<strong>UIT </strong>${esc(last.cadenaUIT)}`, {
      size: 5,
    }),
    text(px(6), y + 32, 223, '(1) Factores de Reajuste: ' + (last.cuota_rej ?? ''), {
      size: 5,
    }),
    text(px(6), y + 42, 223, '(2) TIM Aplicada: ' + (last.cuota_mor ?? ''), {
      size: 5,
    }),
    text(px(5), y + 50, 68, 'Base Legal :', { bold: true, underline: true }),
  );

  // Base legal: el orden vertical es el del JRXML.
  const bullets: [number, number, string][] = [
    [6, 63, '- Art. 70 de la Ley Orgánica de Municipalidad Nº 27972'],
    [6, 71, '- Art. 78° numeral 1 del TUO Código Tributario.'],
    [5, 78, '- Art. 8º al  20º  Ley de Tributación Municipal, Nº 776'],
    [5, 86, '- Art. 33 y Art. 78° inc. 1 D.S. 133-2013-EF TUO del Código Tributario'],
    [
      5,
      93,
      '- Art. 25° inc. 1° TUO de la Ley 26979 de Procedimiento de Ejecución Coactiva',
    ],
    [5, 101, '- Plazo para presentar recurso de reclamación: 20 días hábiles '],
  ];
  bullets.forEach(([left, top, label]) =>
    // Ancho amplio: las viñetas de base legal son de una sola línea, y con el
    // ancho del JRXML (253pt) la de Ejecución Coactiva se partía encima de la
    // línea siguiente.
    parts.push(text(px(left), y + top, 470, label, { size: 7 })),
  );
  parts.push(
    text(px(3), y + 110, 213, '   (desde el dia siguiente de notificado la presente)', {
      size: 7,
      italic: true,
    }),
  );

  parts.push(
    text(px(6), y + 105, 565, last.moratorio, { size: 6 }),
    html(
      px(6),
      y + 132,
      563,
      `<strong>Lugar de Pago: Calle Luis Medina C-261 Urb. San Miguel - Ica<br />Horario de Atención: Lunes a Viernes de 8:00 a.m. a 5:00 p.m.</strong>`,
      { size: 8, height: 34 },
    ),
  );

  if (selloDataUri) {
    parts.push(
      `<img src="${esc(selloDataUri)}" alt="sello" style="position:absolute;left:${px(329)}pt;top:${y + 38}pt;width:147pt;height:54pt" />`,
    );
  }

  return parts.join('\n');
}

/**
 * Banda de cabecera del reporte VEHICULAR (JRXML `rpt_orpa` vehicular: 11
 * columnas, con PLACA y sin TRAMO DE AUTOVALUO / ALI-CUOTA).
 */
function headerBandVehicular(row: OpImpresionRow): string {
  const y = HEADER_Y;
  const parts: string[] = [];

  parts.push(
    text(6, y + 1, 565, row.numerOP, {
      bold: true,
      underline: true,
      align: 'center',
      height: 13,
    }),
    text(5, y + 14, 97, 'Nombre y Razon Social', { bold: true }),
    text(107, y + 15, 314, ': ' + (row.nombre ?? '')),
    text(443, y + 15, 57, 'CODIGO', { bold: true }),
    text(503, y + 15, 65, ': ' + (row.codigo ?? '')),
    text(5, y + 27, 100, 'Documento de Identidad', { bold: true }),
    text(107, y + 28, 88, ': ' + (row.num_doc ?? '')),
    text(5, y + 40, 97, 'Domicilio Fiscal', { bold: true }),
    text(107, y + 40, 456, ': ' + (row.Dirfiscal ?? '')),
  );

  const parrafo =
    'Por la presente se requiere la cancelacion de la deuda contenida en el presente documento, ' +
    'en un plazo de (3) dias habiles contados a partir del dia siguiente de su notificacion, ' +
    'bajo apercibimiento de iniciar el procedimiento de Ejecucion Coactiva. La presente se emite ' +
    'por los tributos y periodos de deudas pendientes que se indican, cuyo monto se ha actualizado al ' +
    (row.fech_proyectado ?? '') +
    ' luego de esta fecha se actualizara con una tasa diaria de 0.03%, conforme a la Tasa de Interes Moratorio.';
  parts.push(text(5, y + 50, 567, parrafo, { align: 'justify', height: 49 }));

  // Mismos criterios que el layout predial: motivo y frase en una sola fila, y
  // el colon de Declaración arranca donde cae el colon del motivo.
  parts.push(
    html(
      6,
      y + 92,
      560,
      `<b>Motivo de la Determinaci\u00f3n</b>: Se ha verificado la existencia de una deuda tributaria no cancelado dentro de los plazos establecidos`,
      { nowrap: true },
    ),
    text(6, y + 101, 83, 'Declaracion Jurada', { bold: true }),
    text(110, y + 101, 110, ': Efectuada dentro del Periodo'),
    text(214, y + 102, 25, row.anno, { size: 7, align: 'center' }),
  );

  // Tabla: línea superior, verticales y encabezados de dos líneas.
  parts.push(hLine(6, y + 112, 565));
  [287, 70, 44, 181, 237, 403, 462, 343].forEach((x) =>
    parts.push(vLine(x, y + 112, 21)),
  );
  [5, 570, 514].forEach((x) => parts.push(vLine(x, y + 113, 20)));
  parts.push(vLine(116, y + 113, 22));

  const th = (left: number, top: number, width: number, label: string) =>
    text(left, y + top, width, label, { size: 7, bold: true, align: 'center' });

  parts.push(
    th(6, 115, 37, 'TRIBUTO'),
    th(46, 114, 24, 'AÑO'),
    th(77, 118, 34, 'PLACA'),
    th(118, 112, 62, 'BASE'),
    th(118, 122, 62, 'IMPONIBLE'),
    th(188, 117, 38, 'INSOLUTO'),
    th(239, 113, 47, 'TRIMESTRES'),
    th(238, 123, 47, 'ADEUDADOS'),
    th(296, 117, 38, 'INSOLUTO'),
    th(353, 118, 43, 'FORMULARIO'),
    th(416, 112, 40, 'REAJUSTE'),
    th(416, 122, 40, '(1)'),
    th(467, 113, 42, 'INTERESES'),
    th(467, 122, 42, '(2)'),
    th(525, 117, 34, 'TOTAL'),
  );

  parts.push(hLine(5, y + 134, 566));

  return parts.join('\n');
}

/** Una fila del detalle vehicular: un año / concepto. */
function detailBandVehicular(row: OpImpresionRow, y: number): string {
  const parts: string[] = [];

  parts.push(hLine(6, y + 34, 565));
  [70, 44].forEach((x) => parts.push(vLine(x, y - 2, 34)));
  [570, 5, 237, 287, 343, 403].forEach((x) => parts.push(vLine(x, y, 34)));
  [181, 116].forEach((x) => parts.push(vLine(x, y, 33)));
  parts.push(vLine(462, y + 1, 32), vLine(513, y + 1, 33));

  parts.push(
    text(6, y + 6, 30, 'Impuesto', { size: 6, align: 'center' }),
    text(6, y + 14, 30, 'Vehicular', { size: 6, align: 'center' }),
    text(45, y + 7, 25, row.anno, { size: 7, align: 'center' }),
    text(75, y + 6, 39, placaVehiculo(row), {
      size: 6,
      bold: true,
      align: 'center',
    }),
    text(118, y + 7, 62, row.base_imponible1, { size: 7, align: 'right' }),
    text(182, y + 9, 54, row.imp_anual1, { size: 7, align: 'right' }),
    text(238, y + 10, 48, row.cuotas, { size: 6, align: 'right' }),
    text(289, y + 7, 53, row.imp_insoltexto, { size: 7, align: 'right' }),
    text(355, y + 9, 37, numText(row.costo_emis), { size: 7, align: 'right' }),
    text(411, y + 10, 49, numText(row.imp_reaj), { size: 6, align: 'right' }),
    text(470, y + 10, 40, numText(row.mora), { size: 7, align: 'right' }),
    text(515, y + 10, 54, row.imp_totaltexto, {
      size: 8,
      bold: true,
      align: 'right',
    }),
  );

  return parts.join('\n');
}

/** Pie vehicular (banda de 192pt en el JRXML original). */
function footerBandVehicular(
  rows: OpImpresionRow[],
  selloDataUri?: string,
): string {
  const y = DETAIL_Y + DETAIL_H * rows.length;
  const last = rows[rows.length - 1];
  const totalCosto = rows.reduce((acc, row) => acc + (row.costo_emis ?? 0), 0);
  const parts: string[] = [];

  // Renglón de totales con sus separadores verticales.
  parts.push(
    hLine(6, y + 13, 564),
    vLine(343, y - 2, 16),
    vLine(462, y - 1, 14),
    vLine(513, y, 13),
    vLine(570, y, 14),
    vLine(5, y, 14),
    vLine(403, y + 1, 12),
    vLine(287, y + 1, 11),
    text(124, y, 123, 'TOTAL DEUDA S/.', { bold: true, align: 'center' }),
    text(355, y, 37, totalCosto.toFixed(2), {
      size: 6,
      bold: true,
      align: 'right',
    }),
    text(292, y + 1, 48, last.imp_insoltexto, { size: 7, align: 'right' }),
    text(407, y + 1, 53, numText(last.imp_reaj), { size: 6, align: 'right' }),
    text(469, y + 1, 40, numText(last.mora), { size: 7, align: 'right' }),
    text(515, y + 1, 54, last.imp_totaltexto, { size: 7, align: 'right' }),
    // Mismos criterios que el predial: UIT solo en su renglón y el (1) debajo.
    html(6, y + 14, 226, `<strong>UIT</strong> ${esc(last.cadenaUIT)}`, {
      size: 5,
      nowrap: true,
    }),
    text(6, y + 21, 226, '(1) Factores de Reajuste: ' + (last.cuota_rej ?? ''), {
      size: 5,
    }),
    text(6, y + 33, 226, '(2) TIM Aplicada: ' + (last.cuota_mor ?? ''), {
      size: 5,
    }),
    text(4, y + 46, 68, 'Base Legal :', { bold: true, underline: true }),
  );

  const bullets: [number, string][] = [
    [56, '- Art. 70 de la Ley Orgánica de Municipalidad Nº 27972'],
    [68, '- Art. 30º al  37º  Ley de Tributación Municipal, Nº 776'],
    [78, '- Art. 78º inc. 1 D. S. 133-2013 – EF TUO del Código Tributario'],
    [87, '- TUO  de la Ley 26979 de Procedimiento de Ejecución Coactiva'],
  ];
  bullets.forEach(([top, label]) =>
    parts.push(text(4, y + top, 210, label, { size: 7 })),
  );

  parts.push(text(6, y + 118, 565, last.moratorio, { size: 6 }));

  if (selloDataUri) {
    parts.push(
      `<img src="${esc(selloDataUri)}" alt="sello" style="position:absolute;left:43pt;top:${y + 120}pt;width:147pt;height:54pt" />`,
    );
  }

  // Recuadro de constancia de recepción (117pt de alto en el JRXML vehicular).
  parts.push(
    `<div style="position:absolute;left:236pt;top:${y + 21}pt;width:334pt;height:117pt;border:1px solid #000"></div>`,
    text(238, y + 25, 81, 'Fecha de Recepción  :', { size: 7 }),
    text(321, y + 25, 17, 'ICA', { size: 7 }),
    text(372, y + 25, 12, 'De', { size: 7 }),
    text(499, y + 25, 34, 'Del ' + (last.ano_val ?? ''), { size: 7 }),
    text(238, y + 41, 80, 'Apellidos y Nombres:', { size: 7 }),
    hLine(322, y + 49, 174),
    text(238, y + 57, 17, 'DNI :', { size: 7 }),
    text(324, y + 57, 21, 'Hora :', { size: 7 }),
    hLine(347, y + 64, 61),
    hLine(259, y + 65, 61),
    text(238, y + 72, 47, 'Parentesco :', { size: 7 }),
    text(387, y + 73, 63, 'Firma Recepción :', { size: 7 }),
    hLine(289, y + 80, 95),
    hLine(454, y + 80, 107),
    text(238, y + 89, 51, 'Notificado Por:', { size: 7 }),
    text(387, y + 89, 48, 'Observación:', { size: 7 }),
    hLine(439, y + 96, 122),
    hLine(393, y + 118, 174),
    text(
      26,
      y + 153,
      546,
      'Si a la recepcion de esta, Ud. ya realizo el pago de tales conceptos, le rogamos haga caso omiso a la presente.',
      { size: 7 },
    ),
    text(
      26,
      y + 165,
      546,
      'Lugar de Pago: Calle Luis Medina C-261 Urb. San Miguel - ICA Horario de Atencion: Lunes a Viernes de 8:00 am a 5:00 pm',
      { size: 7 },
    ),
  );

  return parts.join('\n');
}

/**
 * Banda del CARGO DE NOTIFICACIÓN (`rpt_orpa_cargo` + la banda summary del
 * maestro `rpt_orpa1`): la cabecera del SAT, el título "CARGO DE NOTIFICACIÓN"
 * con el número de OP y el recuadro de constancia de recepción.
 *
 * Se imprime en su propia hoja, duplicada como la OP.
 */
function cargoBand(row: OpImpresionRow, logoDataUri?: string): string {
  const px = (x: number) => C_MARGIN_X + x;
  const parts: string[] = [];

  // title (39pt)
  if (logoDataUri) {
    parts.push(
      `<img src="${esc(logoDataUri)}" alt="logo" style="position:absolute;left:${px(5)}pt;top:${C_MARGIN_Y}pt;width:52pt;height:38pt" />`,
    );
  } else {
    parts.push(
      text(px(14), C_MARGIN_Y + 30, 66, 'www.satica.gob.pe', {
        size: 7,
        bold: true,
      }),
    );
  }
  parts.push(
    text(px(102), C_MARGIN_Y, 216, 'SERVICIO DE ADMINISTRACION TRIBUTARIA DE ICA', {
      bold: true,
    }),
    text(
      px(102),
      C_MARGIN_Y + 10,
      288,
      'SUB GERENCIA DE OPERACIONES - DEPARTAMENTO DE COBRANZAS',
      { bold: true },
    ),
    text(px(443), C_MARGIN_Y + 21, 57, 'Fecha', { bold: true }),
    text(px(504), C_MARGIN_Y + 21, 62, ': ' + (row.fec_val ?? '')),
  );

  // pageHeader (35pt): título del cargo y número de OP.
  const y = C_MARGIN_Y + 39 + 35; // 81: arranca la banda summary
  parts.push(
    html(
      px(5),
      C_MARGIN_Y + 41,
      561,
      '<strong>CARGO DE NOTIFICACIÓN<br />' + esc(row.numerOP) + '</strong>',
      { align: 'center', height: 33 },
    ),
  );

  // summary (320pt): recuadro de constancia de recepción.
  const t = (left: number, top: number, width: number, value: unknown, style: BoxStyle = {}) =>
    text(px(left), y + top, width, value, style);

  parts.push(
    `<div style="position:absolute;left:${px(5)}pt;top:${y + 10}pt;width:561pt;height:141pt;border:1px solid #000"></div>`,
    t(17, 16, 81, 'Fecha de Recepción  :', { size: 7 }),
    t(98, 16, 17, 'ICA', { size: 7 }),
    t(150, 16, 12, 'de', { size: 7 }),
    t(320, 16, 35, 'del 20', { size: 8 }),
    t(375, 17, 21, 'Hora :', { size: 7 }),
    t(17, 37, 80, 'Apellidos y Nombres:', { size: 7 }),
    t(396, 37, 17, 'DNI :', { size: 7 }),
    t(18, 64, 35, 'Dirección :', { size: 7 }),
    text(px(59), y + 60, 499, row.Dirfiscal, { size: 7, height: 15 }),
    t(17, 95, 47, 'Parentesco :', { size: 7 }),
    t(176, 96, 63, 'Firma Recepción :', { size: 7 }),
    t(365, 95, 52, 'Observaciónes:', { size: 7 }),
    t(17, 118, 51, 'Notificado Por:', { size: 7 }),
    // Líneas del formulario.
    hLine(px(118), y + 26, 31),
    hLine(px(162), y + 26, 156),
    hLine(px(343), y + 25, 22),
    hLine(px(398), y + 26, 85),
    hLine(px(98), y + 47, 292),
    hLine(px(421), y + 46, 124),
    hLine(px(58), y + 73, 500),
    hLine(px(68), y + 103, 105),
    hLine(px(243), y + 103, 112),
    hLine(px(417), y + 102, 128),
    hLine(px(68), y + 128, 239),
    hLine(px(371), y + 127, 174),
    text(
      px(5),
      y + 157,
      360,
      'Si a la recepcion de esta, Ud. ya realizo el pago de tales conceptos, le rogamos haga caso omiso a la presente.',
      { size: 7, italic: true },
    ),
  );

  return parts.join('\n');
}

function renderPage(page: number, contenido: string, extraStyle = ''): string {
  // 842pt es un pelo más alto que un A4 real (297mm = 841.89pt): si el wrapper
  // mide 842pt Chrome mete una página en blanco entre cada hoja.
  return `<div data-page="${page}" style="position:relative;width:${PAGE_WIDTH}pt;height:${PAGE_BOX_H}pt;overflow:hidden;${extraStyle}">
${contenido}
</div>`;
}

function cutLine(top: number): string {
  return `<div data-cut-line="1" style="position:absolute;left:0pt;top:${top}pt;width:${PAGE_WIDTH}pt;border-top:1px dashed #000"></div>`;
}

function renderDocument(pages: string[], contentHeight: number): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Orden de Pago</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { margin: 0; }
</style>
</head>
<body>
<div data-content-height="${contentHeight}" style="position:relative;width:${PAGE_WIDTH}pt;font-family:Helvetica,Arial,sans-serif;font-size:8pt;color:#000">
${pages.join('\n')}
</div>
</body>
</html>`;
}

/**
 * Arma el HTML A4 de la OP. Una fila del SP = un bloque de detalle; el pie se
 * calcula después de la última fila.
 *
 * El reporte original tiene dos layouts con la misma cabecera de datos y
 * distinta tabla: predial (TRAMO DE AUTOVALUO / ALI-CUOTA) y vehicular
 * (PLACA, sin tramos). Se elige por `id_valor`: '11' es vehicular.
 *
 * Cada hoja lleva la misma OP dos veces (media hoja cada una) con una línea de
 * corte a media página.
 */
export function buildOpPdfHtml(
  rows: OpImpresionRow[],
  opts: OpPdfImages = {},
): string {
  const filas = rows.length > 0 ? rows : [];
  const vehicular = String(filas[0]?.id_valor ?? '').trim() === '11';

  // Cada layout tiene su propio alto de título/cabecera, y por lo tanto su
  // propia altura de contenido: el predial arranca en 5pt y usa bandas de
  // 40/148/35/175.
  const detailTop = vehicular ? DETAIL_Y : P_DETAIL_Y;
  const contentHeight =
    detailTop + DETAIL_H * filas.length + (vehicular ? 192 : P_FOOTER_H);

  const detalle = filas
    .map((row, i) =>
      vehicular
        ? detailBandVehicular(row, detailTop + DETAIL_H * i)
        : detailBandPredial(row, detailTop + DETAIL_H * i),
    )
    .join('\n');

  const filaBase = filas[0];
  const banda = [
    filaBase
      ? vehicular
        ? titleBandVehicular(filaBase, opts.logoDataUri)
        : titleBandPredial(filaBase, opts.logoDataUri)
      : '',
    filaBase
      ? vehicular
        ? headerBandVehicular(filaBase)
        : headerBandPredial(filaBase)
      : '',
    detalle,
    filaBase
      ? vehicular
        ? footerBandVehicular(filas, opts.selloDataUri)
        : footerBandPredial(filas, opts.selloDataUri)
      : '',
  ].join('\n');

  // Dos copias por hoja, separadas por la línea de corte a media página. Si la
  // OP no entra en media hoja, esa copia se escala para no desbordar la página.
  const slot = PAGE_HEIGHT / OP_COPIES_PER_PAGE;
  const escala = contentHeight > slot ? slot / contentHeight : 1;
  const transform = escala < 1 ? `;transform:scale(${escala});transform-origin:top left` : '';

  const copias = Array.from({ length: OP_COPIES_PER_PAGE }, (_, i) => {
    const top = slot * i;
    return `<div data-op-copy="${i + 1}" style="position:absolute;left:0pt;top:${top}pt;width:${PAGE_WIDTH}pt;height:${slot}pt;overflow:hidden${transform}">
${banda}
</div>`;
  }).join('\n');

  const pages = [renderPage(1, `${copias}\n${cutLine(slot)}`)];

  // El predial se imprime junto con su CARGO DE NOTIFICACIÓN, duplicado igual
  // que la OP (dos por hoja, en una segunda página).
  if (!vehicular && filaBase) {
    const cargo = cargoBand(filaBase, opts.logoDataUri);
    const escalaCargo = CARGO_H > slot ? slot / CARGO_H : 1;
    const transformCargo =
      escalaCargo < 1
        ? `;transform:scale(${escalaCargo});transform-origin:top left`
        : '';
    const copiasCargo = Array.from({ length: OP_COPIES_PER_PAGE }, (_, i) => {
      const top = slot * i;
      return `<div data-cargo-copy="${i + 1}" style="position:absolute;left:0pt;top:${top}pt;width:${PAGE_WIDTH}pt;height:${slot}pt;overflow:hidden${transformCargo}">
${cargo}
</div>`;
    }).join('\n');
    pages.push(
      renderPage(2, `${copiasCargo}\n${cutLine(slot)}`, 'break-before:page;'),
    );
  }

  return renderDocument(pages, PAGE_BOX_H * pages.length);
}

/** Genera el PDF A4 de la OP con `html-pdf-node` (márgenes 0, como el JRXML). */
export async function generateOpPdf(
  rows: OpImpresionRow[],
  opts: OpPdfImages = {},
): Promise<Buffer> {
  const content = buildOpPdfHtml(rows, opts);
  return generatePdf(
    { content },
    { format: 'A4', margin: 0, printBackground: true },
  );
}
