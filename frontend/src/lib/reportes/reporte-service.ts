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
 * Genera el PDF a partir del MISMO HTML que se muestra en la vista previa
 * (el archivo descargado es idéntico a lo que ve el usuario).
 *
 * Cómo funciona: inyecta el HTML del reporte en un iframe oculto (así las
 * clases de la app —p. ej. Tailwind/dark mode— no contaminan la plantilla),
 * espera un tick para que apliquen los estilos y lo rasteriza con
 * jsPDF.html() paginado a A4.
 *
 * @param html        Plantilla ya llenada (mismo string del visor).
 * @param filename    Nombre del archivo descargado.
 * @param orientation Orientación del PDF (default: portrait).
 */
export async function descargarPdfDesdeHtml(
  html: string,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<void> {
  const iframe = document.createElement("iframe");
  // Fuera del viewport pero renderizable por el motor (display:none rompería
  // el layout dependiente de medidas).
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px"; // 210mm a ~96dpi
  iframe.style.height = "1123px"; // 297mm a ~96dpi
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  try {
    const docFrame = iframe.contentDocument;
    if (!docFrame) throw new Error("No se pudo crear el documento de impresión.");
    docFrame.open();
    docFrame.write(html);
    docFrame.close();

    // Deja que el documento pinte estilos y posibles imágenes.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });

    // Extraer el pie de página del flujo HTML antes de rasterizar:
    // autoPaging "text" de jsPDF lo parte por la mitad si queda justo en el
    // límite de página. Se dibuja al pie de la última página con pdf.text().
    const footerEl = docFrame.body.querySelector<HTMLElement>(
      ".conv-footer, .footer",
    );
    let footerLeft = "";
    let footerRight = "";
    let footerFont: "times" | "helvetica" = "helvetica";
    let footerSize = 9;
    let footerColor: [number, number, number] = [51, 51, 51];
    let footerBorder = false;
    if (footerEl) {
      const spans = footerEl.querySelectorAll("span");
      footerLeft = spans[0]?.textContent?.trim() ?? "";
      footerRight = spans[1]?.textContent?.trim() ?? "";
      const cs = getComputedStyle(footerEl);
      if (/times|serif/i.test(cs.fontFamily)) footerFont = "times";
      const px = parseFloat(cs.fontSize);
      if (Number.isFinite(px)) footerSize = px * 0.75; // px -> pt
      const rgb = cs.color
        .match(/\d+/g)
        ?.slice(0, 3)
        .map(Number);
      if (rgb?.length === 3) footerColor = rgb as [number, number, number];
      footerBorder = cs.borderTopStyle !== "none" && cs.borderTopWidth !== "0px";
      footerEl.remove();
    }

    await pdf.html(docFrame.body, {
      x: 10,
      y: 10,
      width: orientation === "portrait" ? 190 : 277,
      windowWidth: 794,
      autoPaging: "text",
    });

    if (footerLeft || footerRight) {
      const pageCount = pdf.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const y = pageHeight - 8;
      pdf.setPage(pageCount);
      pdf.setFont(footerFont, "normal");
      pdf.setFontSize(footerSize);
      pdf.setTextColor(...footerColor);
      if (footerBorder) {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(10, y - 5, pageWidth - 10, y - 5);
      }
      if (footerLeft) pdf.text(footerLeft, 10, y);
      if (footerRight) pdf.text(footerRight, pageWidth - 10, y, {
        align: "right",
      });
    }

    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}
