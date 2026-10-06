"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/DeudaConsolidada",
);

export interface PlantillaReporteData {
  html: string;
  css: string;
}

/**
 * Lee los archivos de plantilla del reporte de Deuda Consolidada
 * (plantilla-deuda-consolidada.html + estilos-deuda-consolidada.css)
 * desde la carpeta reportes/DeudaConsolidada/.
 */
export async function obtenerPlantillaReporteDeudaConsolidadaAction(): Promise<
  { success: true; data: PlantillaReporteData } | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-deuda-consolidada.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-deuda-consolidada.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteDeudaConsolidada] Error leyendo plantilla:", error);
    return {
      success: false,
      error: "No se pudo cargar la plantilla del reporte.",
    };
  }
}
