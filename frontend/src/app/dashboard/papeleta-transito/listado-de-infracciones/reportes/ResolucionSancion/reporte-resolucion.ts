import {
  escapeHtml,
  llenarPlantilla,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

export interface DatosResolucion {
  nroSancion: string;
  nroPapeleta: string;
  fecAplicacion?: string;
  codInfraccion?: string;
  detalleInfraccion?: string;
  placa?: string;
  nombreInfractor?: string;
  direccionInfractor?: string;
  montoMuta?: number;
  montoEnLetras?: string;
  fechaEmision?: string;
  usuario?: string;
}

export interface PlantillaReporteData {
  html: string;
  css: string;
}

export function construirHtmlReporteResolucion(
  data: DatosResolucion,
  plantilla: PlantillaReporteData,
): string {
  const conValores = llenarPlantilla(plantilla.html, {
    nroResolucion: data.nroSancion || "00000",
    nombre: data.nombreInfractor || "-",
    dni: data.direccionInfractor || "-",
    placa: data.placa || "-",
    nroPapeleta: data.nroPapeleta || "-",
    fechaPapeleta: data.fecAplicacion || "-",
    usuario: data.usuario || "SISTEMA",
    fecha: data.fechaEmision || new Date().toLocaleDateString("es-PE"),
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-resolucion.css">',
    `<style>${plantilla.css}</style>`,
  );
}

export function construirConfigPdfResolucion(
  data: DatosResolucion,
): ReportePdfConfig {
  return {
    filename: `resolucion-sancion-${data.nroSancion || "papeleta"}.pdf`,
    titulo: "Resolución de Sanción",
    orientacion: "portrait",
    subtitulo: [
      ["N° Resolución", `${data.nroSancion || "-"}-SGO-G-SAT-ICA`],
      ["N° Papeleta", data.nroPapeleta || "-"],
      ["Infractor", data.nombreInfractor || "-"],
      ["Placa", data.placa || "-"],
    ],
    columnas: ["Campo", "Valor"],
    filas: [
      ["N° Resolución", `${data.nroSancion || "-"}-SGO-G-SAT-ICA`],
      ["N° Papeleta", data.nroPapeleta || "-"],
      ["Fecha Aplicación", data.fecAplicacion || "-"],
      ["Código Infracción", data.codInfraccion || "-"],
      ["Detalle Infracción", data.detalleInfraccion || "-"],
      ["Placa", data.placa || "-"],
      ["Infractor", data.nombreInfractor || "-"],
      ["Dirección", data.direccionInfractor || "-"],
      ["Monto Multa", `S/. ${Number(data.montoMuta || 0).toFixed(2)}`],
    ],
  };
}
