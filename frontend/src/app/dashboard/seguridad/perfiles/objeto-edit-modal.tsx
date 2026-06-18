"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import {
  fetchObjetosPorAccesoAction,
  toggleAccesoPermisoAction,
} from "@/actions/perfiles";

// ── Types ────────────────────────────────────────────────

interface ObjetoRow {
  id_acceso: string;
  nombre: string;
  id_objeto: string;
  checked: boolean;
}

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  idAcceso: string;
  idPerfil: string;
  onClose: () => void;
}

// ── Modal ────────────────────────────────────────────────

export default function ObjetoEditModal({
  isOpen,
  idAcceso,
  idPerfil,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [objetos, setObjetos] = useState<ObjetoRow[]>([]);

  // ── Load objects ──

  const loadObjetos = async () => {
    if (!idAcceso || !idPerfil) return;
    setLoading(true);
    try {
      const res = await fetchObjetosPorAccesoAction(idAcceso, idPerfil);
      if (res.success) {
        setObjetos(res.data);
      } else {
        setObjetos([]);
      }
    } catch {
      setObjetos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setObjetos([]);
      loadObjetos();
    }
  }, [isOpen, idAcceso, idPerfil]);

  // ── Toggle handler ──

  const handleToggle = async (objetoId: string, nuevoChecked: boolean) => {
    // Optimistic update
    setObjetos((prev) =>
      prev.map((o) =>
        o.id_acceso === objetoId ? { ...o, checked: nuevoChecked } : o,
      ),
    );

    const res = await toggleAccesoPermisoAction({
      id_perfil: idPerfil,
      id_acceso: objetoId,
      bacceso: nuevoChecked ? "1" : "0",
    });

    if (!res.success) {
      // Revert on failure
      setObjetos((prev) =>
        prev.map((o) =>
          o.id_acceso === objetoId
            ? { ...o, checked: !nuevoChecked }
            : o,
        ),
      );
    }
  };

  // ── Render ──

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <span className="text-sm font-semibold text-white tracking-tight">
            Objetos del Acceso
          </span>
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
        <div className="p-4 space-y-4">

          {/* ── Fieldset: Pantalla ── */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
            <legend className="ml-3 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Pantalla
            </legend>
            <div className="p-2.5">
              <input
                type="text"
                value={idAcceso}
                readOnly
                className="w-full rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] text-slate-500 cursor-not-allowed"
              />
            </div>
          </fieldset>

          {/* ── Fieldset: Objetos ── */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
            <legend className="ml-3 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Objetos
            </legend>
            <div className="p-2.5">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                  <span className="ml-2 text-xs text-slate-400">
                    Cargando objetos...
                  </span>
                </div>
              ) : objetos.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-xs text-slate-400">
                    Sin objetos para este acceso
                  </span>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  <table className="w-full table-fixed border-collapse">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="w-[25%] text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                          Cod.
                        </th>
                        <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                          Nombre
                        </th>
                        <th className="w-[22%] text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                          Id. Objeto
                        </th>
                        <th className="w-[12%] text-center text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                          Acc.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {objetos.map((o) => (
                        <tr
                          key={o.id_acceso}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                            {o.id_acceso}
                          </td>
                          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-700 truncate">
                            {o.nombre}
                          </td>
                          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-500 truncate">
                            {o.id_objeto || "\u2014"}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={o.checked}
                              onChange={(e) =>
                                handleToggle(o.id_acceso, e.target.checked)
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/30 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </fieldset>
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
