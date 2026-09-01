"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPORTES_BASE_DIR = path.join(
  process.cwd(),
  "src/app/dashboard/papeleta-transito/listado-de-infracciones/reportes",
);

export interface PlantillaReporteData {
  html: string;
  css: string;
}

type PlantillaResult =
  | { success: true; data: PlantillaReporteData }
  | { success: false; error: string };

// ─── Estado de Cuenta ─────────────────────────────────────────────────────────

/**
 * Lee plantilla-estado-cuenta.html + estilos-estado-cuenta.css
 * del directorio reportes/EstadoCuenta/.
 */
export async function obtenerPlantillaEstadoCuentaAction(): Promise<PlantillaResult> {
  try {
    const dir = path.join(REPORTES_BASE_DIR, "EstadoCuenta");
    const [html, css] = await Promise.all([
      readFile(path.join(dir, "plantilla-estado-cuenta.html"), "utf8"),
      readFile(path.join(dir, "estilos-estado-cuenta.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteInfracciones] Error leyendo plantilla EstadoCuenta:", error);
    return { success: false, error: "No se pudo cargar la plantilla de Estado de Cuenta." };
  }
}

// ─── Certificado No Adeudo ────────────────────────────────────────────────────

/**
 * Lee plantilla-certificado.html + estilos-certificado.css
 * del directorio reportes/Certificado/.
 */
export async function obtenerPlantillaCertificadoAction(): Promise<PlantillaResult> {
  try {
    const dir = path.join(REPORTES_BASE_DIR, "Certificado");
    const [html, css] = await Promise.all([
      readFile(path.join(dir, "plantilla-certificado.html"), "utf8"),
      readFile(path.join(dir, "estilos-certificado.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteInfracciones] Error leyendo plantilla Certificado:", error);
    return { success: false, error: "No se pudo cargar la plantilla del Certificado de No Adeudo." };
  }
}

// ─── Gravamen ─────────────────────────────────────────────────────────────────

/**
 * Lee plantilla-gravamen.html + estilos-gravamen.css
 * del directorio reportes/Gravamen/.
 */
export async function obtenerPlantillaGravamenAction(): Promise<PlantillaResult> {
  try {
    const dir = path.join(REPORTES_BASE_DIR, "Gravamen");
    const [html, css] = await Promise.all([
      readFile(path.join(dir, "plantilla-gravamen.html"), "utf8"),
      readFile(path.join(dir, "estilos-gravamen.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteInfracciones] Error leyendo plantilla Gravamen:", error);
    return { success: false, error: "No se pudo cargar la plantilla del Certificado de Gravamen." };
  }
}

// ─── Resolución de Sanción ────────────────────────────────────────────────────

/**
 * Lee plantilla-resolucion.html + estilos-resolucion.css
 * del directorio reportes/ResolucionSancion/.
 */
export async function obtenerPlantillaResolucionSancionAction(): Promise<PlantillaResult> {
  try {
    const dir = path.join(REPORTES_BASE_DIR, "ResolucionSancion");
    const [html, css] = await Promise.all([
      readFile(path.join(dir, "plantilla-resolucion.html"), "utf8"),
      readFile(path.join(dir, "estilos-resolucion.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteInfracciones] Error leyendo plantilla ResolucionSancion:", error);
    return { success: false, error: "No se pudo cargar la plantilla de la Resolución de Sanción." };
  }
}

// ─── Récord Pendiente del Infractor ───────────────────────────────────────────

/**
 * Lee plantilla-record.html + estilos-record.css
 * del directorio reportes/RecordPendiente/.
 */
export async function obtenerPlantillaRecordAction(): Promise<PlantillaResult> {
  try {
    const dir = path.join(REPORTES_BASE_DIR, "RecordPendiente");
    const [html, css] = await Promise.all([
      readFile(path.join(dir, "plantilla-record.html"), "utf8"),
      readFile(path.join(dir, "estilos-record.css"), "utf8"),
    ]);
    return { success: true, data: { html, css } };
  } catch (error) {
    console.error("[ReporteInfracciones] Error leyendo plantilla RecordPendiente:", error);
    return { success: false, error: "No se pudo cargar la plantilla de Récord Pendiente." };
  }
}
