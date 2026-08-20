import { generatePdf } from 'html-pdf-node';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { DeclaracionPdfRow } from './dto/declaracion-pdf-row.dto';

export interface DeclaracionPdfOptions {
  usuario: string;
  fecha: string;
  logoDataUri: string | null;
}

const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB

// ── Template cache (loaded once from disk) ──────────────────

let _templateCache: string | null = null;

function loadTemplate(): string {
  if (_templateCache) return _templateCache;
  // __dirname may be dist/ (compiled) or src/ (ts-node), so resolve
  // relative to cwd() which is always the backend root.
  const templatePath = join(
    process.cwd(),
    'src',
    'alcabala',
    'impresion-dj-alcabala',
    'declaracion-dj-template.html',
  );
  _templateCache = readFileSync(templatePath, 'utf-8');
  return _templateCache;
}

// ── Helpers ─────────────────────────────────────────────────

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

// ── Build row HTML fragments ────────────────────────────────

function buildRows(row: DeclaracionPdfRow, opts: DeclaracionPdfOptions) {
  const logo = opts.logoDataUri
    ? `<img class="logo" src="${esc(opts.logoDataUri)}" alt="logo" />`
    : '';

  return {
    logo,
    // RECEPCIÓN
    row_recepcion_1: `<tr>${cell('CÓDIGO COMPRA', row.codigo_compra)}${cell('COMPRADOR', row.comprador)}</tr>`,
    row_recepcion_2: `<tr>${cell('DIRECCIÓN FISCAL', row.comprador_fiscal)}${cell('DNI', row.comprador_dni)}</tr>`,
    row_recepcion_3: `<tr>${cell('CÓDIGO VENTA', row.codigo_venta)}${cell('VENDEDOR', row.vendedor)}</tr>`,
    row_recepcion_4: `<tr>${cell('DIRECCIÓN FISCAL', row.vendedor_fiscal)}${cell('DNI', row.vendedor_dni)}</tr>`,
    // DATOS GENERALES
    row_datos_1: `<tr>${cell('CONTRATO', row.contrato)}${cell('FECHA CONTRATO', row.fecha_contrato)}</tr>`,
    row_datos_2: `<tr>${cell('DIRECCIÓN PREDIO', row.direccion_predio)}${cell('TIPO DE PREDIO', row.tipo_pred)}</tr>`,
    // VALOR DE LA TRANSFERENCIA
    row_valor: `<tr>${amtCell('TRANSFERENCIA', row.transferencia)}${amtCell('AUTOAVALÚO', row.autoavaluo)}</tr>`,
    // CÁLCULO DEL IMPUESTO
    row_calculo_1: `<tr>${amtCell('MONTO INAFECTO', row.monto_inafecto)}${amtCell('MONTO AFECTO', row.monto_afecto)}</tr>`,
    row_calculo_2: `<tr>${amtCell('MORA', row.mora)}${amtCell('TASA IMPUESTO %', row.tasa_impuesto)}</tr>`,
    row_calculo_3: `<tr>${amtCell('BASE IMPONIBLE', row.base_imponible)}</tr>`,
    // MONTO DE LA ALCABALA
    row_monto: `<tr>${amtCell('MONTO ALCABALA', row.monto_alcabala)}${amtCell('TOTAL ALCABALA', row.total_alcabala)}</tr>`,
    // Plain text fields
    monto_letras: esc(row.monto_letras),
    observacion: esc(row.observacion),
    // Footer
    usuario: esc(opts.usuario),
    fecha: esc(opts.fecha),
  };
}

// ── Main build function ─────────────────────────────────────

/**
 * Builds the A4 HTML by loading the external template and replacing
 * {{placeholder}} tokens with rendered cell fragments.
 * Design is identical to the original inline-template version.
 */
export function buildDeclaracionPdfHtml(
  row: DeclaracionPdfRow,
  opts: DeclaracionPdfOptions,
): string {
  const template = loadTemplate();
  const values = buildRows(row, opts);

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return key in values ? (values as Record<string, string>)[key] : '';
  });
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
