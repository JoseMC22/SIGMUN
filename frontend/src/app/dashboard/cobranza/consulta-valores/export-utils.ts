"use client";

import { useCallback, useRef } from "react";
import { searchConsultaValoresAction } from "@/actions/cobranza/consulta-valores";
import type {
  ConsultaValoresRow,
  ConsultaValoresFilters,
} from "@/actions/cobranza/consulta-valores";

interface UseConsultaValoresExportArgs {
  filters: ConsultaValoresFilters;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Columnas del Excel. Deben coincidir 1:1 con los <th> y los <td> de la grilla:
 * el repo ya sufrió por desincronizar ese conteo.
 *
 * ROW y nestado quedan fuera a propósito: ROW es artefacto de paginación del SP
 * y nestado vale 1 en todas las filas (el SP filtra V.nestado=1 fijo).
 */
const WS_COLUMNS: { header: string; key: string }[] = [
  { header: "Código", key: "codigo" },
  { header: "Nombre", key: "nombre" },
  { header: "Tipo Valor", key: "nomb_val" },
  { header: "Nro Valor", key: "num_val" },
  { header: "Año", key: "ano_val" },
  { header: "Monto Total", key: "MontoTotal" },
  { header: "F. Valor", key: "fec_val" },
  { header: "Id Valor", key: "id_valor" },
  { header: "Nro Exp.", key: "num_exp" },
  { header: "Año Exp.", key: "ano_exp" },
  { header: "F. Vence", key: "fec_vence" },
  { header: "Observación", key: "observacion" },
];

/** MontoTotal llega como number desde el SP; en el Excel va con 2 decimales. */
function valorCelda(key: string, valor: string | number | null | undefined) {
  const v = valor ?? "";
  if (key === "MontoTotal" && v !== "" && !Number.isNaN(Number(v))) {
    return Number(v).toFixed(2);
  }
  return v;
}

/**
 * Hook de exportación para la consulta de valores.
 * Excel se genera pidiendo todos los registros (pageSize 100000, que el backend
 * traduce a inicio=0/final=0 sin límite) con el criterio actual, no solo la
 * página que está viendo el usuario.
 */
export function useConsultaValoresExport({
  filters,
  setExporting,
  setError,
}: UseConsultaValoresExportArgs) {
  const exportSeq = useRef(0);

  const fetchAllRecords = useCallback(async (): Promise<
    ConsultaValoresRow[]
  > => {
    const result = await searchConsultaValoresAction(filters, 1, 100000);
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
      XLSX.utils.book_append_sheet(wb, ws, "Valores");
      XLSX.writeFile(wb, "consulta-valores.xlsx");
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
