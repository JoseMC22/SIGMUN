"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/VerPagos",
);

export interface PlantillaReporteData {
  html: string;
  css: string;
}

/**
 * Lee los archivos de plantilla del reporte Ver Pagos
 * (plantilla-ver-pagos.html + estilos-ver-pagos.css)
 * desde la carpeta reportes/VerPagos/.
 */
export async function obtenerPlantillaReporteVerPagosAction(): Promise<
  { success: true; data: PlantillaReporteData } | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-ver-pagos.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-ver-pagos.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteVerPagos] Error leyendo plantilla:", error);
    return {
      success: false,
      error: "No se pudo cargar la plantilla del reporte.",
    };
  }
}
