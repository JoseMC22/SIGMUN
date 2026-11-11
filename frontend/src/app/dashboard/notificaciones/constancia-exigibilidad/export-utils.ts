/**
 * export-utils.ts — Impresión de la Constancia de Exigibilidad (S8 de
 * odd/tasks/constancia-exigibilidad.md).
 *
 * Rellena `PlantillaConstanciaExigibilidad.html` (mismo directorio) con el
 * contrato de placeholders de S8 y la envía al motor de impresión A4 del
 * navegador (`descargarPdfDesdeHtml`, iframe oculto + window.print).
 * Documento legal SIN QR. El nombre de archivo sigue S8:
 * `Constancia_{NUMEXIG}_{ANOEXIG}.pdf`.
 */

import {
  llenarPlantilla,
  descargarPdfDesdeHtml,
} from "@/lib/reportes/reporte-service";

/** Datos de impresión ya resueltos por la capa de acción (SP @opcion=4). */
export interface ConstanciaExigibilidadImpresion {
  /** Administrado (columna Nombre). */
  nombre: string;
  /** Número de constancia/exigibilidad (NUMEXIG auto-generado por el SP). */
  numexig: string;
  /** Año de la constancia/exigibilidad (ANOEXIG). */
  anoexig: string;
  /** Valor completo legible (tipo + año + número). */
  valorCompleto: string;
  /** Fecha de notificación ya formateada dd/MM/yyyy (columna Fnotifica). */
  fnotifica: string;
  /** Número de cargo de notificación (columna Cargo). */
  nrocargo: string;
  /** Fecha de emisión del documento; por defecto, hoy. */
  fechaEmision?: Date;
}

/** Placeholders exactos del contrato S8 (ver cabecera de la plantilla). */
export interface ConstanciaExigibilidadPrintData {
  nombre: string;
  nroconstancia: string;
  valor_completo: string;
  fnotifica: string;
  nrocargo: string;
  dia: string;
  mes: string;
  anio: string;
}

/** Meses en es-ES (contrato S8: `mes` = MMMM es-ES). */
const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * Deriva el mapa de placeholders de S8 desde los datos de impresión.
 * `dia` va con cero a la izquierda (DD) y `mes` es el nombre es-ES (MMMM).
 */
export function buildConstanciaExigibilidadPrintData(
  input: ConstanciaExigibilidadImpresion,
): ConstanciaExigibilidadPrintData {
  const emision = input.fechaEmision ?? new Date();
  return {
    nombre: input.nombre,
    nroconstancia: `${input.numexig}-${input.anoexig}`,
    valor_completo: input.valorCompleto,
    fnotifica: input.fnotifica,
    nrocargo: input.nrocargo,
    dia: String(emision.getDate()).padStart(2, "0"),
    mes: MESES_ES[emision.getMonth()],
    anio: String(emision.getFullYear()),
  };
}

/**
 * Rellena la plantilla (placeholders escapados vía `llenarPlantilla`) y la
 * manda a imprimir como PDF A4 sin QR. Devuelve el HTML relleno.
 */
export async function imprimirConstanciaExigibilidad(
  templateHtml: string,
  input: ConstanciaExigibilidadImpresion,
): Promise<string> {
  const html = llenarPlantilla(
    templateHtml,
    buildConstanciaExigibilidadPrintData(input),
  );
  await descargarPdfDesdeHtml(
    html,
    `Constancia_${input.numexig}_${input.anoexig}.pdf`,
  );
  return html;
}
