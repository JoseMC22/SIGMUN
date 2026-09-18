"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/ReporteFraccionamientos",
);

export interface PlantillaReporteFraccionamientosData {
  html: string;
  css: string;
}

/**
 * Lee la plantilla del Reporte de Fraccionamientos Emitidos
 * (plantilla-reporte-fraccionamientos.html + estilos-reporte-fraccionamientos.css)
 * desde la carpeta reportes/ del submenú correspondiente.
 */
export async function obtenerPlantillaReporteFraccionamientosAction(): Promise<
  | { success: true; data: PlantillaReporteFraccionamientosData }
  | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-reporte-fraccionamientos.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-reporte-fraccionamientos.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteFraccionamientos] Error leyendo plantilla:", error);
    return {
      success: false,
      error: "No se pudo cargar la plantilla del reporte de fraccionamientos.",
    };
  }
}