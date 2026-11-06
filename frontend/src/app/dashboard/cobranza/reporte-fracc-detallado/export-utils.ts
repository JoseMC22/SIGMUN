"use client";

import { useCallback, useRef } from "react";
import { searchFraccDetalladoAction } from "@/actions/cobranza/reporte-fracc-detallado";
import type {
  FraccDetalladoRow,
  FraccDetalladoFilters,
} from "@/actions/cobranza/reporte-fracc-detallado";

interface UseFraccDetalladoExportArgs {
  filters: FraccDetalladoFilters;
  /** Título del reporte (R6): el mismo que muestra la página. */
  titulo: string;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Columnas del Excel. Deben coincidir 1:1 con COLUMNAS del page (mismos
 * headers, mismos keys y mismo orden): el repo ya sufrió dos veces por una
 * desincronización de ese conteo, así que el espejo está assertado por test
 * (export-utils.test.ts).
 *
 * T_INSOL_CONVENIO y ANIO_SALDO quedan fuera a propósito (Decisión 1 del
 * design): no las muestra el legado y T_INSOL_CONVENIO tiene semántica
 * ambigua frente a IMP_INSOL.
 */
export const WS_COLUMNS: { header: string; key: string }[] = [
  { header: "CODIGO", key: "CODIGO" },
  { header: "NOMBRE", key: "nombre" },
  { header: "ANIO_CTA", key: "ANIO_CTA" },
  { header: "CONVENIO", key: "CONVENIO" },
  { header: "FECHA CONVENIO", key: "FECHA" },
  { header: "DESCRIPCION", key: "descrip" },
  { header: "INSOLUTO", key: "IMP_INSOL" },
  { header: "# CUOTAS TOTAL", key: "NUM_CUOTAS" },
  { header: "# CUOTAS PENDIENTES", key: "CUOTAS_PENDIENTES" },
  { header: "SALDO", key: "SALDO" },
];

const MONTOS = new Set(["IMP_INSOL", "SALDO"]);

/** Los montos llegan como number desde el SP; en el Excel van con 2 decimales. */
function valorCelda(key: string, valor: string | number | null | undefined) {
  const v = valor ?? "";
  if (MONTOS.has(key) && v !== "" && !Number.isNaN(Number(v))) {
    return Number(v).toFixed(2);
  }
  return v;
}

/**
 * Título del reporte (R6): `LISTADO DE FRACCIONAMIENTOS <mes> - <año>`.
 * Se deriva de los filtros, no de las filas, así que funciona con 0
 * resultados y corrige el bug del legado que exportaba el año vacío. El
 * mismo string se muestra en pantalla y se escribe en la fila 1 del Excel.
 */
export function buildTituloFraccDetallado(mes: string, anno: string): string {
  return `LISTADO DE FRACCIONAMIENTOS ${mes.toUpperCase()} - ${anno}`;
}

/**
 * Hook de exportación para el reporte de fraccionamientos detallados.
 * El Excel se genera pidiendo todos los registros del filtro (pageSize
 * 100000 = modo exportación), no solo la página que está viendo el usuario.
 */
export function useFraccDetalladoExport({
  filters,
  titulo,
  setExporting,
  setError,
}: UseFraccDetalladoExportArgs) {
  const exportSeq = useRef(0);

  const fetchAllRecords = useCallback(async (): Promise<
    FraccDetalladoRow[]
  > => {
    const result = await searchFraccDetalladoAction(filters, 1, 100000);
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
      // Fila 1: título del reporte (R6). Fila 2: headers de WS_COLUMNS.
      // Fila 3+: datos, con los montos a 2 decimales.
      const hoja: (string | number)[][] = [
        [titulo],
        WS_COLUMNS.map((col) => col.header),
        ...allData.map((fila) =>
          WS_COLUMNS.map((col) => valorCelda(col.key, fila[col.key])),
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(hoja);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fraccionamientos");
      XLSX.writeFile(wb, "reporte-fracc-detallado.xlsx");
    } catch {
      if (token === exportSeq.current) {
        setError("Error al exportar Excel");
      }
    } finally {
      if (token === exportSeq.current) {
        setExporting(false);
      }
    }
  }, [fetchAllRecords, setError, setExporting, titulo]);

  return { exportToExcel };
}
