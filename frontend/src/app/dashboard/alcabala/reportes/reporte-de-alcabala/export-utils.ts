"use client";

import { useCallback } from "react";
import { searchDeAlcabalaAction } from "@/actions/alcabala/reporte-de-alcabala";
import type { DjAlcabalaRow } from "@/actions/alcabala/reporte-de-alcabala";

/** Formatea un número como decimal con 2 fracciones (es-PE). */
export function formatNumber(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface UseDeAlcabalaExportArgs {
  filters: {
    codigo: string;
    anio: string;
    estado: string;
  };
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Hook de exportación para el reporte "De Alcabala".
 * Extraído de la página para mantener la lógica de Excel/PDF aislada.
 */
export function useDeAlcabalaExport({
  filters,
  setExporting,
  setError,
}: UseDeAlcabalaExportArgs) {
  const fetchAllRecords = useCallback(async (): Promise<DjAlcabalaRow[]> => {
    const result = await searchDeAlcabalaAction(
      {
        codigo: filters.codigo || undefined,
        anio: filters.anio ? Number(filters.anio) : undefined,
        estado: filters.estado ?? undefined,
      },
      1,
      99999,
    );
    if (result.success) return result.data;
    throw new Error(result.error);
  }, [filters]);

  const exportToExcel = useCallback(async () => {
    setExporting(true);
    try {
      const allData = await fetchAllRecords();
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        allData.map((r) => ({
          "Cód. Compra": r.codigo_compra,
          "Comprador": r.comprador,
          "Comprador Fiscal": r.comprador_fiscal,
          "Comprador DNI": r.comprador_dni,
          "Cód. Venta": r.codigo_venta,
          "Vendedor": r.vendedor,
          "Vendedor Fiscal": r.vendedor_fiscal,
          "Vendedor DNI": r.vendedor_dni,
          "Contrato": r.contrato,
          "Dirección Predio": r.direccion_predio,
          "F. Contrato": r.fecha_contrato,
          "Base Imponible": r.base_imponible,
          "Transferencia": r.transferencia,
          "Autoavaluo": r.autoavaluo,
          "Monto Inafecto": r.monto_inafecto,
          "Monto Afecto": r.monto_afecto,
          "Mora": r.mora,
          "Monto Alcabala": r.monto_alcabala,
          "Total Alcabala": r.total_alcabala,
          "Observación": r.observacion,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "De Alcabala");
      XLSX.writeFile(wb, "reporte-de-alcabala.xlsx");
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
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", format: "a3" });
      doc.text("Reporte De Alcabala", 14, 10);
      autoTable(doc, {
        startY: 16,
        head: [[
          "Cód.Compra", "Comprador", "Compr.Fiscal", "Compr.DNI", "Cód.Venta",
          "Vendedor", "Vend.Fiscal", "Vend.DNI", "Contrato", "Dirección", "F.Contrato",
          "B.Imp.", "Transfer.", "Autoavaluo", "Inafecto",
          "Afecto", "Mora", "M.Alcabala", "T.Alcabala",
          "Obs.",
        ]],
        body: allData.map((r) => [
          r.codigo_compra,
          r.comprador,
          r.comprador_fiscal,
          r.comprador_dni,
          r.codigo_venta,
          r.vendedor,
          r.vendedor_fiscal,
          r.vendedor_dni,
          r.contrato,
          r.direccion_predio,
          r.fecha_contrato,
          formatNumber(r.base_imponible),
          formatNumber(r.transferencia),
          formatNumber(r.autoavaluo),
          formatNumber(r.monto_inafecto),
          formatNumber(r.monto_afecto),
          formatNumber(r.mora),
          formatNumber(r.monto_alcabala),
          formatNumber(r.total_alcabala),
          r.observacion,
        ]),
        styles: { fontSize: 6 },
        headStyles: { fillColor: [30, 48, 80] },
      });
      doc.save("reporte-de-alcabala.pdf");
    } catch {
      setError("Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  return { exportToExcel, exportToPdf };
}
