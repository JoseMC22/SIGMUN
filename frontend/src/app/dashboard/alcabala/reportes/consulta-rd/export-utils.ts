"use client";

import { useCallback } from "react";
import { searchConsultaRDAction } from "@/actions/alcabala/consulta-rd";
import type { ConsultaRDRow } from "@/actions/alcabala/consulta-rd";

/** Formatea código a 7 dígitos con ceros a la izquierda. */
export function formatCodigo(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.padStart(7, "0");
}

interface UseConsultaRdExportArgs {
  filters: {
    codigo: string;
    contribuyente: string;
    estado: string;
  };
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
}

/**
 * Hook de exportación para la "Consulta RD".
 * Extraído de la página para mantener la lógica de Excel/PDF aislada.
 */
export function useConsultaRdExport({
  filters,
  setExporting,
  setError,
}: UseConsultaRdExportArgs) {
  const fetchAllRecords = useCallback(async (): Promise<ConsultaRDRow[]> => {
    const result = await searchConsultaRDAction(
      {
        codigo: filters.codigo ? formatCodigo(filters.codigo) : undefined,
        contribuyente: filters.contribuyente || undefined,
        estado: filters.estado || undefined,
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
          "#": r.ROW,
          Código: r.codigo,
          Nombre: r.nombre,
          RD: `${r.nomb_val} ${r.num_val}-${r.ano_val}`,
          "Monto S/.": r.MontoTotal,
          "Fec. Emisión": r.fec_val,
          Estado: r.estado,
          "F. Pago": r.fpago,
          Recibo: r.recibo,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consulta RD");
      XLSX.writeFile(wb, `consulta-rd-alcabala.xlsx`);
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
      const doc = new jsPDF({ orientation: "landscape" });
      doc.text("Consulta RD - Alcabala", 14, 10);
      autoTable(doc, {
        startY: 16,
        head: [
          [
            "#",
            "Código",
            "Nombre",
            "RD",
            "Monto S/.",
            "Fec. Emisión",
            "Estado",
            "F. Pago",
            "Recibo",
          ],
        ],
        body: allData.map((r) => [
          String(r.ROW),
          r.codigo,
          r.nombre,
          `${r.nomb_val} ${r.num_val}-${r.ano_val}`,
          String(r.MontoTotal.toFixed(2)),
          r.fec_val,
          r.estado,
          r.fpago,
          r.recibo,
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 48, 80] },
      });
      doc.save("consulta-rd-alcabala.pdf");
    } catch {
      setError("Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [fetchAllRecords]);

  return { exportToExcel, exportToPdf };
}
