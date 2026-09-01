"use client";

import { useCallback } from "react";
import { searchReporteCargosAction } from "@/actions/notificaciones/reporte-cargos";
import type {
  ReporteCargosRow,
  ReporteCargosFilters,
} from "@/actions/notificaciones/reporte-cargos";

/**
 * Obtiene los encabezados del reporte a partir de las claves del primer
 * registro (las columnas del SP son dinámicas/definidas en base de datos).
 */
function deriveHeaders(rows: ReporteCargosRow[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}

interface UseReporteCargosExportArgs {
  filters: ReporteCargosFilters;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Hook de exportación para el "Reporte de Cargos".
 * Excel/PDF se generan pidiendo todos los registros con los filtros actuales.
 */
export function useReporteCargosExport({
  filters,
  setExporting,
  setError,
}: UseReporteCargosExportArgs) {
  const fetchAllRecords = useCallback(async (): Promise<ReporteCargosRow[]> => {
    const result = await searchReporteCargosAction(filters);
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
      const ws = XLSX.utils.json_to_sheet(allData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte Cargos");
      XLSX.writeFile(wb, "reporte-cargos.xlsx");
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
      const body = allData.map((r) => headers.map((h) => String(r[h] ?? "")));
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", format: "a3" });
      doc.text("Reporte de Cargos", 14, 10);
      autoTable(doc, {
        startY: 16,
        head: [headers],
        body,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [30, 48, 80] },
      });
      doc.save("reporte-cargos.pdf");
    } catch {
      setError("Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  return { exportToExcel, exportToPdf };
}
