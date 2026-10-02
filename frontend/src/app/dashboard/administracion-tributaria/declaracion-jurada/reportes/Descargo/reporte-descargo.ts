import {
  llenarPlantilla,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { ReporteDescargoData } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { PlantillaReporteData } from "@/actions/administracion-tributaria/reporte-descargo";

// ─── HTML (vista previa + impresión) ──────────────────────────────

/**
 * Llena la plantilla HTML del descargo de baja de predio con los datos del
 * SP [Rentas].[BajasPredio] @buscar=2. Todos los valores se escapan vía
 * llenarPlantilla. Inyecta el CSS inline (el <link> relativo no resuelve
 * dentro del modal).
 */
export function construirHtmlReporteDescargo(
  data: ReporteDescargoData,
  plantilla: PlantillaReporteData,
): string {
  const conValores = llenarPlantilla(plantilla.html, {
    anno: data.anno,
    nroDeclaracion: data.nro_declaracion,
    codigo: data.codigo,
    nombre: data.nombre,
    documento: data.documento,
    numDoc: data.num_doc,
    tipoDetalle: data.tipo_detalle,
    subtipoDetalle: data.subtipo_detalle,
    tipoPred: data.tipo_pred,
    descargo: data.descargo,
    porcPropiedad: data.porc_propiedad,
    fechDeclaracion: data.fech_declaracion,
    fechaTransferencia: data.fecha_transferencia,
    observacion: data.observacion,
    codigoAdquiriente: data.codigo_adquiriente,
    tipoDetalleAdquiriente: data.tipo_detalle_adquiriente,
    subtipoDetalleAdquiriente: data.subtipo_detalle_adquiriente,
    documentoAdquiriente: data.documento_adquiriente,
    numDocAdquiriente: data.num_doc_adquiriente,
    adquiriente: data.adquiriente,
    notaria: data.notaria,
    direccionPredio: data.direccion_predio,
    operador: data.operador,
    fechaRegistro: data.fecha_registro,
    fechaImpresion: data.fecha_impresion,
  });

  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-descargo.css">',
    `<style>${plantilla.css}</style>`,
  );
}

// ─── PDF (Guardar en la PC) ───────────────────────────────────────

/** Construye la configuración del PDF descargable del reporte. */
export function construirConfigPdfDescargo(
  data: ReporteDescargoData,
): ReportePdfConfig {
  return {
    filename: `descargo-${data.cod_pred}-${data.anno}.pdf`,
    titulo: "Descargo de Baja de Predio",
    orientacion: "portrait",
    subtitulo: [
      ["Código", data.codigo],
      ["Contribuyente", data.nombre],
      ["Predio", `${data.cod_pred}-${data.anexo}-${data.sub_anexo}`],
      ["Año", data.anno],
      ["Nro Declaración", data.nro_declaracion],
    ],
    columnas: ["Campo", "Valor"],
    filas: [
      ["Tipo Predio", data.tipo_pred || "-"],
      ["Motivo Descargo", data.descargo || "-"],
      ["Porcentaje Propiedad", data.porc_propiedad ? `${data.porc_propiedad} (%)` : "-"],
      ["Fecha Declaración", data.fech_declaracion || "-"],
      ["Fecha Transferencia", data.fecha_transferencia || "-"],
      ["Dirección del Predio", data.direccion_predio || "-"],
      ["Adquiriente", data.adquiriente || "-"],
      ["Notaria", data.notaria || "-"],
    ],
  };
}
