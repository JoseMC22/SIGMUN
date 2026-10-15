import type { LiquidacionCabecera, LiquidacionDetalleRow } from "@/actions/administracion-tributaria/compara-liquidacion";
import { fmtMoney, fmtDate, type PanelExportData } from "./liquidacion-panel";

export type { PanelExportData };

// ─── Exportación a PDF (lado a lado, landscape) ──────────────

const cabeceraFields = (cabecera: LiquidacionCabecera): [string, string][] => [
  ["Contribuyente (Código)", cabecera.codigo || "—"],
  ["Monto", `S/. ${fmtMoney(cabecera.monto)}`],
  ["Estado", cabecera.estado || "—"],
  ["Usuario", cabecera.usuario || "—"],
  ["Terminal", cabecera.terminal || "—"],
  ["F. Registro", fmtDate(cabecera.fregistro)],
  ["F. Vencimiento", fmtDate(cabecera.fvencimiento)],
  ["Observación", cabecera.observacion || "—"],
];

const detalleColumns: { key: keyof LiquidacionDetalleRow; label: string; align?: "right" }[] = [
  { key: "secuencia", label: "Sec." },
  { key: "tipo", label: "Tipo" },
  { key: "tipoRec", label: "Rec." },
  { key: "anno", label: "Año" },
  { key: "periodo", label: "Período" },
  { key: "impInsol", label: "Imp. Insoluto", align: "right" },
  { key: "impMora", label: "Imp. Mora", align: "right" },
  { key: "costoEmi", label: "Costo Emi.", align: "right" },
  { key: "total", label: "Total", align: "right" },
  { key: "nombre", label: "Nombre" },
  { key: "femision", label: "F. Emisión" },
];

const detalleFilas = (detalle: LiquidacionDetalleRow[]): string[][] =>
  detalle.map((row) =>
    detalleColumns.map((col) => {
      const value = row[col.key];
      const text =
        value === null || value === undefined || value === "" ? "—" : String(value);
      return col.align === "right" ? fmtMoney(text) : text;
    }),
  );

/**
 * Genera y descarga el comparativo de dos liquidaciones en un solo PDF
 * landscape: título con ambos números, cabeceras lado a lado y tablas de
 * detalle lado a lado (una por columna de página). Los paneles sin datos
 * se representan con el placeholder "Sin datos".
 */
export async function generarComparaLiquidacionPdf(
  paneles: [PanelExportData, PanelExportData],
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 14;
  const gutter = 4;
  const midX = pageWidth / 2 + gutter / 2;

  // Título con ambos números (o "Sin datos" si el panel está vacío).
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    `Comparación de Liquidaciones: ${paneles[0].cabecera?.numero ?? "Sin datos"} vs ${paneles[1].cabecera?.numero ?? "Sin datos"}`,
    leftMargin,
    16,
  );

  let y = 24;

  const finalYs: number[] = [];

  for (const panel of paneles) {
    if (!panel.cabecera) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("Sin datos", panel === paneles[0] ? leftMargin : midX, y + 4);
      doc.setTextColor(0);
      continue;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: panel === paneles[0] ? leftMargin : midX, right: panel === paneles[0] ? midX - gutter / 2 : leftMargin },
      head: [
        {
          content: `${panel.titulo} — ${panel.cabecera.numero || "—"}`,
          colSpan: 2,
          // Typings de CellDef del plugin no exponen halign/fontStyle en styles.
          styles: { halign: "left", fontStyle: "bold" } as never,
        },
      ],
      body: cabeceraFields(panel.cabecera),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" } },
    });

    const finY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    finalYs.push(typeof finY === "number" ? finY : y);
  }

  y = Math.max(...finalYs) + 4;

  for (const panel of paneles) {
    if (!panel.cabecera) {
      continue;
    }
    autoTable(doc, {
      startY: y,
      margin: { left: panel === paneles[0] ? leftMargin : midX, right: panel === paneles[0] ? midX - gutter / 2 : leftMargin },
      head: [detalleColumns.map((c) => c.label)],
      body: detalleFilas(panel.detalle),
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [30, 48, 80], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: detalleColumns.reduce<Record<number, { halign: "right" }>>((acc, col, i) => {
        if (col.align === "right") acc[i] = { halign: "right" };
        return acc;
      }, {}),
    });
  }

  const filename = [
    "compara-liquidacion",
    paneles[0].cabecera?.numero ?? "sin-datos",
    "vs",
    paneles[1].cabecera?.numero ?? "sin-datos",
  ]
    .join("-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "");

  doc.save(`${filename}.pdf`);
}
