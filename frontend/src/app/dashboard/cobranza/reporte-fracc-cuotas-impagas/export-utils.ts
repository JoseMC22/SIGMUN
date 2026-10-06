"use client";

import { useCallback, useRef } from "react";
import { searchFraccCuotasImpagasAction } from "@/actions/cobranza/reporte-fracc-cuotas-impagas";
import type {
  FraccCuotasImpagasRow,
  FraccCuotasImpagasFilters,
} from "@/actions/cobranza/reporte-fracc-cuotas-impagas";

interface UseFraccCuotasImpagasExportArgs {
  filters: FraccCuotasImpagasFilters;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Columnas del Excel. Deben coincidir 1:1 con los <th> y los <td> de la grilla:
 * el repo ya sufrio dos veces por una desincronizacion de ese conteo.
 *
 * 'curren_date' queda fuera a proposito: la trae el SP pero es constante en todo
 * el resultado (fecha del datamart), asi que no informa nada de cada fraccionamiento.
 */
const WS_COLUMNS: { header: string; key: string }[] = [
  { header: "Código", key: "Codigo" },
  { header: "Nombre", key: "Nombre" },
  { header: "Dirección", key: "Direccion" },
  { header: "Año", key: "Año" },
  { header: "Convenio", key: "Convenio" },
  { header: "F. Convenio", key: "F.Convenio" },
  { header: "Deuda", key: "Deuda" },
  { header: "C. Inicial", key: "C.Inicial" },
  { header: "Cuotas", key: "Cuotas" },
  { header: "Pendientes", key: "Pendientes" },
  { header: "Vencidas", key: "Vencidas" },
  { header: "Ins. Vencido", key: "Ins Vencido" },
  { header: "Mora Ven.", key: "Mora Ven" },
  { header: "Estado", key: "estado_frac" },
];

const MONTOS = new Set(["Deuda", "C.Inicial", "Ins Vencido", "Mora Ven"]);

/** Los montos llegan como number desde el SP; en el Excel van con 2 decimales. */
function valorCelda(key: string, valor: string | number | null | undefined) {
  const v = valor ?? "";
  if (MONTOS.has(key) && v !== "" && !Number.isNaN(Number(v))) {
    return Number(v).toFixed(2);
  }
  return v;
}

/**
 * Hook de exportación para el reporte de cuotas impagadas.
 * Excel se genera pidiendo todos los registros (pageSize 100000) con los filtros
 * actuales, no solo la página que está viendo el usuario.
 */
export function useFraccCuotasImpagasExport({
  filters,
  setExporting,
  setError,
}: UseFraccCuotasImpagasExportArgs) {
  const exportSeq = useRef(0);

  const fetchAllRecords = useCallback(async (): Promise<
    FraccCuotasImpagasRow[]
  > => {
    const result = await searchFraccCuotasImpagasAction(filters, 1, 100000);
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
      const wsData = allData.map((r) => {
        const fila: Record<string, string | number> = {};
        for (const col of WS_COLUMNS) {
          fila[col.header] = valorCelda(col.key, r[col.key]);
        }
        return fila;
      });
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cuotas Impagadas");
      XLSX.writeFile(wb, "reporte-fracc-cuotas-impagas.xlsx");
    } catch {
      if (token === exportSeq.current) {
        setError("Error al exportar Excel");
      }
    } finally {
      if (token === exportSeq.current) {
        setExporting(false);
      }
    }
  }, [fetchAllRecords, setError, setExporting]);

  return { exportToExcel };
}