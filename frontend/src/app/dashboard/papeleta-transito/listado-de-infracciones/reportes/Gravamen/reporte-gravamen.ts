import {
  escapeHtml,
  llenarPlantilla,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

/**
 * Data returned by sp_Imprime_Certificadogravamen @buscar=2.
 * The SP returns a SINGLE header row — not a list of papeleta rows.
 * Fields match what the legacy .jrxml defines:
 *   placa, nro (documento), num_ingr (recibo), fecha, hora, USU_REG
 */
export interface DatosGravamen {
  placa: string;
  numRecibo: string;
  nroDocumento: string;
  usuario: string;
  fecha?: string;
  hora?: string;
  sinDatos?: boolean;
}

export interface PlantillaReporteData {
  html: string;
  css: string;
}

export function construirHtmlReporteGravamen(
  data: DatosGravamen,
  plantilla: PlantillaReporteData,
): string {
  const now = new Date();
  const fechaDisplay = data.fecha || now.toLocaleDateString("es-PE");
  const horaDisplay = data.hora || now.toLocaleTimeString("es-PE");

  const sinDatosHtml =
    data.sinDatos
      ? `<p class="sin-datos">NO REGISTRA INFRACCION EN EL SISTEMA HASTA LA FECHA: ${escapeHtml(fechaDisplay)} Y HORA: ${escapeHtml(horaDisplay)}</p>`
      : "";

  let html = plantilla.html;

  const conValores = llenarPlantilla(html, {
    placa: escapeHtml(data.placa || "-"),
    numRecibo: escapeHtml(data.numRecibo || "-"),
    nroDocumento: escapeHtml(data.nroDocumento || "-"),
    usuario: escapeHtml(data.usuario || "SISTEMA"),
    fecha: escapeHtml(fechaDisplay),
    hora: escapeHtml(horaDisplay),
    sinDatos: sinDatosHtml,
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-gravamen.css">',
    `<style>${plantilla.css}</style>`,
  );
}

export function construirConfigPdfGravamen(
  data: DatosGravamen,
): ReportePdfConfig {
  return {
    filename: `gravamen-${data.placa || "placa"}.pdf`,
    titulo: "Gravamen de Papeletas por Infracción al Tránsito",
    orientacion: "portrait",
    subtitulo: [
      ["N° Placa", data.placa || "-"],
      ["N° Recibo", data.numRecibo || "-"],
      ["N° Documento", data.nroDocumento || "-"],
      ["Terminalista", data.usuario || "-"],
    ],
    columnas: [],
    filas: [],
  };
}
