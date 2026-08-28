import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
} from '@/lib/reportes/reporte-service';
import type {
  DeudaConsolidadoData,
  DeudaConsolidadoFila,
} from '@/actions/administracion-tributaria/declaracion-jurada';
import type { PlantillaReporteData } from '@/actions/administracion-tributaria/reporte-deuda-consolidada';

// ─── Helpers ───────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Agrupa las filas por año (como el reporte legacy) y construye el HTML.
 * Cada año abre una tabla con su encabezado; al cambiar de año se cierra el
 * bloque con el subtotal "Deuda Total para el Año". Al final se suma todo.
 *
 * @param data  Datos del SP (cabecera + filas agrupadas por año)
 * @param plantilla  Plantilla HTML + CSS del reporte
 * @param opts  Datos adicionales: usuario que atendió el reporte
 */
export function construirHtmlDeudaConsolidada(
  data: DeudaConsolidadoData,
  plantilla: PlantillaReporteData,
  opts?: { usuario?: string },
): string {
  const filas = data.filas;
  const usuario = opts?.usuario ?? '';

  // No data → show a friendly message in place of the rows block.
  if (filas.length === 0) {
    const sinFilas =
      '<div class="text1" style="text-align:center">No se encontraron deudas para este contribuyente.</div>';
    const conFilas = reemplazarBloques(plantilla.html, { filas: sinFilas });
    return llenarPlantilla(conFilas, {
      codigo: data.cabecera.codigo,
      nombre: data.cabecera.nombre,
      direccion: data.cabecera.direccion,
      totalNeto: '0.00',
      usuario,
      fechahoy: new Date().toLocaleDateString('es-PE'),
    }).replace(
      '<link rel="stylesheet" href="./estilos-deuda-consolidada.css">',
      `<style>${plantilla.css}</style>`,
    );
  }

  // ── Build {{filas}} block grouped by year ──
  // Use a Map to keep insertion order of first-seen year, then accumulate.
  const blocks: string[] = [];
  const header =
    '<tr><td colspan="3"><hr></td></tr>' +
    '<tr>' +
    '<td width="15%"><span><center>Año</center></span></td>' +
    '<td width="65%" align="left"><span>Tributos</span></td>' +
    '<td width="20%"><span><center>Importes</center></span></td>' +
    '</tr>' +
    '<tr><td colspan="3"><hr></td></tr>';

  const yearGroups = new Map<string, DeudaConsolidadoFila[]>();
  for (const f of filas) {
    const bucket = yearGroups.get(f.anno);
    if (bucket) {
      bucket.push(f);
    } else {
      yearGroups.set(f.anno, [f]);
    }
  }

  let totalGeneral = 0;

  for (const [anno, group] of yearGroups) {
    const subtotal = group.reduce((s, f) => s + f.saldo, 0);
    totalGeneral += subtotal;

    const detailRows = group
      .map(
        (f) =>
          `<tr>` +
          `<td><span>${escapeHtml(f.anno)}</span></td>` +
          `<td><span>${escapeHtml(f.tipoagr)}</span></td>` +
          `<td align="right"><span>${fmt(f.saldo)}</span></td>` +
          `</tr>`,
      )
      .join('\n');

    blocks.push(
      `<div style="padding:2px 2px 2px 2px">` +
        `<table width="100%" cellspacing="0" cellpadding="0" border="0" class="text1"><tbody>` +
        header +
        detailRows +
        `</tbody></table>` +
        `<table width="100%" cellspacing="0" cellpadding="0" border="0" class="text1"><tbody>` +
        `<tr><td colspan="2" height="5"></td></tr>` +
        `<tr><td colspan="2" width="80%">Deuda Total para el Año: ${escapeHtml(anno)}</td><td align="right">${fmt(subtotal)}</td></tr>` +
        `</tbody></table>` +
        `<hr>` +
        `</div>`,
    );
  }

  const filasBlock = blocks.join('\n');

  const conFilas = reemplazarBloques(plantilla.html, { filas: filasBlock });
  const conValores = llenarPlantilla(conFilas, {
    codigo: data.cabecera.codigo,
    nombre: data.cabecera.nombre,
    direccion: data.cabecera.direccion,
    totalNeto: fmt(totalGeneral),
    usuario,
    fechahoy: new Date().toLocaleDateString('es-PE'),
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-deuda-consolidada.css">',
    `<style>${plantilla.css}</style>`,
  );
}
