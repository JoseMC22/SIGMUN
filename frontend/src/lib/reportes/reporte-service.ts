import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Escapado de HTML (seguridad al llenar plantillas) ───────────

export function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Llenado de plantillas ────────────────────────────────────────

/**
 * Reemplaza marcadores `{{clave}}` con valores escapados.
 * Si el valor es vacío/undefined, usa "-".
 */
export function llenarPlantilla(
  template: string,
  valores: Record<string, string | undefined>,
): string {
  return Object.entries(valores).reduce((acc, [clave, valor]) => {
    const texto = valor && valor.trim() !== "" ? valor : "-";
    return acc.split(`{{${clave}}}`).join(escapeHtml(texto));
  }, template);
}

/**
 * Reemplaza marcadores `{{clave}}` con bloques HTML CRUDOS (no escapados).
 * Útil para inyectar filas de tabla u otros fragmentos generados.
 */
export function reemplazarBloques(
  template: string,
  bloques: Record<string, string>,
): string {
  return Object.entries(bloques).reduce(
    (acc, [clave, bloque]) => acc.split(`{{${clave}}}`).join(bloque),
    template,
  );
}

// ─── Configuración de PDF ─────────────────────────────────────────

export interface ReportePdfConfig {
  filename: string;
  titulo: string;
  orientacion?: "portrait" | "landscape";
  /** Pares [label, value] mostrados bajo el título, p. ej. [["Código", "000123"]]. */
  subtitulo?: Array<[string, string]>;
  columnas: string[];
  filas: Array<Array<string | number>>;
}

/**
 * Genera un PDF A4 con título, datos del encabezado y tabla (jspdf + autotable).
 */
export function generarPdf(config: ReportePdfConfig): jsPDF {
  const doc = new jsPDF({
    orientation: config.orientacion ?? "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(config.titulo, 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = 24;
  for (const [label, value] of config.subtitulo ?? []) {
    doc.text(`${label}: ${value}`, 14, y);
    y += 5;
  }

  autoTable(doc, {
    startY: y + 2,
    head: [config.columnas],
    body: config.filas,
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  });

  return doc;
}

/** Dispara la descarga del PDF en el navegador. */
export function descargarPdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

/**
 * Imprime / descarga como PDF el HTML proporcionado usando el motor
 * nativo del navegador (window.print). Produce un resultado idéntico
 * al preview visual sin depender de html2canvas ni heredar dark-mode.
 *
 * El usuario verá el diálogo de impresión del SO; desde ahí puede
 * elegir "Guardar como PDF" o una impresora física.
 *
 * @param html        Plantilla ya rellena (CSS inlineado).
 * @param _filename   Nombre sugerido (el SO lo usa si el browser lo soporta).
 */
export async function descargarPdfDesdeHtml(
  html: string,
  _filename: string,
  _orientation: "portrait" | "landscape" = "portrait",
): Promise<void> {
  return new Promise<void>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const docFrame = iframe.contentDocument;
    if (!docFrame) {
      iframe.remove();
      resolve();
      return;
    }

    docFrame.open();
    docFrame.write(html);
    docFrame.close();

    // Espera a que carguen fuentes e imágenes antes de imprimir
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          // Limpia el iframe después de que el diálogo cierra
          setTimeout(() => {
            iframe.remove();
            resolve();
          }, 1000);
        }
      }, 300);
    };
  });
}


