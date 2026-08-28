import { escapeHtml } from '@/lib/reportes/reporte-service';
import type { VerPagosData } from '@/actions/administracion-tributaria/declaracion-jurada';
import type { PlantillaReporteData } from '@/actions/administracion-tributaria/reporte-ver-pagos';

// ─── Helpers ───────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Bank CSS class + logo mapping ────────────────────────

function bankClass(banco: string): string {
  const b = banco.toUpperCase();
  if (b === 'INTERBANK') return 'interbank';
  if (b === 'CMACICA') return 'cmacica';
  return '';
}

// ─── HTML (vista previa + impresión) ───────────────────────

/**
 * Llena la plantilla HTML de Ver Pagos con los datos del SP.
 * Cada recibo se renderiza como una sección con cabecera
 * (contribuyente, recibo#, fecha, total) + tabla de detalles.
 */
export function construirHtmlVerPagos(
  data: VerPagosData,
  plantilla: PlantillaReporteData,
): string {
  if (data.recibos.length === 0) {
    const noResults = `
      <div class="no-results">
        NO SE ENCONTRARON PAGOS REGISTRADOS DE ESTE CONTRIBUYENTE.
      </div>`;
    return plantilla.html
      .replace('{{receipts}}', noResults)
      .replace('<link rel="stylesheet" href="./estilos-ver-pagos.css">', `<style>${plantilla.css}</style>`);
  }

  const receiptsHtml = data.recibos.map((recibo) => {
    const cssClass = bankClass(recibo.banco);

    // Build detail rows
    const detailRows = recibo.detalles.map((d) => `
      <tr>
        <td>${escapeHtml(d.anno)}</td>
        <td>${escapeHtml(d.codObligacion)}</td>
        <td>${escapeHtml(d.tributo)}</td>
        <td>${escapeHtml(d.cuota)}</td>
        <td>${fmt(d.insoluto)}</td>
        <td>${fmt(d.intereses)}</td>
        <td>${fmt(d.emision)}</td>
        <td>${fmt(d.descuento)}</td>
        <td>${fmt(d.totalPagado)}</td>
        <td>${escapeHtml(d.codReferencia)}</td>
      </tr>`).join('');

    return `
      <div class="receipt-section ${cssClass}">
        <div class="receipt-header">
          <div class="info">
            <strong>Contribuyente:</strong> ${escapeHtml(recibo.contribuyente)}
          </div>
        </div>
        <div class="receipt-meta">
          <div class="recibo-num">Recibo N°: ${escapeHtml(recibo.nroRecibo)} / ${escapeHtml(recibo.banco)}</div>
          <div class="fecha">Fecha de pago: ${escapeHtml(recibo.fechaPago)}</div>
          <div class="total">Total Pagado: S/ ${fmt(recibo.totalPagado)}</div>
        </div>
        <table class="receipt-table">
          <thead>
            <tr>
              <th>Año</th>
              <th>Cod. Obligación</th>
              <th>Tributo</th>
              <th>Cuota</th>
              <th>Insoluto</th>
              <th>Intereses</th>
              <th>Emisión</th>
              <th>Descuento</th>
              <th>Total Pagado</th>
              <th>Cod. Referencia</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows}
          </tbody>
        </table>
      </div>`;
  }).join('\n');

  return plantilla.html
    .replace('{{receipts}}', receiptsHtml)
    .replace('<link rel="stylesheet" href="./estilos-ver-pagos.css">', `<style>${plantilla.css}</style>`);
}
