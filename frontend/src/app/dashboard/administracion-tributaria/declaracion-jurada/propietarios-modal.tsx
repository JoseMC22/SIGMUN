"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2, Users } from "lucide-react";
import {
  obtenerPropietariosAction,
  type PropietarioGridData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

// ─── FieldGroup ────────────────────────────────────────────

function FieldGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
        {icon}
        {title}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

// ─── Propietarios Modal ────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Código del predio cuyos propietarios se muestran. */
  codPred: string;
}

export default function PropietariosModal({
  isOpen,
  onClose,
  codPred,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PropietarioGridData[]>([]);

  const cargar = useCallback(async () => {
    if (!codPred.trim()) return;
    setLoading(true);
    setError(null);
    setData([]);
    try {
      const res = await obtenerPropietariosAction(codPred.trim());
      if (!res.success) {
        setError(res.error);
        return;
      }
      setData(res.data.propietarios ?? []);
    } catch {
      setError("Error al cargar los propietarios. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [codPred]);

  useEffect(() => {
    if (isOpen) {
      cargar();
    }
  }, [isOpen, cargar]);

  // ── Escape cierra SOLO este modal si es el tope de la pila ──
  const modalId = useModalStack(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  // ── Foco: al abrirse, este modal toma el foco para que Escape cierre SOLO este modal ──
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const labelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";
  const valueClass = "block text-[11px] font-medium text-slate-700 truncate";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      tabIndex={-1}
    >
      <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Propietarios del Predio{" "}
              <span className="font-mono text-sat-cyan">({codPred})</span>
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
        <div className="overflow-y-auto px-4 py-2.5 space-y-2.5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Cargando...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <FieldGroup title="Propietarios" icon={<Users size={13} />}>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70">
                      <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        Código
                      </th>
                      <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        Nombre
                      </th>
                      <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        % Propiedad
                      </th>
                      <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        F. Adquisición
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((p, idx) => (
                      <tr
                        key={`propietario-${idx}`}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-2 text-[11px] text-slate-700 truncate">
                          {p.codigo || "-"}
                        </td>
                        <td className="px-3 py-2 text-[11px] font-medium text-slate-700 truncate">
                          {p.Nombre || "-"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {p.Porcen ? `${p.Porcen}%` : "-"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {p.fec_venta || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FieldGroup>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px] text-slate-400">
              El predio no tiene propietarios registrados.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-4 py-2.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
