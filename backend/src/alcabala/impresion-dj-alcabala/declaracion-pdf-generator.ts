import { generatePdf } from 'html-pdf-node';
import { readFileSync, statSync } from 'fs';
import { DeclaracionPdfRow } from './dto/declaracion-pdf-row.dto';

export interface DeclaracionPdfOptions {
  usuario: string;
  fecha: string;
  logoDataUri: string | null;
}

const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB

/**
 * HTML-escape every DB-derived string before interpolation so a value such as
 * `observacion` containing `<`, `>`, `&`, `"` or `'` cannot break the PDF.
 */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a number as `S/. #,##0.00`. Non-finite input renders as `0.00`.
 */
export function fmt(n: number): string {
  const num = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return (
    'S/. ' +
    num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function cell(label: string, value: string): string {
  return `<td class="lbl">${esc(label)}</td><td>${esc(value)}</td>`;
}

function amtCell(label: string, value: number): string {
  return `<td class="lbl">${esc(label)}</td><td>${esc(fmt(value))}</td>`;
}

/**
 * Builds the A4 HTML replicating the `rptalcabala` Jasper bands:
 * title, RECEPCIÓN box, sections 1–4, montos, firmas and footer.
 * Margins are NOT set in CSS — they come from the pdf options in
 * `generateDeclaracionPdf` (puppeteer overrides @page margins).
 */
export function buildDeclaracionPdfHtml(
  row: DeclaracionPdfRow,
  opts: DeclaracionPdfOptions,
): string {
  const logo = opts.logoDataUri
    ? `<img class="logo" src="${esc(opts.logoDataUri)}" alt="logo" />`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Declaración de Alcabala</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 9px; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
  td.lbl { font-weight: bold; width: 22%; background: #eee; }
  .title { text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
  .logo { max-height: 40px; }
  .section { font-weight: bold; background: #ddd; padding: 2px 4px; }
  .footer td { border: none; }
</style>
</head>
<body>
  <table>
    <tr><td class="title" colspan="4">IMPUESTO DE ALCABALA ${logo}</td></tr>
    <tr><td class="section" colspan="4">RECEPCIÓN</td></tr>
    <tr>${cell('CÓDIGO COMPRA', row.codigo_compra)}${cell('COMPRADOR', row.comprador)}</tr>
    <tr>${cell('DIRECCIÓN FISCAL', row.comprador_fiscal)}${cell('DNI', row.comprador_dni)}</tr>
    <tr>${cell('CÓDIGO VENTA', row.codigo_venta)}${cell('VENDEDOR', row.vendedor)}</tr>
    <tr>${cell('DIRECCIÓN FISCAL', row.vendedor_fiscal)}${cell('DNI', row.vendedor_dni)}</tr>

    <tr><td class="section" colspan="4">DATOS GENERALES</td></tr>
    <tr>${cell('CONTRATO', row.contrato)}${cell('FECHA CONTRATO', row.fecha_contrato)}</tr>
    <tr>${cell('DIRECCIÓN PREDIO', row.direccion_predio)}${cell('TIPO DE PREDIO', row.tipo_pred)}</tr>

    <tr><td class="section" colspan="4">VALOR DE LA TRANSFERENCIA</td></tr>
    <tr>${amtCell('TRANSFERENCIA', row.transferencia)}${amtCell('AUTOAVALÚO', row.autoavaluo)}</tr>

    <tr><td class="section" colspan="4">CÁLCULO DEL IMPUESTO</td></tr>
    <tr>${amtCell('MONTO INAFECTO', row.monto_inafecto)}${amtCell('MONTO AFECTO', row.monto_afecto)}</tr>
    <tr>${amtCell('MORA', row.mora)}${amtCell('TASA IMPUESTO %', row.tasa_impuesto)}</tr>
    <tr>${amtCell('BASE IMPONIBLE', row.base_imponible)}</tr>

    <tr><td class="section" colspan="4">MONTO DE LA ALCABALA</td></tr>
    <tr>${amtCell('MONTO ALCABALA', row.monto_alcabala)}${amtCell('TOTAL ALCABALA', row.total_alcabala)}</tr>

    <tr><td class="section" colspan="4">MONTO EN LETRAS</td></tr>
    <tr><td colspan="4">${esc(row.monto_letras)}</td></tr>

    <tr><td class="section" colspan="4">OBSERVACIONES</td></tr>
    <tr><td colspan="4">${esc(row.observacion)}</td></tr>

    <tr><td class="section" colspan="4">FIRMAS</td></tr>
    <tr><td colspan="2">El Contribuyente</td><td colspan="2">La Municipalidad</td></tr>
  </table>

  <table class="footer">
    <tr><td>USUARIO: ${esc(opts.usuario)}</td><td>FECHA: ${esc(opts.fecha)}</td></tr>
  </table>
</body>
</html>`;
}

/**
 * Reads a logo file from disk, validates PNG/JPEG magic bytes and size (≤1 MB),
 * and returns a data URI. Returns null on unset/missing/non-image/oversized so
 * the caller renders the PDF without a logo (graceful fallback, no crash).
 */
export async function loadLogoDataUri(
  logoPath: string | undefined,
): Promise<string | null> {
  if (!logoPath) return null;
  try {
    const stats = statSync(logoPath);
    if (stats.size > MAX_LOGO_BYTES) return null;

    const buf = readFileSync(logoPath);
    const isPng =
      buf.length >= 4 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;
    const isJpeg =
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

    if (isPng) return `data:image/png;base64,${buf.toString('base64')}`;
    if (isJpeg) return `data:image/jpeg;base64,${buf.toString('base64')}`;
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates the A4 PDF of the Alcabala Declaration from the mapped row.
 * Margins (30/30/20/20) are passed as pdf OPTIONS, not CSS @page, because
 * puppeteer's margin option overrides @page.
 */
export async function generateDeclaracionPdf(
  row: DeclaracionPdfRow,
  opts: DeclaracionPdfOptions,
): Promise<Buffer> {
  const content = buildDeclaracionPdfHtml(row, opts);
  return generatePdf(
    { content },
    {
      format: 'A4',
      margin: { top: '30px', right: '30px', bottom: '20px', left: '20px' },
      printBackground: true,
    },
  );
}
