"use client";

import { useCallback, useRef } from "react";
import { searchConstanciaNoAdeudoAction } from "@/actions/cobranza/reporte-constancia-no-adeudo";
import type {
  ConstanciaNoAdeudoRow,
  ConstanciaNoAdeudoFilters,
} from "@/actions/cobranza/reporte-constancia-no-adeudo";

interface UseConstanciaNoAdeudoExportArgs {
  filters: ConstanciaNoAdeudoFilters;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Hook de exportación para el "Reporte de Constancia de No Adeudos".
 * Excel se genera pidiendo todos los registros con los filtros actuales.
 */
export function useConstanciaNoAdeudoExport({
  filters,
  setExporting,
  setError,
}: UseConstanciaNoAdeudoExportArgs) {
  const exportSeq = useRef(0);

  const fetchAllRecords = useCallback(async (): Promise<
    ConstanciaNoAdeudoRow[]
  > => {
    const result = await searchConstanciaNoAdeudoAction(
      filters,
      1,
      100000,
    );
    if (result.success) return result.data;
    throw new Error(result.error ?? "Error al exportar Excel");
  }, [filters]);

  const exportToExcel = useCallback(async () => {
    const token = ++exportSeq.current;
    setExporting(true);
    setError(null);
    try {
      const allData = await fetchAllRecords();
      if (allData.length === 0) {
        if (token === exportSeq.current) {
          setError("No hay registros para exportar");
        }
        return;
      }
      const XLSX = await import("xlsx");
      const wsData = allData.map((r) => ({
        "N° Const.": r["Numero"] ?? "",
        "Fecha": r["Fecha"] ?? "",
        "Código": r["codigo"] ?? "",
        "Nombre": r["Nombre"] ?? "",
        "Concepto": r["concepto"] ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Constancias No Adeudos");
      XLSX.writeFile(wb, "reporte-constancia-no-adeudo.xlsx");
    } catch {
      if (token === exportSeq.current) {
        setError("Error al exportar Excel");
      }
    } finally {
      if (token === exportSeq.current) {
        setExporting(false);
      }
    }
  }, [fetchAllRecords]);

  return { exportToExcel };
}
