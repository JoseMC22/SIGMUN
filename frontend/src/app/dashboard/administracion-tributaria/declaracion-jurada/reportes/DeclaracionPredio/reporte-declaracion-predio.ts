import { llenarPlantilla, type ReportePdfConfig } from "@/lib/reportes/reporte-service";
import type { PlantillaReporteData } from "@/actions/administracion-tributaria/reporte-descargo";

export function construirHtmlReportePredio(
  data: Record<string, unknown>,
  docsHtml: string,
  plantilla: PlantillaReporteData,
): string {
  const v = (k: string) => data[k] !== undefined && data[k] !== null ? String(data[k]).trim() : "";
  const conValores = llenarPlantilla(plantilla.html, {
    anno: v("anno"),
    dj_nro: v("dj_nro"),
    codigo: v("codigo"),
    nombre: v("nombre"),
    tipo_doc: v("tipo_doc") ?? v("tipo_documento"),
    dni: v("dni"),
    tipo_contri: v("tipo_contri"),
    subtipo_contri: v("subtipo_contri"),
    direccion_fiscal: v("direcion_fiscal") ?? v("direccion_fiscal") ?? "",
    tipo_predio: v("tipo_predio"),
    cod_pred: v("cod_pred"),
    anexo: v("anexo"),
    estado: v("estado"),
    condicion: v("condicion"),
    tipo_adquisicion: v("tipo_adquisicion"),
    porcen_propiedad: v("porcen_propiedad"),
    fecha_adquisicion: v("fecha_adquisicion"),
    fecha_afectacion: v("fecha_afectacion"),
    arancel: v("arancel"),
    area_terreno: v("area_terreno"),
    area_comun: v("area_comun"),
    Frente: v("Frente"),
    Ubicacion_predio: v("Ubicacion_predio"),
    uso: v("uso"),
    Area_uso: v("Area_uso"),
    Mes_inicio: v("Mes_inicio"),
    Mes_hasta: v("Mes_hasta"),
    val_total_terreno: v("val_total_terreno"),
    val_total_constru: v("val_total_constru"),
    val_total_instala: v("val_total_instala"),
    total_autoavaluo: v("total_autoavaluo"),
    direccion_predio: v("direccion_predio"),
    motivo_registro: v("Motivo_Registro"),
    glosa: v("Glosa"),
    operador: v("operador"),
    tipo_doc: v("tipo_doc"),
    condicion_especial: v("condicion_especial"),
    situacion_predio: v("situacion_predio"),
    fecha_fiscalizacion: v("fecha_fiscalizacion"),
    nro_ficha_fizcalizacion: v("nro_ficha_fizcalizacion"),
    fecha_impresion: new Date().toLocaleString("es-PE"),
    docs_table: docsHtml,
  });
  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-declaracion-predio.css">',
    `<style>${plantilla.css}</style>`,
  );
}

export function construirConfigPdfPredio(data: Record<string, unknown>): ReportePdfConfig {
  return {
    filename: `declaracion-predio-${String(data.cod_pred ?? "")}-${String(data.anno ?? "")}.pdf`,
    titulo: "Declaración Jurada Predial",
    orientacion: "portrait",
    subtitulo: [
      ["Código", String(data.codigo ?? "")],
      ["Contribuyente", String(data.nombre ?? "")],
      ["Predio", `${String(data.cod_pred ?? "")}-${String(data.anexo ?? "")}-${String(data.sub_anexo ?? "")}`],
      ["Año", String(data.anno ?? "")],
      ["Nro Declaración", String(data.dj_nro ?? "")],
    ],
    columnas: ["Campo", "Valor"],
    filas: [
      ["Estado", String(data.estado ?? "-")],
      ["Condición", String(data.condicion ?? "-")],
      ["Tipo Adquisición", String(data.tipo_adquisicion ?? "-")],
      ["Porcentaje Propiedad", String(data.porcen_propiedad ?? "-") + " %"],
      ["Fecha Adquisición", String(data.fecha_adquisicion ?? "-")],
      ["Área Terreno", String(data.area_terreno ?? "-") + " m²"],
      ["Autovalúo", String(data.total_autoavaluo ?? "-")],
      ["Dirección", String(data.direccion_predio ?? "-")],
    ],
  };
}
