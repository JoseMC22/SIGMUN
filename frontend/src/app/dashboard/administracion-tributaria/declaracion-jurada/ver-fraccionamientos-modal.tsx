"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Printer, Eye } from "lucide-react";
import {
  getListadoFraccionamientosAction,
  getReporteConvenioAction,
  type FraccionamientoRow,
  type ConvenioReporteData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { obtenerPlantillaReporteConvenioAction } from "@/actions/administracion-tributaria/reporte-convenio";
import {
  construirHtmlReporteConvenio,
  construirConfigPdfConvenio,
} from "./reportes/Convenio/reporte-convenio";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import DetalleConvenioModal from "./detalle-convenio-modal";
import ReporteFraccionamientosModal from "./reporte-fraccionamientos-modal";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigoContribuyente?: string;
  nombreContribuyente?: string;
}

export default function VerFraccionamientosModal({
  isOpen,
  onClose,
  codigoContribuyente,
  nombreContribuyente,
}: Props) {
  const [rows, setRows] = useState<FraccionamientoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Impresión del reporte del convenio (por fila)
  const [printingConvenio, setPrintingConvenio] = useState<string | null>(null);
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReturnType<
    typeof construirConfigPdfConvenio
  > | null>(null);
  // Detalle de convenio (legacy: fraccionar/resolfracc) por fila
  const [detalleConvenio, setDetalleConvenio] = useState<string | null>(null);
  // Reporte Tesorería (legacy: fraccionar/reportes — botón "Reporte")
  const [isReporteFraccOpen, setIsReporteFraccOpen] = useState(false);

  // Modal-foco: solo el modal en la cima de la pila responde al Escape.
  const modalId = useModalStack(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  // Carga al abrir; reset al cerrar (legacy: CargaListado al montar).
  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setError(null);
      setPrintingConvenio(null);
      setReporteHtml(null);
      setReportePdf(null);
      return;
    }
    const codigo = codigoContribuyente?.trim();
    if (!codigo) {
      setError("No hay un contribuyente seleccionado.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getListadoFraccionamientosAction(codigo)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(result.error);
          return;
        }
        setRows(result.data);
      })
      .catch(() => {
        if (!cancelled) setError("Error al listar los fraccionamientos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, codigoContribuyente]);

  // Imprime el reporte del convenio seleccionado (legacy: reporte(convenio)).
  const handleImprimir = useCallback(
    async (convenio: string) => {
      const codigo = codigoContribuyente?.trim();
      if (!codigo || printingConvenio) return;
      setError(null);
      setPrintingConvenio(convenio);
      try {
        const [reporte, plantilla] = await Promise.all([
          getReporteConvenioAction(codigo, convenio),
          obtenerPlantillaReporteConvenioAction(),
        ]);
        if (!reporte.success) {
          setError(reporte.error);
          return;
        }
        if (!plantilla.success) {
          setError(plantilla.error);
          return;
        }
        const data: ConvenioReporteData = reporte.data;
        setReporteHtml(construirHtmlReporteConvenio(data, plantilla.data));
        setReportePdf(construirConfigPdfConvenio(data));
      } catch {
        setError("Error al cargar el reporte del convenio.");
      } finally {
        setPrintingConvenio(null);
      }
    },
    [codigoContribuyente, printingConvenio],
  );

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <div>
              <h2 className="text-[12px] font-semibold text-slate-800">
                Fraccionamientos
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {nombreContribuyente ? `${nombreContribuyente} · ` : ""}
                {codigoContribuyente ? `Cód. ${codigoContribuyente}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Grid */}
          <div className="p-4">
            <div className="max-h-[360px] overflow-auto rounded border border-slate-200">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-slate-100">
                  <tr className="text-slate-700">
                    <th className="px-2 py-1.5 text-center font-semibold w-8">
                      N°
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold">
                      Convenio
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold">
                      Año
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold">
                      Cuotas
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold">
                      Monto
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold">
                      Estado
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold">
                      Usuario
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold">
                      Fecha
                    </th>
                    <th className="px-2 py-1.5 text-center font-semibold w-16">
                      {/* acciones */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        <Loader2
                          size={14}
                          className="mr-1.5 inline-block animate-spin align-middle"
                        />
                        Cargando fraccionamientos…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        El contribuyente no registra fraccionamientos.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr
                        key={`${r.convenio}-${idx}`}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-2 py-1 text-center text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1 text-slate-800">
                          {r.convenio}
                        </td>
                        <td className="px-2 py-1 text-slate-800">{r.anno}</td>
                        <td className="px-2 py-1 text-right text-slate-800">
                          {r.cuotas}
                        </td>
                        <td className="px-2 py-1 text-right text-slate-800">
                          {r.monto}
                        </td>
                        <td className="px-2 py-1 text-slate-800">{r.estado}</td>
                        <td className="px-2 py-1 text-slate-800">
                          {r.usuario}
                        </td>
                        <td className="px-2 py-1 text-slate-800">{r.fecha}</td>
                        <td className="px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => setDetalleConvenio(r.convenio)}
                            title="Detalle Convenio"
                            aria-label={`Ver detalle del convenio ${r.convenio}`}
                            className="rounded p-1 text-slate-500 transition hover:bg-slate-200 hover:text-sat-cyan"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleImprimir(r.convenio)}
                            disabled={printingConvenio !== null}
                            title="Reporte Convenio"
                            aria-label={`Imprimir convenio ${r.convenio}`}
                            className="rounded p-1 text-slate-500 transition hover:bg-slate-200 hover:text-sat-cyan disabled:opacity-40"
                          >
                            {printingConvenio === r.convenio ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Printer size={13} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
            <div className="min-w-0 flex-1">
              {error && <p className="text-[10px] text-red-600">{error}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                hidden
                onClick={() => setIsReporteFraccOpen(true)}
                title="Reporte de Tesorería — fraccionamientos emitidos por rango de fechas."
                className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reporte
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Reporte del Convenio (vista previa + PDF) ══ */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={() => {
          setReporteHtml(null);
          setReportePdf(null);
        }}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />

      {/* ══ Detalle de Convenio (legacy: fraccionar/resolfracc) ══ */}
      <DetalleConvenioModal
        isOpen={detalleConvenio !== null}
        onClose={() => setDetalleConvenio(null)}
        codigoContribuyente={codigoContribuyente}
        nombreContribuyente={nombreContribuyente}
        convenio={detalleConvenio ?? undefined}
      />

      {/* ══ Reporte Tesorería (legacy: fraccionar/reportes) ══ */}
      <ReporteFraccionamientosModal
        isOpen={isReporteFraccOpen}
        onClose={() => setIsReporteFraccOpen(false)}
      />
    </>
  );
}
