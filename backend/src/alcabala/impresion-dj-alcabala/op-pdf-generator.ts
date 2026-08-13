import { generatePdf } from 'html-pdf-node';
import { OpPdfRow } from './dto/op-pdf-row.dto';

/**
 * Arma el HTML A4 listo para imprimir las órdenes de pago.
 * Se imprime un bloque por fila; cada DOS bloques se fuerza un salto de página.
 */
export function buildOpPdfHtml(rows: OpPdfRow[]): string {
  const blocks: string[] = [];
  rows.forEach((row, idx) => {
    blocks.push(buildOpBlock(row));
    if ((idx + 1) % 2 === 0) {
      blocks.push('<div class="page-break"></div>');
    }
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Orden de Pago</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; }
  .page-break { page-break-after: always; }
  .op-block { width: 100%; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
</style>
</head>
<body>
${blocks.join('\n')}
</body>
</html>`;
}

function buildOpBlock(row: OpPdfRow): string {
  const t = (value: string | number | null | undefined): string =>
    value === null || value === undefined ? '' : String(value);

  const h = (label: string, value: string | number | null | undefined): string =>
    `<td><strong>${label}</strong>: ${t(value)}</td>`;

  return `<div class="op-block">
  <table>
    <tr>${h('ORDEN DE PAGO', row.numerOP)}${h('Fecha', row.fecha)}${h('Vencimiento', row.fvencimiento)}</tr>
    <tr>${h('Código', row.codigo)}${h('Contribuyente', row.nombre)}${h('DNI', row.num_doc)}</tr>
    <tr>${h('Dirección Fiscal', row.Dirfiscal)}${h('Periodo', row.periodoRomano)}</tr>
    <tr>${h('Base Imponible', row.base_imponible1)}${h('Impuesto Anual', row.imp_anual1)}${h('Cuotas', row.cuotas)}</tr>
    <tr>${h('Impuesto Insoluto', row.imp_insol)}${h('Reajuste', row.imp_reaj)}${h('Mora', row.mora)}</tr>
    <tr>${h('Costo Emisión', row.costo_emis)}${h('Total', row.imp_total)}${h('Fecha Proyectado', row.fech_proyectado)}</tr>
    <tr>${h('Código Predial', row.cod_pred)}${h('Moratorio', row.moratorio)}${h('Periodo Romano', row.periodoRomano)}</tr>
  </table>
  <p>${t(row.imp_totaltexto)}</p>
</div>`;
}

/**
 * Genera el PDF A4 de las órdenes de pago a partir de las filas ya mapeadas
 * de `Rentas.sp_ImprimeOP @buscar=2`.
 */
export async function generateOpPdf(rows: OpPdfRow[]): Promise<Buffer> {
  const content = buildOpPdfHtml(rows);
  return generatePdf(
    { content },
    { format: 'A4', margin: 0, printBackground: true },
  );
}
