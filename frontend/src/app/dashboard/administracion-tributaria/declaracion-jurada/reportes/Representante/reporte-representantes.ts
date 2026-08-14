import {
  escapeHtml,
  llenarPlantilla,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { ObtenerRepresentantesData } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { PlantillaReporteData } from "@/actions/administracion-tributaria/reporte-representantes";

// ─── HTML (vista previa + impresión) ──────────────────────────────

/**
 * Llena la plantilla HTML de representantes con los datos del SP.
 * Reemplaza {{filas}} con una fila <tr> por representante y los demás
 * marcadores con los datos del contribuyente. Inyecta el CSS inline
 * (el <link> relativo no resuelve dentro del modal).
 */
export function construirHtmlReporteRepresentantes(
  data: ObtenerRepresentantesData,
  plantilla: PlantillaReporteData,
): string {
  const filas =
    data.representantes.length > 0
      ? data.representantes
          .map(
            (r) => `        <tr>
                    <td>${escapeHtml(r.tipoRelacion || "-")}</td>
                    <td>${escapeHtml(r.nombres || "-")}</td>
                    <td>${escapeHtml(r.tipoDocumento || "-")}</td>
                    <td>${escapeHtml(r.nroDocumento || "-")}</td>
                    <td>${escapeHtml(r.direccion || "-")}</td>
                </tr>`,
          )
          .join("\n")
      : `        <tr><td colspan="5" style="text-align:center">No se encontraron representantes registrados.</td></tr>`;

  const conFilas = reemplazarBloques(plantilla.html, { filas });
  const conValores = llenarPlantilla(conFilas, {
    fecha: new Date().toLocaleDateString("es-PE"),
    codigo: data.datos.codigo,
    nombre: data.datos.nombres,
    numDoc: data.datos.numDoc,
    direccion: data.datos.direccion,
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-representantes.css">',
    `<style>${plantilla.css}</style>`,
  );
}

// ─── PDF (Guardar en la PC) ───────────────────────────────────────

/** Construye la configuración del PDF descargable del reporte. */
export function construirConfigPdfRepresentantes(
  data: ObtenerRepresentantesData,
): ReportePdfConfig {
  return {
    filename: `representantes-${data.datos.codigo}.pdf`,
    titulo: "Reporte de Representantes",
    orientacion: "landscape",
    subtitulo: [
      ["Código", data.datos.codigo],
      ["Nombre", data.datos.nombres],
      ["N° Documento", data.datos.numDoc],
      ["Dirección", data.datos.direccion],
    ],
    columnas: ["Tipo Repre", "Nombre", "Tipo Doc.", "N° Doc.", "Dirección"],
    filas: data.representantes.map((r) => [
      r.tipoRelacion || "-",
      r.nombres || "-",
      r.tipoDocumento || "-",
      r.nroDocumento || "-",
      r.direccion || "-",
    ]),
  };
}
