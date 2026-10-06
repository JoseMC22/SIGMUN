"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Loader2, Search, Printer } from "lucide-react";
import {
  getReporteFraccionamientosFiltrosAction,
  getReporteFraccionamientosAction,
  type ReporteFraccionamientoRow,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { obtenerPlantillaReporteFraccionamientosAction } from "@/actions/administracion-tributaria/reporte-fraccionamientos";
import {
  construirHtmlReporteFraccionamientos,
  construirConfigPdfReporteFraccionamientos,
} from "./reportes/ReporteFraccionamientos/reporte-fraccionamientos";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import { getStoredUser } from "@/lib/api";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// El SP devuelve las fechas como DD/MM/YYYY; los input type="date" requieren YYYY-MM-DD.
const toInputDate = (value: string | undefined): string => {
  if (!value || !value.trim()) return "";
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
};

// Convierte YYYY-MM-DD (input date) → DD/MM/YYYY (visualización + legado).
const toDisplayDate = (value: string | undefined): string => {
  if (!value || !value.trim()) return "";
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

/**
 * Reporte de Tesorería — Fraccionamientos Emitidos
 * (legacy: fraccionar/reportes + fraccionar/reporteconsulta → Rentas.ImprimeConvenio @buscar=8).
 */
export default function ReporteFraccionamientosModal({ isOpen, onClose }: Props) {
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [usuarios, setUsuarios] = useState<{ value: string; label: string }[]>([]);
  const [operador, setOperador] = useState("");

  const [rows, setRows] = useState<ReporteFraccionamientoRow[]>([]);
  const [total, setTotal] = useState("0.00");
  const [buscarLoading, setBuscarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reporte (vista previa + PDF)
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReturnType<
    typeof construirConfigPdfReporteFraccionamientos
  > | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);

  const formato =
    (n: string) => Number(String(n).replace(/[,\s]/g, "")) || 0;

  const cargarFiltros = useCallback(async () => {
    const res = await getReporteFraccionamientosFiltrosAction();
    if (!res.success) {
      setError(res.error);
      return;
    }
    setFrom(toInputDate(res.data.desde));
    setTo(toInputDate(res.data.hasta));
    setUsuarios(res.data.usuarios);
    setOperador("");
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRows([]);
      setTotal("0.00");
      setReporteHtml(null);
      setReportePdf(null);
      void cargarFiltros();
    }
  }, [isOpen, cargarFiltros]);

  // Cierra con Escape (solo si este modal es el tope de la pila).
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, topModal, onClose]);

  // ── Buscar ──
  const handleBuscar = useCallback(async () => {
    if (!from || !to || buscarLoading) return;
    setBuscarLoading(true);
    setError(null);
    try {
      const res = await getReporteFraccionamientosAction(from, to, operador);
      if (!res.success) {
        setError(res.error);
        setRows([]);
        setTotal("0.00");
        return;
      }
      setRows(res.rows);
      const suma = res.rows.reduce((acc, r) => acc + formato(r.deudaIni), 0);
      setTotal(suma.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
    } catch {
      setError("Error al consultar el reporte.");
    } finally {
      setBuscarLoading(false);
    }
  }, [from, to, operador, buscarLoading]);

  // ── Imprimir Reporte ──
  const handleImprimir = useCallback(async () => {
    if (imprimiendo) return;
    setImprimiendo(true);
    setError(null);
    try {
      const plantilla = await obtenerPlantillaReporteFraccionamientosAction();
      if (!plantilla.success) {
        setError(plantilla.error);
        return;
      }
      const html = construirHtmlReporteFraccionamientos(rows, plantilla.data, {
        desde: toDisplayDate(from),
        hasta: toDisplayDate(to),
        operador,
        funcionario: getStoredUser()?.username ?? "",
      });
      setReporteHtml(html);
      setReportePdf(construirConfigPdfReporteFraccionamientos(rows, {
        desde: toDisplayDate(from),
        hasta: toDisplayDate(to),
        operador,
      }));
    } catch {
      setError("Error al generar el reporte.");
    } finally {
      setImprimiendo(false);
    }
  }, [rows, from, to, operador, imprimiendo]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <div>
              <h2 className="text-[12px] font-semibold text-slate-800">
                Reporte Tesorería
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Fraccionamientos Emitidos
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

          {/* Filtros */}
          <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none">
                  Desde
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none">
                  Hasta
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none">
                  Usuarios
                </label>
                <select
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  className={`${inputClass} min-w-[160px]`}
                >
                  <option value="">— Todos —</option>
                  {usuarios.map((u) => (
                    <option key={u.value} value={u.label}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void handleBuscar()}
                disabled={!from || !to || buscarLoading}
                className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buscarLoading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Search size={11} />
                )}
                Buscar
              </button>
            </div>
            {error && <p className="mt-2 text-[10px] text-red-600">{error}</p>}
          </div>

          {/* Grid */}
          <div className="p-4">
            <div className="max-h-[360px] overflow-auto rounded border border-slate-200">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-slate-100">
                  <tr className="text-slate-700">
                    <th className="px-2 py-1.5 text-center font-semibold w-8">N°</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Año</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Convenio</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Estado</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Fecha</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Deuda Ini.</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Cuotas</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Cancel.</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Vencidas</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {buscarLoading ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                        <Loader2 size={14} className="mr-1.5 inline-block animate-spin align-middle" />
                        Consultando…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-4 text-center text-slate-500">
                        Ingrese un rango de fechas y presione Buscar.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr key={`${r.convenio}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-1 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-1 text-slate-800">{r.anno}</td>
                        <td className="px-2 py-1 text-slate-800">{r.convenio}</td>
                        <td className="px-2 py-1 text-slate-800">{r.estado}</td>
                        <td className="px-2 py-1 text-slate-800">{r.fecha}</td>
                        <td className="px-2 py-1 text-right text-slate-800">{r.deudaIni}</td>
                        <td className="px-2 py-1 text-right text-slate-800">{r.cuotas}</td>
                        <td className="px-2 py-1 text-right text-slate-800">{r.cuotasCanceladas}</td>
                        <td className="px-2 py-1 text-right text-slate-800">{r.cuotasVencidas}</td>
                        <td className="px-2 py-1 text-slate-800">{r.operador}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-2 flex items-center justify-end gap-2">
              <b className="text-[11px] text-slate-700">Total:</b>
              <input
                type="text"
                value={total}
                readOnly
                className="w-24 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-700"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-2">
            <div className="min-w-0 flex-1">
              {rows.length > 0 && (
                <p className="text-[10px] text-slate-500">
                  {rows.length} registro{rows.length === 1 ? "" : "s"} encontrado
                  {rows.length === 1 ? "" : "s"}.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleImprimir()}
                disabled={rows.length === 0 || imprimiendo}
                title="Vista previa del reporte (PDF descargable)."
                className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {imprimiendo ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Printer size={11} />
                )}
                Imprimir Reporte
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

      {/* Reporte (vista previa + PDF) */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={() => {
          setReporteHtml(null);
          setReportePdf(null);
        }}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />
    </>
  );
}