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
const HEADER_Y = 41;
const DETAIL_Y = 176;
const DETAIL_H = 35;
const FOOTER_H = 185;

// Coordenadas X de las verticales de la tabla (cabecera y detalle).
const TABLE_X = [5, 44, 70, 119, 182, 214, 257, 293, 343, 389, 433, 480, 525, 570];
// Las verticales de la cabecera arrancan un punto más a la izquierda.
const HEADER_TABLE_X = [6, 44, 70, 119, 182, 214, 257, 293, 343, 389, 433, 480, 525, 570];

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

function titleBand(logoDataUri?: string): string {
  const parts: string[] = [];
  if (logoDataUri) {
    parts.push(
      `<img src="${esc(logoDataUri)}" alt="logo" style="position:absolute;left:5pt;top:1pt;width:86pt;height:29pt" />`,
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
    text(14, 29, 66, 'www.satica.gob.pe', { size: 7, bold: true }),
    text(443, 22, 57, 'Fecha', { bold: true }),
  );
  return parts.join('\n');
}

function headerBand(row: OpImpresionRow): string {
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

  parts.push(
    // Motivo y su texto van en una sola fila: el label completo más la frase,
    // sin que el ancho del label lo parta en dos líneas.
    html(
      6,
      y + 92,
      560,
      `<b>Motivo de la Determinaci\u00f3n</b>: Se ha verificado la existencia de una deuda tributaria no cancelado dentro de los plazos establecidos`,
      { nowrap: true },
    ),
    text(6, y + 101, 83, 'Declaracion Jurada', { bold: true }),
    // El colon arranca en 110pt, la misma x donde cae el colon del motivo
    // (el label del motivo mide 99.07pt y su texto empieza en 110pt).
    text(110, y + 101, 110, ': Efectuada dentro del Periodo'),
    text(214, y + 102, 25, row.anno, { size: 7, align: 'center' }),
  );

  // Tabla: línea superior, verticales y encabezados de dos líneas.
  parts.push(hLine(6, y + 112, 565));
  HEADER_TABLE_X.forEach((x) => parts.push(vLine(x, y + 112, 21)));

  const th = (left: number, top: number, width: number, label: string) =>
    text(left, y + top, width, label, { size: 7, bold: true, align: 'center' });

  parts.push(
    th(6, 115, 37, 'TRIBUTO'),
    th(73, 112, 44, 'BASE'),
    th(73, 122, 44, 'IMPONIBLE'),
    th(122, 112, 55, 'TRAMO DE'),
    th(122, 122, 55, 'AUTOVALUO'),
    th(183, 112, 35, 'ALI-CUOTA'),
    // th(183, 122, 35, 'CUOTA'),
    th(218, 112, 38, 'INSOLUTO'),
    th(258, 112, 35, 'IMP'),
    th(258, 122, 35, 'ANUAL'),
    th(296, 113, 47, 'TRIMESTRES'),
    th(296, 123, 47, 'ADEUDADOS'),
    th(348, 112, 38, 'INSOLUTO'),
    th(390, 112, 43, 'FORMULARIO'),
    th(438, 112, 40, 'REAJUSTE'),
    th(437, 122, 40, '(1)'),
    th(482, 113, 42, 'INTERESES'),
    th(482, 122, 42, '(2)'),
    th(529, 115, 34, 'TOTAL'),
  );

  return parts.join('\n');
}

/**
 * Nombre del tributo en la columna TRIBUTO del detalle.
 *
 * El JRXML original imprime "Impuesto / Predial" fijo, aunque la OP sea
 * vehicular. Acá se deriva de `id_valor`: '11' es la OP vehicular y cualquier
 * otro valor cae en predial, que es el default histórico del reporte.
 */
function tributoLabel(row: OpImpresionRow): string {
  return String(row.id_valor ?? '').trim() === '11' ? 'Vehicular' : 'Predial';
}

function detailBand(row: OpImpresionRow, y: number): string {
  const parts: string[] = [];

  TABLE_X.forEach((x) => parts.push(vLine(x, y, 34)));
  parts.push(hLine(6, y + 34, 565));

  parts.push(
    text(6, y + 6, 30, 'Impuesto', { size: 6, align: 'center' }),
    text(6, y + 14, 30, tributoLabel(row), { size: 6, align: 'center' }),
    text(45, y + 7, 25, row.anno, { size: 7, align: 'center' }),
    text(73, y + 7, 44, row.base_imponible1, { size: 6, align: 'right' }),
    text(122, y + 1, 60, 'Hasta 15 UIT', { size: 6, align: 'center' }),
    text(121, y + 11, 60, 'Mas de 15 a 60 UIT', { size: 6, align: 'center' }),
    text(122, y + 21, 60, 'Mas de 60 UIT', { size: 6, align: 'center' }),
    text(190, y + 1, 17, '0.2%', { size: 6, align: 'center' }),
    text(190, y + 11, 17, '0.6%', { size: 6, align: 'center' }),
    text(189, y + 21, 17, '1.0%', { size: 6, align: 'center' }),
    text(218, y + 0, 37, numText(row.rtramo01), { size: 6, align: 'center' }),
    text(218, y + 11, 37, numText(row.rtramo02), { size: 6, align: 'center' }),
    text(218, y + 21, 37, numText(row.rtramo03), { size: 6, align: 'center' }),
    text(259, y + 9, 34, row.imp_anual1, { size: 6, align: 'right' }),
    text(297, y + 10, 43, row.cuotas, { size: 6, align: 'right' }),
    text(344, y + 9, 43, row.imp_insoltexto, { size: 7, align: 'right' }),
    text(392, y + 9, 37, numText(row.costo_emis), { size: 6, align: 'right' }),
    text(440, y + 10, 37, numText(row.imp_reaj), { size: 6, align: 'right' }),
    text(485, y + 10, 37, numText(row.mora), { size: 7, align: 'right' }),
    text(527, y + 10, 42, row.imp_totaltexto, {
      size: 8,
      bold: true,
      align: 'right',
    }),
  );

  return parts.join('\n');
}

function footerBand(rows: OpImpresionRow[], selloDataUri?: string): string {
  const y = DETAIL_Y + DETAIL_H * rows.length;
  const last = rows[rows.length - 1];
  const totalCosto = rows.reduce((acc, row) => acc + (row.costo_emis ?? 0), 0);
  const parts: string[] = [];

  parts.push(
    text(124, y + 0, 123, 'TOTAL DEUDA S/.', { bold: true, align: 'center' }),
    text(344, y + 1, 43, last.imp_insoltexto, { size: 7, align: 'right' }),
    text(439, y + 1, 37, numText(last.imp_reaj), { size: 6, align: 'right' }),
    text(485, y + 1, 37, numText(last.mora), { size: 7, align: 'right' }),
    text(529, y + 1, 40, last.imp_totaltexto, { size: 7, align: 'right' }),
    text(394, y + 0, 37, totalCosto.toFixed(2), {
      size: 6,
      bold: true,
      align: 'right',
    }),
    html(
      5,
      y + 14,
      52,
      `<strong>UIT</strong> ${esc(last.cadenaUIT)}`,
      { size: 5 },
    ),
    text(57, y + 14, 171, '(1) Factores de Reajuste: ' + (last.cuota_rej ?? ''), {
      size: 5,
    }),
    text(5, y + 23, 223, '(2) TIM Aplicada: ' + (last.cuota_mor ?? ''), {
      size: 5,
    }),
    text(4, y + 33, 68, 'Base Legal :', { bold: true, underline: true }),
  );

  const bullets: [number, string][] = [
    [43, '- Art. 70 de la Ley Orgánica de Municipalidad Nº 27972'],
    [55, '- Art. 8º al  20º  Ley de Tributación Municipal, Nº 776'],
    [65, '- Art. 78º inc. 1 D. S. 133-2013 – EF TUO del Código Tributario'],
    [74, '- TUO  de la Ley 26979 de Procedimiento de Ejecución Coactiva'],
    [84, '- Plazo para presentar recurso de reclamacion: 03 dias habiles '],
    [93, '   (desde el dia siguiente de notificado la presente)'],
  ];
  bullets.forEach(([top, label]) =>
    parts.push(text(4, y + top, 210, label, { size: 7 })),
  );

  parts.push(
    text(6, y + 105, 565, last.moratorio, { size: 6 }),
  );

  if (selloDataUri) {
    parts.push(
      `<img src="${esc(selloDataUri)}" alt="sello" style="position:absolute;left:43pt;top:${y + 107}pt;width:147pt;height:54pt" />`,
    );
  }

  // Recuadro de constancia de recepción.
  parts.push(
    `<div style="position:absolute;left:236pt;top:${y + 21}pt;width:334pt;height:130pt;border:1px solid #000"></div>`,
    text(238, y + 25, 81, 'Fecha de Recepción  :', { size: 7 }),
    text(321, y + 25, 17, 'ICA', { size: 7 }),
    text(372, y + 25, 12, 'De', { size: 7 }),
    text(514, y + 26, 47, 'Del ' + (last.ano_val ?? ''), { size: 8 }),
    text(238, y + 41, 80, 'Apellidos y Nombres:', { size: 7 }),
    hLine(322, y + 49, 174),
    text(238, y + 57, 17, 'DNI :', { size: 7 }),
    text(324, y + 57, 21, 'Hora :', { size: 7 }),
    hLine(347, y + 64, 61),
    text(238, y + 73, 37, 'Dirección :', { size: 7 }),
    text(280, y + 71, 279, last.Dirfiscal, { size: 8 }),
    hLine(279, y + 82, 280),
    text(238, y + 89, 47, 'Parentesco :', { size: 7 }),
    hLine(289, y + 97, 95),
    text(387, y + 90, 63, 'Firma Recepción :', { size: 7 }),
    text(238, y + 106, 51, 'Notificado Por:', { size: 7 }),
    hLine(439, y + 113, 122),
    text(387, y + 106, 48, 'Observación:', { size: 7 }),
    hLine(393, y + 135, 174),
    text(
      221,
      y + 153,
      360,
      'Si a la recepcion de esta, Ud. ya realizo el pago de tales conceptos, le rogamos haga caso omiso a la presente.',
      { size: 7 },
    ),
    text(
      46,
      y + 165,
      492,
      'Lugar de Pago: Calle Luis Medina C-261 Urb. San Miguel - Ica Horario de Atencion: Lunes a Viernes de 8:00 am a 5:00 pm.',
      { size: 7 },
    ),
  );

  return parts.join('\n');
}

/**
 * Arma el HTML A4 de la OP. Una fila del SP = un bloque de detalle; el pie se
 * calcula después de la última fila.
 */
export function buildOpPdfHtml(
  rows: OpImpresionRow[],
  opts: OpPdfImages = {},
): string {
  const filas = rows.length > 0 ? rows : [];
  const contentHeight = DETAIL_Y + DETAIL_H * filas.length + FOOTER_H;

  const detalle = filas
    .map((row, i) => detailBand(row, DETAIL_Y + DETAIL_H * i))
    .join('\n');

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
<div data-content-height="${contentHeight}" style="position:relative;width:${PAGE_WIDTH}pt;min-height:${Math.max(PAGE_HEIGHT, contentHeight)}pt;font-family:Helvetica,Arial,sans-serif;font-size:8pt;color:#000">
${titleBand(opts.logoDataUri)}
${filas.length > 0 ? headerBand(filas[0]) : ''}
${detalle}
${filas.length > 0 ? footerBand(filas, opts.selloDataUri) : ''}
</div>
</body>
</html>`;
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
