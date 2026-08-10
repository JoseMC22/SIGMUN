"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Users, User, Printer, Plus } from "lucide-react";
import {
  obtenerRepresentantesAction,
  type ObtenerRepresentantesData,
} from "@/actions/administracion-tributaria/declaracion-jurada";

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

// ─── Representantes Modal ─────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Código del contribuyente cuyos representantes se muestran. */
  codigo: string;
}

export default function RepresentantesModal({ isOpen, onClose, codigo }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ObtenerRepresentantesData | null>(null);

  const cargar = useCallback(async () => {
    if (!codigo.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await obtenerRepresentantesAction(codigo.trim());
      if (!res.success) {
        setError(res.error);
        return;
      }
      setData(res.data);
    } catch {
      setError("Error al cargar los datos. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    if (isOpen) {
      cargar();
    }
  }, [isOpen, cargar]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const labelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";
  const valueClass = "block text-[11px] font-medium text-slate-700 truncate";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Representantes del Contribuyente{" "}
              <span className="font-mono text-sat-cyan">({codigo})</span>
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

          {!loading && !error && data && (
            <>
              {/* ══ Datos Contribuyente ══ */}
              <FieldGroup title="Datos Contribuyente" icon={<User size={13} />}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <span className={labelClass}>Código</span>
                    <span className={valueClass}>{data.datos.codigo || "-"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className={labelClass}>Nombre</span>
                    <span className={valueClass}>{data.datos.nombres || "-"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className={labelClass}>N° Documento</span>
                    <span className={valueClass}>{data.datos.numDoc || "-"}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <span className={labelClass}>Dirección</span>
                  <span className={valueClass}>{data.datos.direccion || "-"}</span>
                </div>
              </FieldGroup>

              {/* ══ Datos Representante (grid) ══ */}
              <FieldGroup title="Datos Representante" icon={<Users size={13} />}>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70">
                        <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Tipo Repre
                        </th>
                        <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Nombre
                        </th>
                        <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Tipo Doc.
                        </th>
                        <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Dirección
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.representantes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-4 text-center text-[11px] text-slate-400"
                          >
                            El contribuyente no tiene representantes registrados.
                          </td>
                        </tr>
                      ) : (
                        data.representantes.map((rep, idx) => (
                          <tr
                            key={`${rep.cod}-${idx}`}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                          >
                            <td className="px-3 py-2 text-[11px] text-slate-700 truncate">
                              {rep.tipoRelacion || "-"}
                            </td>
                            <td className="px-3 py-2 text-[11px] font-medium text-slate-700 truncate">
                              {rep.nombres || "-"}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                              {rep.tipoDocumento || "-"}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-600 truncate max-w-[30rem]">
                              {rep.direccion || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </FieldGroup>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
          <button
            type="button"
            onClick={() => alert("Por desarrollar")}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
          >
            <Plus size={13} />
            Nuevo
          </button>
          <button
            type="button"
            onClick={() => alert("Por desarrollar")}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
          >
            <Printer size={13} />
            Imprimir
          </button>
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