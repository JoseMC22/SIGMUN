import type { LiquidacionCabecera, LiquidacionDetalleRow } from "@/actions/administracion-tributaria/compara-liquidacion";
import { fmtMoney, fmtDate, type PanelExportData } from "./liquidacion-panel";

export type { PanelExportData };

// ─── Exportación a PDF (lado a lado, landscape) ──────────────

/** Coerción dura: ningún valor puede renderizarse como "[object Object]".
 * Un objetoinválido llega como JSON legible, vacío/null llegan como "—". */
const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") return value.length ? value : "—";
  if (typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value) ?? "—";
  } catch {
    return "—";
  }
};

/** Monto solo si es número finito; cualquier otra cosa cae al toText (nunca "S/. 0.00" falso). */
const montoText = (value: unknown): string =>
  typeof value === "number" && Number.isFinite(value)
    ? `S/. ${fmtMoney(value)}`
    : toText(value);

/** Número de liquidación para el título: string con contenido, si no "Sin datos". */
const titleNumero = (cabecera?: LiquidacionCabecera | null): string =>
  typeof cabecera?.numero === "string" && cabecera.numero.length
    ? cabecera.numero
    : "Sin datos";

const cabeceraFields = (cabecera: LiquidacionCabecera): [string, string][] => [
  ["Contribuyente (Código)", toText(cabecera.codigo)],
  ["Monto", montoText(cabecera.monto)],
  ["Estado", toText(cabecera.estado)],
  ["Usuario", toText(cabecera.usuario)],
  ["Terminal", toText(cabecera.terminal)],
  ["F. Registro", fmtDate(toText(cabecera.fregistro))],
  ["F. Vencimiento", fmtDate(toText(cabecera.fvencimiento))],
  ["Observación", toText(cabecera.observacion)],
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
      return col.align === "right" ? montoText(value) : toText(value);
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
    `Comparación de Liquidaciones: ${titleNumero(paneles[0].cabecera)} vs ${titleNumero(paneles[1].cabecera)}`,
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
      // OJO: la fila debe ser un ARRAY de celdas; `head: [{...}]` (objeto
      // suelto) hace que autoTable lea el objeto como fila de valores planos y
      // renderice `colSpan` como celda "2" y `styles` como "[object Object]".
      head: [
        [
          {
            content: `${panel.titulo} — ${toText(panel.cabecera.numero)}`,
            colSpan: 2,
            // Typings de CellDef del plugin no exponen halign/fontStyle en styles.
            styles: { halign: "left", fontStyle: "bold" } as never,
          },
        ],
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
    titleNumero(paneles[0].cabecera),
    "vs",
    titleNumero(paneles[1].cabecera),
  ]
    .join("-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "");

  doc.save(`${filename}.pdf`);
}
