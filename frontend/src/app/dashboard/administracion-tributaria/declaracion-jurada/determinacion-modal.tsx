"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Calculator, FileText } from "lucide-react";
import {
  getPrediosDJAction,
  calcularDeterminacionIpAction,
  calcularDeterminacionArbitriosAction,
  type PredioDJItemData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getStoredUser } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import { fmtMonto, toNum } from "@/lib/num";
import ConfirmDialog from "@/components/confirm-dialog";

// ─── Types ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigoContribuyente?: string;
  razonSocial?: string;
  direccion?: string;
  annoSeleccionado?: string | null;
}

type Accion = "ip" | "arbitrios";

// ─── Component ─────────────────────────────────────────────

export default function DeterminacionModal({
  isOpen,
  onClose,
  codigoContribuyente = "",
  razonSocial = "",
  direccion = "",
  annoSeleccionado,
}: Props) {
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);
  const modalRef = useRef<HTMLDivElement>(null);

  const [tipoDeterminacion, setTipoDeterminacion] = useState("1");
  const [predios, setPredios] = useState<PredioDJItemData[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState<Accion | null>(null);
  const [confirmAccion, setConfirmAccion] = useState<Accion | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);

  const rowKey = (p: PredioDJItemData) => `${p.codPred}|${p.anexo}`;

  // ── Carga de predios al abrir ──
  useEffect(() => {
    if (!isOpen) return;
    setTipoDeterminacion("1");
    setSeleccion(new Set());
    setProcesando(null);
    setConfirmAccion(null);
    setMessage(null);

    if (!codigoContribuyente || !annoSeleccionado) {
      setPredios([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getPrediosDJAction(codigoContribuyente, annoSeleccionado)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setPredios(res.data);
        } else {
          setPredios([]);
          setMessage({ type: "error", text: res.error });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, codigoContribuyente, annoSeleccionado]);

  // Foco al abrir
  useEffect(() => {
    if (isOpen) modalRef.current?.focus();
  }, [isOpen]);

  // Escape solo si este modal es el tope y no hay confirm/cálculo pendiente
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !procesando && !confirmAccion) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, topModal, procesando, confirmAccion, onClose]);

  const togglePredio = (p: PredioDJItemData) => {
    const key = rowKey(p);
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTodos = () => {
    setSeleccion((prev) =>
      prev.size === predios.length ? new Set() : new Set(predios.map(rowKey)),
    );
  };

  const ejecutar = async (accion: Accion) => {
    if (procesando) return;
    setProcesando(accion);
    setMessage(null);

    const operador = getStoredUser()?.username?.toUpperCase() ?? "";
    let estacion = "";
    try {
      const s = await checkSessionAction();
      estacion = s?.hostname ?? "";
    } catch {
      /* se manda vacío */
    }

    try {
      if (accion === "ip") {
        const res = await calcularDeterminacionIpAction({
          codigo: codigoContribuyente,
          anno: annoSeleccionado ?? "",
          tipodeterminacion: tipoDeterminacion,
          operador,
          estacion,
        });
        if (!res.success) {
          setMessage({ type: "error", text: res.error });
        } else {
          const data = res.data;
          setMessage({
            type: data.success ? "success" : "error",
            text: data.mensaje || (data.success ? "Se generó el IP correctamente." : "Ocurrió un problema al generar el IP."),
          });
        }
        return;
      }

      const elegidos = predios.filter((p) => seleccion.has(rowKey(p)));
      if (elegidos.length === 0) {
        setMessage({ type: "error", text: "Debe seleccionar como mínimo un predio." });
        return;
      }

      const res = await calcularDeterminacionArbitriosAction(
        elegidos.map((p) => ({
          codigo: codigoContribuyente,
          anno: annoSeleccionado ?? "",
          cod_pred: p.codPred,
          anexo: (p.anexo ?? "").substring(0, 4),
          sub_anexo: (p.anexo ?? "").substring(5),
          tipodeterminacion: tipoDeterminacion,
        })),
        operador,
        estacion,
      );
      if (!res.success) {
        setMessage({ type: "error", text: res.error });
      } else {
        const data = res.data;
        setMessage({
          type: data.success ? "success" : "error",
          text: data.mensaje || (data.success ? "Se generaron los arbitrios correctamente." : "Ocurrió un problema al generar los arbitrios."),
        });
      }
    } finally {
      setProcesando(null);
    }
  };

  const pedirConfirmacion = (accion: Accion) => {
    if (accion === "arbitrios" && seleccion.size === 0) {
      setMessage({ type: "error", text: "Debe seleccionar como mínimo un predio." });
      return;
    }
    setConfirmAccion(accion);
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50";
  const labelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";
  const readonlyClass =
    "w-full rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-500 cursor-not-allowed";

  const busy = procesando !== null;

  return (
    <>
      <div
        ref={modalRef}
        className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy && !confirmAccion) onClose();
        }}
        tabIndex={-1}
      >
        <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* ── Header ── */}
          <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
              <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
                Determinación del Contribuyente
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="overflow-y-auto px-4 py-2.5 space-y-2.5">
            {/* Datos del contribuyente */}
            <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
              <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
                <FileText size={13} />
                Datos Generales del Contribuyente
              </legend>
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className={labelClass}>Código</label>
                    <input type="text" value={codigoContribuyente} readOnly className={readonlyClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Año</label>
                    <input type="text" value={annoSeleccionado ?? ""} readOnly className={readonlyClass} />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="det-tipo" className={labelClass}>
                      Tipo de Determinación
                    </label>
                    <select
                      id="det-tipo"
                      value={tipoDeterminacion}
                      onChange={(e) => setTipoDeterminacion(e.target.value)}
                      disabled={busy}
                      className={inputClass}
                    >
                      <option value="1">Determinación por Emisión</option>
                      <option value="2">Determinación por Fiscalización</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Contribuyente</label>
                  <input type="text" value={razonSocial} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input type="text" value={direccion} readOnly className={readonlyClass} />
                </div>
              </div>
            </fieldset>

            {/* Grilla de predios */}
            <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
              <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
                <FileText size={13} />
                Seleccione los Predios a Calcular
              </legend>
              <div className="max-h-[28vh] overflow-auto rounded-md border border-slate-200 bg-white">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-8 px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={predios.length > 0 && seleccion.size === predios.length}
                          onChange={toggleTodos}
                          disabled={loading || busy}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-sat-cyan"
                          aria-label="Seleccionar todos"
                        />
                      </th>
                      <th className="w-12 px-2 py-1 text-left">Tipo</th>
                      <th className="w-20 px-2 py-1 text-left">Código</th>
                      <th className="w-20 px-2 py-1 text-left">Anexo</th>
                      <th className="px-2 py-1 text-left">Ubicación</th>
                      <th className="w-14 px-2 py-1 text-right">%</th>
                      <th className="w-24 px-2 py-1 text-right">Autoavalúo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                          <Loader2 size={14} className="mr-1 inline animate-spin" />
                          Listado de Predios...
                        </td>
                      </tr>
                    ) : predios.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                          Sin predios para el período.
                        </td>
                      </tr>
                    ) : (
                      predios.map((p) => {
                        const key = rowKey(p);
                        const checked = seleccion.has(key);
                        return (
                          <tr
                            key={key}
                            onClick={() => togglePredio(p)}
                            className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 ${
                              checked ? "bg-cyan-50/60" : ""
                            } ${(p.predioVendido ?? "").trim() === "1" ? "opacity-50" : ""}`}
                          >
                            <td className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePredio(p)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-3.5 w-3.5 rounded border-slate-300 accent-sat-cyan"
                              />
                            </td>
                            <td className="px-2 py-1">{p.tipo}</td>
                            <td className="px-2 py-1">{p.codPred}</td>
                            <td className="px-2 py-1">{p.anexo}</td>
                            <td className="px-2 py-1">{p.direccion}</td>
                            <td className="px-2 py-1 text-right">{toNum(p.porcenPropiedad)}</td>
                            <td className="px-2 py-1 text-right">{fmtMonto(p.totalAutoavaluo)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </fieldset>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50/60 px-4 py-2 shrink-0">
            <div className="min-w-0">
              {message && (
                <span
                  className={`block truncate text-[11px] font-medium ${
                    message.type === "error"
                      ? "text-red-600"
                      : message.type === "success"
                        ? "text-emerald-600"
                        : "text-slate-600"
                  }`}
                  title={message.text}
                >
                  {message.text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => pedirConfirmacion("ip")}
                disabled={loading || busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {procesando === "ip" ? <Loader2 size={13} className="animate-spin" /> : <Calculator size={13} />}
                Determinación Impuesto Pred.
              </button>
              <button
                type="button"
                onClick={() => pedirConfirmacion("arbitrios")}
                disabled={loading || busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#22335a] focus:outline-none focus:ring-2 focus:ring-sat-navy/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {procesando === "arbitrios" ? <Loader2 size={13} className="animate-spin" /> : <Calculator size={13} />}
                Determinación Arbitrios
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmaciones (legacy: confirmMessage) */}
      <ConfirmDialog
        isOpen={confirmAccion === "ip"}
        title="Calculo de IP"
        message="¿Seguro desea recalcular el IP?"
        confirmLabel="Sí, recalcular"
        onConfirm={() => {
          setConfirmAccion(null);
          void ejecutar("ip");
        }}
        onCancel={() => setConfirmAccion(null)}
      />
      <ConfirmDialog
        isOpen={confirmAccion === "arbitrios"}
        title="Calculo de Arbitrios"
        message="¿Seguro desea recalcular arbitrios a los predios seleccionados?"
        confirmLabel="Sí, recalcular"
        onConfirm={() => {
          setConfirmAccion(null);
          void ejecutar("arbitrios");
        }}
        onCancel={() => setConfirmAccion(null)}
      />
    </>
  );
}
