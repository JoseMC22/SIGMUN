import type { ReporteIngresosCajeroRow } from "@/actions/administracion-tributaria/reporte-ingresos-cajero";

interface ExportExcelOptions {
  data: ReporteIngresosCajeroRow[];
  desde: string;
  hasta: string;
  totalOperaciones: number;
  totalImporte: number;
}

/**
 * Genera y descarga el archivo Excel estilizado para el Reporte de Ingresos por Cajero.
 */
export async function exportReporteIngresosCajeroExcel({
  data,
  desde,
  hasta,
  totalOperaciones,
  totalImporte,
}: ExportExcelOptions): Promise<void> {
  const XLSX = await import("xlsx-js-style");

  const NAVY = "1B2B4A";
  const SLATE_BG = "F1F5F9";
  const ROW_EVEN = "FFFFFF";
  const ROW_ODD = "F8FAFC";
  const BORDER_COLOR = "CBD5E1";
  const TOTAL_BG = "E2E8F0";

  const thinBorder = {
    top: { style: "thin", color: { rgb: BORDER_COLOR } },
    bottom: { style: "thin", color: { rgb: BORDER_COLOR } },
    left: { style: "thin", color: { rgb: BORDER_COLOR } },
    right: { style: "thin", color: { rgb: BORDER_COLOR } },
  };

  const totalBorder = {
    top: { style: "thin", color: { rgb: "0F172A" } },
    bottom: { style: "double", color: { rgb: "0F172A" } },
    left: { style: "thin", color: { rgb: BORDER_COLOR } },
    right: { style: "thin", color: { rgb: BORDER_COLOR } },
  };

  const now = new Date();
  const fechaStr = now.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const horaStr = now.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formatDesde = new Date(desde + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formatHasta = new Date(hasta + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const NUM_COLS = 4;
  const rows: any[][] = [];

  // 1. Cabecera institucional
  rows.push([
    {
      v: "SISTEMA INTEGRADO DE GESTIÓN MUNICIPAL — ADMINISTRACIÓN TRIBUTARIA",
      t: "s",
      s: {
        font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "64748B" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    },
  ]);

  // 2. Título principal
  rows.push([
    {
      v: "REPORTE DE INGRESOS POR CAJERO",
      t: "s",
      s: {
        fill: { fgColor: { rgb: NAVY } },
        font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    },
  ]);

  // 3. Barra de metadatos
  rows.push([
    {
      v: `Período: ${formatDesde} al ${formatHasta}    |    Emisión: ${fechaStr} ${horaStr}    |    Cajeros: ${data.length}`,
      t: "s",
      s: {
        fill: { fgColor: { rgb: SLATE_BG } },
        font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "334155" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    },
  ]);

  // 4. Espaciador
  rows.push([]);

  // 5. Encabezados de tabla
  const headerCols = [
    { title: "Cód. Cajero", align: "center" },
    { title: "Nombre Cajero", align: "left" },
    { title: "N° Operaciones", align: "center" },
    { title: "Importe Pagado (S/)", align: "right" },
  ];

  rows.push(
    headerCols.map((c) => ({
      v: c.title,
      t: "s",
      s: {
        fill: { fgColor: { rgb: NAVY } },
        font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: c.align, vertical: "center", wrapText: true },
        border: thinBorder,
      },
    }))
  );

  // 6. Filas de datos
  data.forEach((r, idx) => {
    const isOdd = idx % 2 === 1;
    const rowBg = isOdd ? ROW_ODD : ROW_EVEN;

    const rowStyle = (align: "left" | "center" | "right", numFmt?: string) => ({
      fill: { fgColor: { rgb: rowBg } },
      font: { name: "Segoe UI", sz: 9.5, color: { rgb: "1E293B" } },
      alignment: { horizontal: align, vertical: "center" },
      border: thinBorder,
      ...(numFmt ? { numFmt } : {}),
    });

    rows.push([
      { v: r.codigoCajero, t: "s", s: rowStyle("center") },
      { v: r.nombreCajero, t: "s", s: rowStyle("left") },
      { v: r.numeroOperaciones, t: "n", s: rowStyle("center", "#,##0") },
      { v: Number(r.importe.toFixed(2)), t: "n", s: rowStyle("right", '"S/ "#,##0.00') },
    ]);
  });

  // 7. Fila de Totales
  const totalRowStyle = (align: "left" | "center" | "right", numFmt?: string) => ({
    fill: { fgColor: { rgb: TOTAL_BG } },
    font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } },
    alignment: { horizontal: align, vertical: "center" },
    border: totalBorder,
    ...(numFmt ? { numFmt } : {}),
  });

  rows.push([
    { v: "TOTAL GENERAL", t: "s", s: totalRowStyle("center") },
    { v: `${data.length} cajero(s)`, t: "s", s: totalRowStyle("left") },
    { v: totalOperaciones, t: "n", s: totalRowStyle("center", "#,##0") },
    { v: Number(totalImporte.toFixed(2)), t: "n", s: totalRowStyle("right", '"S/ "#,##0.00') },
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges para cabecera
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: NUM_COLS - 1 } },
  ];

  // Anchos de columna
  ws["!cols"] = [
    { wch: 16 }, // Cód. Cajero
    { wch: 36 }, // Nombre Cajero
    { wch: 18 }, // N° Operaciones
    { wch: 22 }, // Importe Pagado
  ];

  // Alturas de filas clave
  ws["!rows"] = [
    { hpt: 18 }, // 1. Subtítulo institucional
    { hpt: 28 }, // 2. Título principal
    { hpt: 22 }, // 3. Barra de filtros
    { hpt: 8 },  // 4. Espacio
    { hpt: 26 }, // 5. Encabezado de columnas
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ingresos por Cajero");

  const filename = `Ingresos_Cajero_${desde}_al_${hasta}.xlsx`;
  XLSX.writeFile(wb, filename);
}
