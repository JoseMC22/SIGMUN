"use client";

import { useCallback } from "react";
import { searchConstanciaExigibilidadAction } from "@/actions/notificaciones/reporte-constancia-exigibilidad";
import type {
  ConstanciaExigibilidadRow,
  ConstanciaExigibilidadFilters,
} from "@/actions/notificaciones/reporte-constancia-exigibilidad";

/**
 * Obtiene los encabezados del reporte a partir de las claves del primer
 * registro (las columnas del SP son dinámicas/definidas en base de datos).
 */
function deriveHeaders(rows: ConstanciaExigibilidadRow[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}

// ── Columnas que llevan fecha con hora formateada ──

const DATE_TIME_COLS = new Set([
  "fec_gen",
  "f_notifica",
]);

// ── Formatea una fecha a dd/mm/yyyy hh:mm:ss ──

function formatDateTime(raw: string | number | null): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const str = String(raw).trim();
  const date = new Date(str.replace("T", " "));
  if (Number.isNaN(date.getTime())) return str;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// ── Aplica el formateo de fechas a una fila según sus encabezados ──

function formatRow(row: ConstanciaExigibilidadRow, headers: string[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const h of headers) {
    const v = row[h] ?? null;
    out[h] = DATE_TIME_COLS.has(h.toLowerCase()) ? formatDateTime(v) : String(v);
  }
  return out;
}

interface UseConstanciaExigibilidadExportArgs {
  filters: ConstanciaExigibilidadFilters;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Hook de exportación para el "Reporte de Constancia de Exigibilidad".
 * Excel/PDF se generan pidiendo todos los registros con los filtros actuales.
 */
export function useConstanciaExigibilidadExport({
  filters,
  setExporting,
  setError,
}: UseConstanciaExigibilidadExportArgs) {
  const fetchAllRecords = useCallback(async (): Promise<ConstanciaExigibilidadRow[]> => {
    const result = await searchConstanciaExigibilidadAction(filters);
    if (result.success) return result.data;
    throw new Error(result.error);
  }, [filters]);

  const exportToExcel = useCallback(async () => {
    setExporting(true);
    try {
      const allData = await fetchAllRecords();
      if (allData.length === 0) {
        setError("No hay registros para exportar");
        return;
      }
      const XLSX = await import("xlsx");
      const headers = deriveHeaders(allData);
      const ws = XLSX.utils.json_to_sheet(
        allData.map((r) => formatRow(r, headers)),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Constancia Exigibilidad");
      XLSX.writeFile(wb, "reporte-constancia-exigibilidad.xlsx");
    } catch {
      setError("Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  const exportToPdf = useCallback(async () => {
    setExporting(true);
    try {
      const allData = await fetchAllRecords();
      if (allData.length === 0) {
        setError("No hay registros para exportar");
        return;
      }
      const headers = deriveHeaders(allData);
      const body = allData.map((r) => {
        const formatted = formatRow(r, headers);
        return headers.map((h) => String(formatted[h] ?? ""));
      });
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", format: "a3" });
      doc.text("Reporte de Constancia de Exigibilidad", 14, 10);
      autoTable(doc, {
        startY: 16,
        head: [headers],
        body,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [30, 48, 80] },
      });
      doc.save("reporte-constancia-exigibilidad.pdf");
    } catch {
      setError("Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  return { exportToExcel, exportToPdf };
}
