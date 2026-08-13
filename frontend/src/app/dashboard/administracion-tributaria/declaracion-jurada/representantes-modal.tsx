"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Users, User, Printer, Plus, Pencil, Trash2 } from "lucide-react";
import {
  obtenerRepresentantesAction,
  eliminarRepresentanteAction,
  type ObtenerRepresentantesData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import RepresentanteFormModal from "./representante-form-modal";

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

  // ── Edición (abre RepresentanteFormModal precargado con @busc=6) ──
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // ── Eliminación (confirmación Sí/No + @busc=7) ──
  const [eliminandoRep, setEliminandoRep] = useState<{ id: string; nombres: string } | null>(null);
  const [eliminarLoading, setEliminarLoading] = useState(false);
  const [eliminarError, setEliminarError] = useState<string | null>(null);

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

  // ── Eliminar representante (confirmado) ──
  const confirmarEliminar = async () => {
    if (!eliminandoRep) return;
    setEliminarLoading(true);
    setEliminarError(null);
    try {
      const res = await eliminarRepresentanteAction({
        codigo: codigo.trim(),
        id: eliminandoRep.id,
      });
      if (!res.success) {
        setEliminarError(res.error);
        return;
      }
      if (!res.data.success) {
        setEliminarError(res.data.mensaje);
        return;
      }
      setEliminandoRep(null);
      cargar();
    } catch {
      setEliminarError("Error al eliminar el representante. Intente nuevamente.");
    } finally {
      setEliminarLoading(false);
    }
  };

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
                        <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.representantes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
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
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEliminarError(null);
                                    setEditandoId(rep.cod);
                                  }}
                                  title="Editar representante"
                                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-100 hover:text-sat-navy focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEliminarError(null);
                                    setEliminandoRep({ id: rep.cod, nombres: rep.nombres || "" });
                                  }}
                                  title="Eliminar representante"
                                  className="rounded-md border border-red-200 bg-white p-1 text-red-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300/40"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
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
            onClick={() => {
              setEliminarError(null);
              setEditandoId("");
            }}
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

      <RepresentanteFormModal
        isOpen={editandoId !== null}
        onClose={() => setEditandoId(null)}
        codigoContribuyente={codigo.trim()}
        idRepresentanteInicial={editandoId ?? undefined}
        onSaved={() => {
          setEditandoId(null);
          cargar();
        }}
      />

      {/* ══ Modal Confirmar Eliminación de Representante ══ */}
      {eliminandoRep && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !eliminarLoading) setEliminandoRep(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !eliminarLoading) setEliminandoRep(null);
          }}
          tabIndex={-1}
        >
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-red-700 via-red-800 to-slate-800 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-0.5 rounded-full bg-red-300" />
                <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
                  Eliminar Representante
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!eliminarLoading) setEliminandoRep(null);
                }}
                className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3 px-4 py-3.5">
              <p className="text-xs text-slate-600">
                ¿Desea eliminar el representante{" "}
                <span className="font-semibold text-slate-800">
                  {eliminandoRep.nombres || "(sin nombre)"}
                </span>
                ?
              </p>

              {eliminarError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600">
                  {eliminarError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setEliminandoRep(null)}
                disabled={eliminarLoading}
                className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-300/30"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={eliminarLoading}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {eliminarLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Sí, Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}