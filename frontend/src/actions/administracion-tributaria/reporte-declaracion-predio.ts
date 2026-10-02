"use server";

import { readFile } from "node:fs/promises";
import path from "path";

const REPORTES_DIR = path.resolve(process.cwd(), "src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/DeclaracionPredio");

export interface PlantillaReporteData {
  html: string;
  css: string;
}

export async function obtenerPlantillaReportePredioAction(): Promise<
  { success: true; data: PlantillaReporteData } | { success: false; error: string }
> {
  try {
    const [html, css] = await Promise.all([
      readFile(path.join(REPORTES_DIR, "plantilla-declaracion-predio.html"), "utf8"),
      readFile(path.join(REPORTES_DIR, "estilos-declaracion-predio.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg || "No se pudo cargar la plantilla del reporte." };
  }
}
