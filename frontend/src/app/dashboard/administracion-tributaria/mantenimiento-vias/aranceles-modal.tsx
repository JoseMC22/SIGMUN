"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Pencil, Plus, AlertCircle } from "lucide-react";
import { getArancelesAction, type ArancelRow } from "@/actions/mantenimiento-vias";
import { getViaAction } from "@/actions/mantenimiento-vias";
import ArancelEditModal from "./arancel-edit-modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codVia: string;
}

export default function ArancelesModal({ isOpen, onClose, codVia }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aranceles, setAranceles] = useState<ArancelRow[]>([]);
  const [nombreVia, setNombreVia] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editIdTbl, setEditIdTbl] = useState("");

  // ── Load data on open ──
  useEffect(() => {
    if (!isOpen || !codVia) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getArancelesAction(codVia), getViaAction(codVia)]).then(
      ([arancelRes, viaRes]) => {
        if (cancelled) return;
        if (arancelRes.success) setAranceles(arancelRes.data);
        else setError(arancelRes.error);
        if (viaRes.success) setNombreVia(viaRes.data.nombre_via);
      },
    ).catch(() => {
      if (!cancelled) setError("Error de conexión");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, codVia]);

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const handleNuevoArancel = () => {
    setEditIdTbl("");
    setShowEditModal(true);
  };

  const handleEditarArancel = (row: ArancelRow) => {
    setEditIdTbl(row.id_tbl);
    setShowEditModal(true);
  };

  const reloadAranceles = useCallback(() => {
    if (!codVia) return;
    getArancelesAction(codVia).then((res) => {
      if (res.success) setAranceles(res.data);
    });
  }, [codVia]);

  const handleEditSaved = () => {
    reloadAranceles();
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  const labelClass =
    "block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
        data-testid="aranceles-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              Aranceles de Vía
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
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-sm text-slate-500">Cargando...</span>
            </div>
          ) : (
            <>
              {/* ── Info superior: código + nombre ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div>
                  <label className={labelClass}>Código de Vía</label>
                  <input type="text" value={codVia} disabled className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nombre de Vía</label>
                  <input type="text" value={nombreVia} disabled className={inputClass} />
                </div>
              </div>

              {/* ── Error ── */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {/* ── Tabla de aranceles ── */}
              {aranceles.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-10">
                  <p className="text-sm font-medium text-slate-500">
                    No tiene aranceles registrados
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Presione "Nuevo Arancel" para agregar uno
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                  <table className="w-full table-fixed border-collapse">
                    <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                      <tr>
                        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[20%]">
                          Código Vía
                        </th>
                        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
                          Año
                        </th>
                        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[25%]">
                          Arancel
                        </th>
                        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[20%]">
                          Estado
                        </th>
                        <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aranceles.map((row, idx) => {
                        const activo = row.estado === "Activo";
                        return (
                          <tr
                            key={`${row.id_tbl}-${idx}`}
                            className={`transition hover:bg-slate-50 ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            }`}
                          >
                            <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                              {row.cod_via}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">
                              {row.anno}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-700 font-medium">
                              {row.arancel}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${
                                  activo
                                    ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                                    : "border-red-200 text-red-600 bg-red-50"
                                }`}
                              >
                                {activo ? "ACTIVADO" : "INACTIVO"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleEditarArancel(row)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98]"
                                  title="Editar arancel"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={handleNuevoArancel}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Nuevo Arancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ── Modal de edición de arancel ── */}
      <ArancelEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={handleEditSaved}
        codVia={codVia}
        idTbl={editIdTbl}
      />
    </div>
  );
}
