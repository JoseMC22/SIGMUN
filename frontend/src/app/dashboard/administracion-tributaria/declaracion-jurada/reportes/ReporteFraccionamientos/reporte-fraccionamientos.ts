import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { ReporteFraccionamientoRow } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { PlantillaReporteFraccionamientosData } from "@/actions/administracion-tributaria/reporte-fraccionamientos";

/**
 * Formato de montos del legacy: number_format(x, 2, ".", " ")
 * → "1 234.56" (espacio como separador de miles).
 */
function fmtMonto(n: number | string): string {
  const num = typeof n === "number" ? n : Number(String(n).replace(/[,\s]/g, ""));
  if (!Number.isFinite(num)) return String(n);
  const [entero, decimales] = num.toFixed(2).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${conMiles}.${decimales}`;
}

/** Fecha/hora actual dd/MM/yyyy HH:mm:ss. */
function ahora(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Etiqueta legible del filtro de usuario ('' = todos). */
function etiquetaUsuario(operador: string): string {
  return operador.trim() === "" ? "TODOS" : operador;
}

// ─── HTML (vista previa + impresión) ──────────────────────────────

/**
 * Llena la plantilla HTML del Reporte de Fraccionamientos Emitidos con las
 * filas de Rentas.ImprimeConvenio @buscar=8.
 */
export function construirHtmlReporteFraccionamientos(
  rows: ReporteFraccionamientoRow[],
  plantilla: PlantillaReporteFraccionamientosData,
  opciones: {
    desde: string;
    hasta: string;
    operador: string;
    funcionario: string;
  },
): string {
  // ── filas de la tabla ──
  let filasHtml: string;
  if (rows.length === 0) {
    filasHtml =
      '<tr><td colspan="9" style="text-align:center;padding:8px 0">No se encontraron fraccionamientos para el rango indicado.</td></tr>';
  } else {
    filasHtml = rows
      .map(
        (r) =>
          `<tr>` +
          `<td class="der">${escapeHtml(r.anno)}</td>` +
          `<td>${escapeHtml(r.convenio)}</td>` +
          `<td>${escapeHtml(r.estado)}</td>` +
          `<td>${escapeHtml(r.fecha)}</td>` +
          `<td class="der">${fmtMonto(r.deudaIni)}</td>` +
          `<td class="der">${escapeHtml(r.cuotas)}</td>` +
          `<td class="der">${escapeHtml(r.cuotasCanceladas)}</td>` +
          `<td class="der">${escapeHtml(r.cuotasVencidas)}</td>` +
          `<td>${escapeHtml(r.operador)}</td>` +
          `</tr>`,
      )
      .join("\n");
  }

  const deudaTotal = rows.reduce(
    (suma, r) => suma + (Number(String(r.deudaIni).replace(/[,\s]/g, "")) || 0),
    0,
  );

  const conFilas = reemplazarBloques(plantilla.html, { filas: filasHtml });
  const conValores = llenarPlantilla(conFilas, {
    logoUrl: "/logo_sat_2026.jpeg",
    desde: opciones.desde,
    hasta: opciones.hasta,
    usuario: etiquetaUsuario(opciones.operador),
    deudaTotal: fmtMonto(deudaTotal),
    funcionario: opciones.funcionario,
    ahora: ahora(),
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-reporte-fraccionamientos.css">',
    `<style>${plantilla.css}</style>`,
  );
}

// ─── PDF (Guardar en la PC) ───────────────────────────────────────

/**
 * Configuración del PDF descargable. Como el reporte ya lleva la tabla
 * completa en el HTML, el PDF rasteriza el MISMO HTML.
 */
export function construirConfigPdfReporteFraccionamientos(
  rows: ReporteFraccionamientoRow[],
  opciones: { desde: string; hasta: string; operador: string },
): ReportePdfConfig {
  return {
    filename: `reporte-fraccionamientos-${opciones.desde}-${opciones.hasta}.pdf`,
    titulo: `Reporte de Fraccionamientos Emitidos (${opciones.desde} - ${opciones.hasta})`,
    orientacion: "landscape",
    subtitulo: [
      ["Desde", opciones.desde],
      ["Hasta", opciones.hasta],
      ["Usuario", etiquetaUsuario(opciones.operador)],
      ["Registros", String(rows.length)],
    ],
    columnas: [],
    filas: [],
  };
}