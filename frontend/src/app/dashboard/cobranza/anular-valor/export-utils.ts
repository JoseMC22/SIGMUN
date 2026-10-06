"use client";

import { useCallback, useRef } from "react";
import { searchAnularValorAction } from "@/actions/cobranza/anular-valor";
import type { AnularValorRow } from "@/actions/cobranza/anular-valor";

interface UseAnularValorExportArgs {
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Columnas del Excel. Deben coincidir 1:1 con los <th> y los <td> de la grilla.
 * Espejo de maestro-contribuyentes (16 columnas).
 */
const WS_COLUMNS: { header: string; key: string }[] = [
  { header: "Código", key: "codigo" },
  { header: "Nombre", key: "nombre" },
  { header: "Dirección", key: "direccion" },
  { header: "Junta", key: "junta" },
  { header: "DNI", key: "dni" },
  { header: "Correo", key: "correo" },
  { header: "Id Vía", key: "idVia" },
  { header: "Teléfono", key: "telefono1" },
  { header: "Base Imponible", key: "baseImponible" },
  { header: "Inafecto", key: "inafecto" },
  { header: "Categoría", key: "categoria" },
  { header: "Gestor", key: "gestor" },
  { header: "Imp. Anual", key: "impAnual" },
  { header: "Imp. Trime.", key: "impTrime" },
  { header: "Costo Emi.", key: "costoEmi" },
  { header: "Imp. Total", key: "impTotal" },
];

const MONTOS = new Set([
  "baseImponible",
  "inafecto",
  "impAnual",
  "impTrime",
  "costoEmi",
  "impTotal",
]);

/** Los montos llegan como number; en el Excel van con 2 decimales. */
function valorCelda(key: string, valor: string | number | null | undefined) {
  const v = valor ?? "";
  if (MONTOS.has(key) && v !== "" && !Number.isNaN(Number(v))) {
    return Number(v).toFixed(2);
  }
  return v;
}

/**
 * Hook de exportación del listado (fase 1).
 * Pide todos los registros (pageSize 100000) sin filtros.
 */
export function useAnularValorExport({
  setExporting,
  setError,
}: UseAnularValorExportArgs) {
  const exportSeq = useRef(0);

  const fetchAllRecords = useCallback(async (): Promise<
    AnularValorRow[]
  > => {
    const result = await searchAnularValorAction(1, 100000);
    if (result.success) return result.data;
    throw new Error(result.error ?? "Error al exportar Excel");
  }, []);

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
      XLSX.utils.book_append_sheet(wb, ws, "Contribuyentes");
      XLSX.writeFile(wb, "anular-valor-contribuyentes.xlsx");
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
