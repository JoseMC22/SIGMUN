"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/Resolucion",
);

export interface PlantillaResolucionData {
  html: string;
  css: string;
}

/**
 * Lee los archivos de plantilla del reporte de Resolución de Gerencia
 * (plantilla-resolucion.html + estilos-resolucion.css)
 * desde la carpeta reportes/ del submenú correspondiente.
 */
export async function obtenerPlantillaReporteResolucionAction(): Promise<
  { success: true; data: PlantillaResolucionData } | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-resolucion.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-resolucion.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteResolucion] Error leyendo plantilla:", error);
    return {
      success: false,
      error: "No se pudo cargar la plantilla de la resolución.",
    };
  }
}