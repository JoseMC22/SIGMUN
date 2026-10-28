import type { ReporteDeudaUsoRow } from "@/actions/administracion-tributaria/reporte-deuda-uso";

interface ExportExcelOptions {
  data: ReporteDeudaUsoRow[];
  anno: string;
  usoNombre: string;
  tipoLabel?: string;
}

/**
 * Genera y descarga el archivo Excel estilizado para el Reporte de Deuda por Uso.
 */
export async function exportReporteDeudaUsoExcel({
  data,
  anno,
  usoNombre,
  tipoLabel,
}: ExportExcelOptions): Promise<void> {
  const XLSX = await import("xlsx-js-style");

  const wb = XLSX.utils.book_new();

  // Tokens de diseño y colores institucionales
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

  // Totales acumulados
  let sumAreaTerreno = 0;
  let sumAreaConstruccion = 0;
  let sumDeudaIp = 0;
  let sumDeudaArb = 0;

  // Filas del archivo Excel (Array of Arrays)
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

  // 2. Título principal del reporte
  rows.push([
    {
      v: "REPORTE DE DEUDA POR USO DE PREDIO",
      t: "s",
      s: {
        fill: { fgColor: { rgb: NAVY } },
        font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    },
  ]);

  // 3. Barra de metadatos (Filtros aplicados y fecha)
  const tipoMeta = tipoLabel ? `    |    Tipo: ${tipoLabel.toUpperCase()}` : "";
  rows.push([
    {
      v: `Año Fiscal: ${anno}    |    Uso del Predio: ${(usoNombre || "TODOS").toUpperCase()}${tipoMeta}    |    Emisión: ${fechaStr} ${horaStr}    |    Total Registros: ${data.length}`,
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
    { title: "N°", align: "center" },
    { title: "Código", align: "center" },
    { title: "Contribuyente / Razón Social", align: "left" },
    { title: "Año", align: "center" },
    { title: "Cód. Predio", align: "center" },
    { title: "Anexo", align: "center" },
    { title: "Sub Anexo", align: "center" },
    { title: "Uso del Predio", align: "left" },
    { title: "Dirección", align: "left" },
    { title: "Área Terreno (m²)", align: "right" },
    { title: "Área Const. (m²)", align: "right" },
    { title: "Sector", align: "center" },
    { title: "Deuda IP (S/)", align: "right" },
    { title: "Deuda Arbitrio (S/)", align: "right" },
    { title: "Total Deuda (S/)", align: "right" },
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

    const areaTerreno = parseFloat(r.area_terreno) || 0;
    const areaConst = parseFloat(r.area_construccion) || 0;
    const deudaIp = parseFloat(r.insoluto_ip) || 0;
    const deudaArb = parseFloat(r.insoluto_arb) || 0;
    const totalDeuda = deudaIp + deudaArb;

    sumAreaTerreno += areaTerreno;
    sumAreaConstruccion += areaConst;
    sumDeudaIp += deudaIp;
    sumDeudaArb += deudaArb;

    const rowStyle = (align: "left" | "center" | "right", numFmt?: string) => ({
      fill: { fgColor: { rgb: rowBg } },
      font: { name: "Segoe UI", sz: 9.5, color: { rgb: "1E293B" } },
      alignment: { horizontal: align, vertical: "center" },
      border: thinBorder,
      ...(numFmt ? { numFmt } : {}),
    });

    rows.push([
      { v: idx + 1, t: "n", s: rowStyle("center") },
      { v: r.codigo, t: "s", s: rowStyle("center") },
      { v: r.nombre, t: "s", s: rowStyle("left") },
      { v: r.anno, t: "s", s: rowStyle("center") },
      { v: r.cod_pred, t: "s", s: rowStyle("center") },
      { v: r.anexo, t: "s", s: rowStyle("center") },
      { v: r.sub_anexo, t: "s", s: rowStyle("center") },
      { v: r.uso_predio, t: "s", s: rowStyle("left") },
      { v: r.direccion, t: "s", s: rowStyle("left") },
      { v: areaTerreno, t: "n", s: rowStyle("right", "#,##0.00") },
      { v: areaConst, t: "n", s: rowStyle("right", "#,##0.00") },
      { v: r.sector, t: "s", s: rowStyle("center") },
      { v: deudaIp, t: "n", s: rowStyle("right", '"S/ "#,##0.00') },
      { v: deudaArb, t: "n", s: rowStyle("right", '"S/ "#,##0.00') },
      { v: totalDeuda, t: "n", s: rowStyle("right", '"S/ "#,##0.00') },
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

  const totalCols = [
    { v: `TOTAL GENERAL (${data.length} REGISTROS)`, t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: sumAreaTerreno, t: "n", s: totalRowStyle("right", "#,##0.00") },
    { v: sumAreaConstruccion, t: "n", s: totalRowStyle("right", "#,##0.00") },
    { v: "", t: "s", s: totalRowStyle("center") },
    { v: sumDeudaIp, t: "n", s: totalRowStyle("right", '"S/ "#,##0.00') },
    { v: sumDeudaArb, t: "n", s: totalRowStyle("right", '"S/ "#,##0.00') },
    { v: sumDeudaIp + sumDeudaArb, t: "n", s: totalRowStyle("right", '"S/ "#,##0.00') },
  ];
  rows.push(totalCols);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Rangos combinados (merges)
  const totalColsCount = headerCols.length;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalColsCount - 1 } },
    // Combinar etiqueta de total de columna 0 a 8
    { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 8 } },
  ];

  // Anchos de columnas
  ws["!cols"] = [
    { wch: 6 },  // N°
    { wch: 14 }, // Código
    { wch: 38 }, // Contribuyente
    { wch: 8 },  // Año
    { wch: 14 }, // Cód. Predio
    { wch: 8 },  // Anexo
    { wch: 10 }, // Sub Anexo
    { wch: 25 }, // Uso
    { wch: 42 }, // Dirección
    { wch: 16 }, // Área Terreno
    { wch: 16 }, // Área Construcción
    { wch: 10 }, // Sector
    { wch: 16 }, // Deuda IP
    { wch: 18 }, // Deuda Arbitrio
    { wch: 18 }, // Total Deuda
  ];

  // Alturas de filas clave
  ws["!rows"] = [
    { hpt: 18 }, // 1. Subtítulo institucional
    { hpt: 28 }, // 2. Título principal
    { hpt: 22 }, // 3. Barra de filtros/metadatos
    { hpt: 8 },  // 4. Espacio
    { hpt: 26 }, // 5. Encabezado de columnas
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Deuda por Uso");

  const cleanUso = (usoNombre || "TODOS").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Reporte_Deuda_X_Uso_${anno}_${cleanUso}_${fechaStr.replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
