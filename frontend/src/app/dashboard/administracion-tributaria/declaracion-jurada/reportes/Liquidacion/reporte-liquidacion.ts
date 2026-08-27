import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
} from '@/lib/reportes/reporte-service';
import type { LiquidacionReporteData } from '@/actions/administracion-tributaria/declaracion-jurada';
import type { PlantillaReporteData } from '@/actions/administracion-tributaria/reporte-liquidacion';

// ─── Helpers ───────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── HTML (vista previa + impresión) ───────────────────────

/**
 * Llena la plantilla HTML de liquidación con los datos del SP.
 * Agrupa los detalles por año con subtotales y reemplaza los
 * marcadores de valor con los datos de la liquidación. Inyecta
 * el CSS inline para que funcione en nueva pestaña.
 */
export function construirHtmlReporteLiquidacion(
  data: LiquidacionReporteData,
  plantilla: PlantillaReporteData,
): string {
  // ── Build {{filas}} block: group by anno with subtotals ──
  const byYear = new Map<string, { tipo_general: string; monto: number }[]>();
  for (const d of data.detalles) {
    const bucket = byYear.get(d.anno);
    if (bucket) {
      bucket.push({ tipo_general: d.tipo_general, monto: d.monto });
    } else {
      byYear.set(d.anno, [{ tipo_general: d.tipo_general, monto: d.monto }]);
    }
  }

  const filasHtml: string[] = [];
  for (const [anno, items] of byYear) {
    // Year header row
    filasHtml.push(
      `<tr class="subtotal"><td colspan="2"><strong>${escapeHtml(anno)}</strong></td><td></td></tr>`,
    );
    // Detail rows for this year
    for (const item of items) {
      filasHtml.push(
        `<tr><td>${escapeHtml(anno)}</td><td>${escapeHtml(item.tipo_general)}</td><td>${fmt(item.monto)}</td></tr>`,
      );
    }
  }

  const filas = filasHtml.length > 0
    ? filasHtml.join('\n')
    : '<tr><td colspan="3" style="text-align:center">No se encontraron detalles.</td></tr>';

  // ── Replace {{filas}} block ──
  const conFilas = reemplazarBloques(plantilla.html, { filas });

  // ── Replace scalar @variable placeholders ──
  const conValores = llenarPlantilla(conFilas, {
    nliqui: data.nliqui,
    codigo: data.codigo,
    nombre: data.nombre,
    domicilio: data.domicilio,
    fecha: data.fecha,
    totalNeto: fmt(data.totalNeto),
    usuario: data.usuario,
    fechaImpresion: new Date().toLocaleDateString('es-PE'),
  });

  // ── Inline CSS ──
  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-liquidacion.css">',
    `<style>${plantilla.css}</style>`,
  );
}
