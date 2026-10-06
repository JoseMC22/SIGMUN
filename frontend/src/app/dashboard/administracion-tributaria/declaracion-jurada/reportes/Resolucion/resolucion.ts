import {
  escapeHtml,
  llenarPlantilla,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { DatosResolucionData } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { PlantillaResolucionData } from "@/actions/administracion-tributaria/reporte-resolucion";

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

/**
 * Fecha/hora actual dd/MM/yyyy HH:mm:ss (variable $V{Ahora} del jrxml).
 */
function ahora(): string {
  const d = new Date();
  const partes = [
    d.getDate(),
    d.getMonth() + 1,
    d.getFullYear(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ].map((n) => String(n).padStart(2, "0"));
  return `${partes[0]}/${partes[1]}/${partes[2]} ${partes[3]}:${partes[4]}:${partes[5]}`;
}

// ─── HTML (vista previa + impresión) ──────────────────────────────

/**
 * Llena la plantilla HTML de la Resolución de Gerencia con los datos de
 * Rentas.ResolucionConvenio @buscar=1. Replica las expresiones del
 * JasperReport rpt_conv_resolucion.jrxml.
 */
export function construirHtmlReporteResolucion(
  data: DatosResolucionData,
  plantilla: PlantillaResolucionData,
  opciones: { codigo: string; convenio: string; funcionario: string },
): string {
  const conValores = llenarPlantilla(plantilla.html, {
    logoUrl: "/logo_sat_2026.jpeg",
    nombre_contribuyente: data.nombre_contribuyente,
    numero_documento: data.numero_documento,
    direcion: data.direcion,
    valores: data.valores,
    numero_cuotas: data.numero_cuotas,
    fecha_convenio: data.fecha_convenio,
    cuota_inicial: fmtMonto(data.cuota_inicial),
    numero_letra: data.numero_letra,
    fecha_cancelado: data.fecha_cancelado,
    codigo: opciones.codigo,
    convenio: opciones.convenio,
    funcionario: opciones.funcionario,
    ahora: ahora(),
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-resolucion.css">',
    `<style>${plantilla.css}</style>`,
  );
}

// ─── PDF (Guardar en la PC) ───────────────────────────────────────

/**
 * Construye la configuración del PDF descargable de la resolución.
 * El reporte es un documento de texto (sin tabla), así que las columnas
 * quedan vacías; descargarPdfDesdeHtml rasteriza el MISMO HTML.
 */
export function construirConfigPdfResolucion(
  data: DatosResolucionData,
  opciones: { codigo: string; convenio: string },
): ReportePdfConfig {
  return {
    filename: `resolucion-${opciones.convenio}.pdf`,
    titulo: `Resolución de Gerencia - Convenio ${opciones.convenio}`,
    orientacion: "portrait",
    subtitulo: [
      ["Código", opciones.codigo],
      ["Nombre", data.nombre_contribuyente],
      ["Documento", data.numero_documento],
      ["Fecha Convenio", data.fecha_convenio],
    ],
    columnas: [],
    filas: [],
  };
}