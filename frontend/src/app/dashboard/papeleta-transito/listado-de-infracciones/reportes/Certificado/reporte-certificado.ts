import {
  llenarPlantilla,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";

export interface DatosCertificadoNoAdeudo {
  certNro: string;
  nombreInfractor: string;
  numDoc: string;
  licencia: string;
  direccion: string;
  numRecibo: string;
  fechaExpedicion?: string;
  usuario?: string;
  hora?: string;
  estacion?: string;
}

export interface PlantillaReporteData {
  html: string;
  css: string;
}

export function construirHtmlReporteCertificado(
  data: DatosCertificadoNoAdeudo,
  plantilla: PlantillaReporteData,
): string {
  const conValores = llenarPlantilla(plantilla.html, {
    certNro: data.certNro || "00000",
    nombreInfractor: data.nombreInfractor || "-",
    numDoc: data.numDoc || "-",
    licencia: data.licencia || "-",
    direccion: data.direccion || "-",
    numRecibo: data.numRecibo || "-",
    fechaExpedicion: data.fechaExpedicion || new Date().toLocaleDateString("es-PE"),
    usuario: data.usuario || "SISTEMA",
    hora: data.hora || new Date().toLocaleTimeString("es-PE"),
    estacion: data.estacion || "",
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-certificado.css">',
    `<style>${plantilla.css}</style>`,
  );
}

export function construirConfigPdfCertificado(
  data: DatosCertificadoNoAdeudo,
): ReportePdfConfig {
  return {
    filename: `certificado-no-adeudo-${data.certNro || "papeleta"}.pdf`,
    titulo: "Certificado de No Adeudo del Conductor",
    orientacion: "portrait",
    subtitulo: [
      ["N° Certificado", data.certNro || "-"],
      ["Conductor", data.nombreInfractor || "-"],
      ["DNI", data.numDoc || "-"],
      ["Licencia", data.licencia || "-"],
    ],
    columnas: ["Campo", "Valor"],
    filas: [
      ["Nombre / Razón Social", data.nombreInfractor || "-"],
      ["N° Documento", data.numDoc || "-"],
      ["Licencia de Conducir", data.licencia || "-"],
      ["Domicilio", data.direccion || "-"],
      ["N° Recibo de Pago", data.numRecibo || "-"],
    ],
  };
}
