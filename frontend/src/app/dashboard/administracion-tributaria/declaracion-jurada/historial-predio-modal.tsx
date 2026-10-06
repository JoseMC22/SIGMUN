"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  FileText,
  History,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getHistorialPredioAction,
  getReportePredioAction,
  getSubreporteDocumentosAction,
  type HistorialPredioDataResult,
  type HistorialPredioItemData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import { construirHtmlReportePredio, construirConfigPdfPredio } from "./reportes/DeclaracionPredio/reporte-declaracion-predio";
import { obtenerPlantillaReportePredioAction } from "@/actions/administracion-tributaria/reporte-declaracion-predio";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigoContribuyente: string;
  anno: string;
  codPred: string;
  anexo: string;
  subAnexo: string;
}

const PAGE_SIZE = 10;

export default function HistorialPredioModal({
  isOpen,
  onClose,
  codigoContribuyente,
  anno,
  codPred,
  anexo,
  subAnexo,
}: Props) {
  const [data, setData] = useState<HistorialPredioDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reporteOpen, setReporteOpen] = useState(false);
  const [reporteHtml, setReporteHtml] = useState("");
  const [reportePdfConfig, setReportePdfConfig] = useState<any>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  useEffect(() => {
    if (!isOpen || !topModal) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, topModal, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setPage(1);
      return;
    }
    rootRef.current?.focus();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await getHistorialPredioAction(
        codigoContribuyente,
        anno,
        codPred,
        anexo,
        subAnexo,
      );
      if (cancelled) return;
      if (res.success) setData(res.data);
      else setError(res.error);
      setLoading(false);
      setPage(1);
    })();
    return () => { cancelled = true; };
  }, [isOpen, codigoContribuyente, anno, codPred, anexo, subAnexo, onClose]);

  if (!isOpen) return null;

  const rows = data?.rows ?? [];
  const totalPages = rows.length > 0 ? Math.ceil(rows.length / PAGE_SIZE) : 0;
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div
        ref={rootRef}
        tabIndex={-1}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      >
      <div className="relative flex max-h-[85vh] w-full max-w-[1100px] flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <History size={14} className="text-cyan-300" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Historial de Declaraciones Juradas — Predio
            </h2>
            <span className="ml-1 text-[10px] text-white/50">({codPred})</span>
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

        <div className="overflow-y-auto px-4 py-3 space-y-3">
          {/* Datos generales del predio (como legacy frmbajapredio) */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 pb-2 pt-0.5">
            <legend className="px-1 text-[10px] font-semibold text-sat-navy">
              Datos del Predio
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold">Código:</span>{" "}
                <span className="font-mono font-semibold text-slate-700">{data?.header?.codigo ?? codigoContribuyente}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Contribuyente:</span>{" "}
                <span className="text-slate-700 truncate">{data?.header?.nombre ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Cod. Predio:</span>{" "}
                <span className="font-mono text-slate-700">{codPred}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Anexo:</span>{" "}
                <span className="font-mono text-slate-700">{anexo} — {subAnexo}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Año:</span>{" "}
                <span className="font-bold text-slate-700">{anno}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Dirección:</span>{" "}
                <span className="text-slate-700">{data?.header?.direccion ?? "—"}</span>
              </div>
            </div>
          </fieldset>

          {/* Grid */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
            <legend className="text-[10px] font-semibold text-sat-navy">Historial</legend>
            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gradient-to-r from-sat-navy to-[#1e3050] text-left text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                    <th className="w-10 px-2 py-2 text-center">N°</th>
                    <th className="px-2 py-2">Año</th>
                    <th className="px-2 py-2">Motivo</th>
                    <th className="px-2 py-2">Condición Prop.</th>
                    <th className="px-2 py-2">Tipo Adqui.</th>
                    <th className="px-2 py-2">F. Adquis.</th>
                    <th className="px-2 py-2 text-right">Porc.</th>
                    <th className="px-2 py-2 text-right">Área</th>
                    <th className="px-2 py-2">Reg.</th>
                    <th className="px-2 py-2">Fisc.</th>
                    <th className="px-2 py-2 text-center">Reporte</th>
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
                  ) : pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-[11px]">
                        Sin registros de historial
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row: HistorialPredioItemData, idx: number) => {
                      const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr key={`${row.anno}-${row.dj_predial}-${idx}`} className="transition hover:bg-slate-50">
                          <td className="px-2 py-1.5 text-center text-slate-500">{rowNum}</td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-slate-700">{row.anno}</td>
                          <td className="px-2 py-1.5 text-[11px] text-slate-700 truncate">{row.motivo_declaracion}</td>
                          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.condicion_propiedad}</td>
                          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.tipo_adquisicion}</td>
                          <td className="px-2 py-1.5 text-[11px] text-slate-600">{row.fecha}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px] text-slate-700">{row.porc_propiedad}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px] text-slate-700">{row.area_terreno}</td>
                          <td className="px-2 py-1.5 text-center text-[11px] text-slate-600">{row.registrado}</td>
                          <td className="px-2 py-1.5 text-center text-[11px] text-slate-600">{row.fiscalizado}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                const plantillaRes = await obtenerPlantillaReportePredioAction();
                                if (!plantillaRes.success) { alert("Error plantilla: " + plantillaRes.error); return; }
                                const res = await getReportePredioAction(
                                  codigoContribuyente,
                                  anno,
                                  codPred,
                                  anexo,
                                  row.sub_anexo ?? "",
                                  row.dj_predial ?? "",
                                );
                                const docsRes = await getSubreporteDocumentosAction(
                                  codigoContribuyente,
                                  anno,
                                  codPred,
                                  anexo,
                                  row.sub_anexo ?? "",
                                );
                                if (!res.success) { alert("Error reporte: " + res.error); return; }
                                const subHtml = docsRes.success && docsRes.data.length > 0
                                  ? `<table style="width:100%;border-collapse:collapse;font-size:10pt;margin-top:16px;"><thead style="background:#1b2b4a;color:#fff;"><tr><th style="padding:5px;border:1px solid #ccc;font-size:9pt;text-align:left;">Tipo Documento</th><th style="padding:5px;border:1px solid #ccc;font-size:9pt;text-align:left;">Referencia</th></tr></thead><tbody>`
                                    + docsRes.data.map((d:any) => `<tr style="border-bottom:1px solid #ccc;"><td style="padding:5px;border:1px solid #ccc;font-size:9pt;">${String(d.descripcion ?? d.DESCRIPCION_DOC ?? d.des ?? "").trim()}</td><td style="padding:5px;border:1px solid #ccc;font-size:9pt;">${String(d.DESCRIPCION_DOC ?? d.des ?? d.descripción ?? "").trim()}</td></tr>`).join("")
                                    + `</tbody></table>`
                                  : `<p style="font-size:11px;color:#666;margin-top:12px;">No hay documentos anexos registrados.</p>`;
                                const rows = res.data as any[];
                                const first = rows[0] ?? {};
                                const html = construirHtmlReportePredio({ ...first, docs_table: subHtml }, subHtml, plantillaRes.data);
                                setReporteHtml(html);
                                setReportePdfConfig(construirConfigPdfPredio({ ...first, docs_table: subHtml }));
                                setReporteOpen(true);
                              }}
                              title="Reporte PJ"
                              className="rounded-md bg-cyan-50 p-1 text-cyan-700 transition hover:bg-cyan-100 hover:text-cyan-800"
                              aria-label="Ver reporte PJ"
                            >
                              <Printer size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                <span>Mostrando {pagedRows.length} de {rows.length} registros</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="px-2 font-medium text-slate-600">{page} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Siguiente"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </fieldset>
        </div>
      </div>
    </div>

      <ReporteViewerModal
        isOpen={reporteOpen}
        onClose={() => setReporteOpen(false)}
        html={reporteHtml}
        pdfConfig={null}
      />
    </>
    );
}
