"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/Descargo",
);

export interface PlantillaReporteData {
  html: string;
  css: string;
}

/**
 * Lee los archivos de plantilla del reporte de descargo de baja de predio
 * (plantilla-descargo.html + estilos-descargo.css) desde la carpeta
 * reportes/Descargo del submenú declaracion-jurada.
 */
export async function obtenerPlantillaReporteDescargoAction(): Promise<
  { success: true; data: PlantillaReporteData } | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-descargo.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-descargo.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteDescargo] Error leyendo plantilla:", error);
    return {
      success: false,
      error: "No se pudo cargar la plantilla del reporte.",
    };
  }
}
