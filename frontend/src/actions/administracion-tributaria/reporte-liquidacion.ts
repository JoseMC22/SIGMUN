"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/Liquidacion",
);

export interface PlantillaReporteData {
  html: string;
  css: string;
}

/**
 * Lee los archivos de plantilla del reporte de liquidación
 * (plantilla-liquidacion.html + estilos-liquidacion.css)
 * desde la carpeta reportes/ del submenú correspondiente.
 */
export async function obtenerPlantillaReporteLiquidacionAction(): Promise<
  { success: true; data: PlantillaReporteData } | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-liquidacion.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-liquidacion.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteLiquidacion] Error leyendo plantilla:", error);
    return {
      success: false,
      error: "No se pudo cargar la plantilla del reporte.",
    };
  }
}
