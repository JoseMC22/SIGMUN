"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  Loader2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  History,
} from "lucide-react";
import {
  getBajasPredioAction,
  getReporteDescargoAction,
  type VerBajaPredioItem,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { obtenerPlantillaReporteDescargoAction } from "@/actions/administracion-tributaria/reporte-descargo";
import {
  construirHtmlReporteDescargo,
  construirConfigPdfDescargo,
} from "./reportes/Descargo/reporte-descargo";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import HistorialBajaPredioModal from "./historial-baja-predio-modal";
import type { ReportePdfConfig } from "@/lib/reportes/reporte-service";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

// Legacy frmbajapredio (mantbajapre/consulta + mostrardatos): fieldset
// "Predios de Baja:" with an Export Excel button on top and a paged grid
// (ExtJS store pageSize 10). Rows come from Rentas.sp_Verbaja @busc=5.

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigoContribuyente: string;
}

const PAGE_SIZE = 10;

export default function VerBajaPredioModal({ isOpen, onClose, codigoContribuyente }: Props) {
  const [rows, setRows] = useState<VerBajaPredioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Reporte Descargo viewer state (replaces legacy window.open of the
  // Jasper report server).
  const [reporteOpen, setReporteOpen] = useState(false);
  const [reporteHtml, setReporteHtml] = useState("");
  const [reportePdfConfig, setReportePdfConfig] = useState<ReportePdfConfig | null>(null);
  const [reporteRowKey, setReporteRowKey] = useState<string | null>(null);
  const [historialRow, setHistorialRow] = useState<VerBajaPredioItem | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  // Register in the modal stack: ESC closes ONLY the topmost modal,
  // never the parent detalle modal underneath (project convention).
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  // Escape closes this modal only when it is the top of the stack.
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, topModal, onClose]);

  // Fetch the "Predios de Baja" list. Extracted so the historial modal can
  // trigger a refetch after a restore (onRestored).
  const reloadBajas = async () => {
    setLoading(true);
    setError(null);
    const res = await getBajasPredioAction(codigoContribuyente);
    if (res.success) setRows(res.data);
    else setError(res.error);
    setLoading(false);
  };

  // Load rows on open; reset state on open/close.
  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setError(null);
      setPage(1);
      return;
    }
    rootRef.current?.focus();

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setRows([]);
      setPage(1);
      const res = await getBajasPredioAction(codigoContribuyente);
      if (cancelled) return;
      if (res.success) setRows(res.data);
      else setError(res.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, codigoContribuyente]);

  if (!isOpen) return null;

  // Client-side pagination (legacy Ext pagingbar, pageSize 10).
  const totalPages = rows.length > 0 ? Math.ceil(rows.length / PAGE_SIZE) : 0;
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reporte Descargo: loads the SP data and the HTML template, builds the
  // filled report and opens the generic viewer modal.
  const handleReporte = async (row: VerBajaPredioItem, rowKey: string) => {
    setReporteRowKey(rowKey);
    const [datos, plantilla] = await Promise.all([
      getReporteDescargoAction({
        codigo: row.codigo,
        anno: row.anno,
        cod_pred: row.cod_pred,
        anexo: row.anexo,
        sub_anexo: row.sub_anexo,
        dj_predial: row.dj_predial,
      }),
      obtenerPlantillaReporteDescargoAction(),
    ]);
    setReporteRowKey(null);
    if (!datos.success) {
      setError(datos.error ?? "No se encontraron datos del descargo.");
      return;
    }
    if (!plantilla.success) {
      setError(plantilla.error ?? "No se pudo cargar la plantilla del reporte.");
      return;
    }
    setReporteHtml(construirHtmlReporteDescargo(datos.data, plantilla.data));
    setReportePdfConfig(construirConfigPdfDescargo(datos.data));
    setReporteOpen(true);
  };

  // Replaces the legacy pseudo-Excel grid dump. Exports the FULL loaded
  // rows (not just the current page). Codes keep leading zeros, so every
  // value is written as a string cell.
  const handleExportExcel = () => {
    const aoa: string[][] = [
      ["N°", "CODIGO", "AÑO", "COD. PREDIO", "ANEXO", "SUB ANEXO", "DIRECCION", "FECHA DE DESCARGO"],
      ...rows.map((row, idx) => [
        String(idx + 1),
        row.codigo,
        row.anno,
        row.cod_pred,
        row.anexo,
        row.sub_anexo,
        row.direccion,
        row.fechdescargo,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Baja de Predios");
    XLSX.writeFile(wb, `bajapredios_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      tabIndex={-1}
    >
      <div className="relative flex max-h-[80vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Ver Baja Predio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-3 space-y-3">
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
            <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
              <ClipboardList size={13} />
              Predios de Baja:
            </legend>

            {/* Export button (legacy top toolbar button) */}
            <div className="flex justify-end pb-1.5">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={loading || rows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Exportar a Excel"
              >
                <FileSpreadsheet size={13} />
                Exportar a Excel
              </button>
            </div>

            {/* ── Grid ── */}
            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="w-10 px-2 py-1.5 text-center">N°</th>
                    <th className="px-2.5 py-1.5">Código</th>
                    <th className="px-2.5 py-1.5">Año</th>
                    <th className="px-2.5 py-1.5">Codigo Pred</th>
                    <th className="px-2.5 py-1.5">Anexo</th>
                    <th className="px-2.5 py-1.5">SubAnexo</th>
                    <th className="px-2.5 py-1.5">Dirección</th>
                    <th className="px-2.5 py-1.5">Fecha Descargo</th>
                    <th className="px-2.5 py-1.5">Fecha Declaración</th>
                    <th className="px-2.5 py-1.5 text-center">Reporte</th>
                    <th className="px-2.5 py-1.5 text-center">Historial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                        <Loader2 size={16} className="mx-auto mb-1 animate-spin text-sat-cyan" />
                        Cargando...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-red-500 text-[11px]">
                        {error}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-[11px]">
                        No se encontraron predios dados de baja
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, idx) => {
                      const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                      const rowKey = `${row.codigo}-${row.anno}-${row.cod_pred}-${row.anexo}-${idx}`;
                      return (
                        <tr
                          key={rowKey}
                          className="transition hover:bg-sat-cyan/5"
                        >
                          <td className="px-2 py-1.5 text-center text-slate-500">{rowNum}</td>
                          <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-600">{row.codigo}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.anno}</td>
                          <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-600">{row.cod_pred}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.anexo}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.sub_anexo}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.direccion}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.fechdescargo}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.fech_declaracion}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleReporte(row, rowKey)}
                              disabled={reporteRowKey !== null}
                              className="rounded-md bg-sat-cyan/10 p-1 text-sat-cyan transition hover:bg-sat-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Reporte Baja Predio"
                              aria-label={`Reporte baja predio fila ${rowNum}`}
                            >
                              {reporteRowKey === rowKey ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Printer size={13} />
                              )}
                            </button>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => setHistorialRow(row)}
                              className="rounded-md bg-sat-cyan/10 p-1 text-sat-cyan transition hover:bg-sat-cyan/20"
                              title="Historial Baja Predio"
                              aria-label={`Historial baja predio fila ${rowNum}`}
                            >
                              <History size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Paginador ── */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                <span>
                  Mostrando {pagedRows.length} de {rows.length} registros
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                  <span className="px-2 font-medium text-slate-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Siguiente"
                  >
                    Siguiente
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </fieldset>
        </div>
      </div>

      {/* ── Visor del Reporte Descargo ── */}
      <ReporteViewerModal
        isOpen={reporteOpen}
        onClose={() => setReporteOpen(false)}
        html={reporteHtml}
        pdfConfig={reportePdfConfig}
      />

      {/* ── Historial Baja Predio ── */}
      <HistorialBajaPredioModal
        isOpen={historialRow !== null}
        onClose={() => setHistorialRow(null)}
        cabecera={
          historialRow
            ? {
                codigo: historialRow.codigo,
                codPred: historialRow.cod_pred,
                anno: historialRow.anno,
                anexo: historialRow.anexo,
                subAnexo: historialRow.sub_anexo,
                codhistorial: historialRow.codhistorial,
              }
            : null
        }
        onRestored={() => {
          void reloadBajas();
        }}
      />
    </div>
  );
}
