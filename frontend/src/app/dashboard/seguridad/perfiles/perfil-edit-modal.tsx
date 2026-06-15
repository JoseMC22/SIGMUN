"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Save, AlertCircle, FolderTree, ShieldCheck,
} from "lucide-react";
import {
  fetchPerfilDetailAction,
  fetchModulosAction,
  fetchAccesosPorModuloAction,
} from "@/actions/perfiles";

// ── Types ────────────────────────────────────────────────

interface ModuloRow {
  id_acceso: string;
  nombre: string;
}

interface AccesoRow {
  id_acceso: string;
  nombre: string;
  checked: boolean;
}

interface PerfilDetail {
  id: string;
  nombre: string;
  estado: boolean;
}

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  perfilId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Modal ────────────────────────────────────────────────

export default function PerfilEditModal({
  isOpen,
  perfilId,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState(true);

  // Módulos / Accesos
  const [modulos, setModulos] = useState<ModuloRow[]>([]);
  const [selectedModulo, setSelectedModulo] = useState<string | null>(null);
  const [accesos, setAccesos] = useState<AccesoRow[]>([]);
  const [loadingAccesos, setLoadingAccesos] = useState(false);

  // ── Load perfil detail ──

  const loadPerfilDetail = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetchPerfilDetailAction(id);
      if (res.success) {
        setCodigo(res.data.id);
        setDescripcion(res.data.nombre);
        setEstado(res.data.estado);
      } else {
        setFetchError(res.error);
      }
    } catch {
      setFetchError("Error al cargar datos del perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load módulos ──

  const loadModulos = useCallback(async () => {
    try {
      const res = await fetchModulosAction();
      if (res.success) {
        setModulos(res.data);
      }
    } catch {
      // silently fail for catalog
    }
  }, []);

  // ── Load accesos when módulo selected ──

  const loadAccesos = useCallback(
    async (idModulo: string, idPerfil: string) => {
      setLoadingAccesos(true);
      try {
        const res = await fetchAccesosPorModuloAction(idModulo, idPerfil);
        if (res.success) {
          setAccesos(res.data);
        } else {
          setAccesos([]);
        }
      } catch {
        setAccesos([]);
      } finally {
        setLoadingAccesos(false);
      }
    },
    [],
  );

  // ── Init on open ──

  useEffect(() => {
    if (isOpen) {
      setCodigo("");
      setDescripcion("");
      setEstado(true);
      setFetchError(null);
      setSelectedModulo(null);
      setAccesos([]);
      if (perfilId) {
        loadPerfilDetail(perfilId);
      }
      loadModulos();
    }
  }, [isOpen, perfilId, loadPerfilDetail, loadModulos]);

  // ── Module selection handler ──

  const handleModuloClick = (id_acceso: string) => {
    setSelectedModulo(id_acceso);
    if (perfilId) {
      loadAccesos(id_acceso, perfilId);
    }
  };

  // ── Render ──

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              {perfilId ? "Editar Perfil" : "Nuevo Perfil"}
            </span>
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
        <div className="p-4 space-y-4">

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-xs font-medium">Cargando perfil...</span>
              </div>
            </div>
          )}

          {/* ── Fetch error ── */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle size={24} className="text-red-400 mb-2" />
              <p className="text-sm font-medium text-red-600">{fetchError}</p>
              <button
                type="button"
                onClick={() => perfilId && loadPerfilDetail(perfilId)}
                className="mt-3 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ── Form ── */}
          {!loading && !fetchError && (
            <div className="space-y-4">

              {/* ── Fieldset: Datos del Perfil ── */}
              <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                <legend className="ml-3 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Datos del Perfil
                </legend>
                <div className="p-2.5 space-y-2">
                  {/* Código + Descripción */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Código
                      </label>
                      <input
                        type="text"
                        value={codigo}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="edit-descripcion" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Descripción
                      </label>
                      <input
                        id="edit-descripcion"
                        type="text"
                        maxLength={100}
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={estado}
                        onChange={(e) => setEstado(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/30 focus:ring-2"
                      />
                      <span className="text-[11px] font-medium text-slate-700">
                        {estado ? "Activado" : "Desactivado"}
                      </span>
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* ── Fieldset: Módulos y Accesos ── */}
              <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                <legend className="ml-3 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Módulos y Accesos
                </legend>
                <div className="p-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* ── Módulos table ── */}
                    <div>
                      <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Módulos
                      </span>
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        <table className="w-full table-fixed border-collapse">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="w-[30%] text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                                Cod.
                              </th>
                              <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                                Nombre
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {modulos.length === 0 ? (
                              <tr>
                                <td colSpan={2} className="px-2 py-4 text-center text-[11px] text-slate-400">
                                  Sin módulos
                                </td>
                              </tr>
                            ) : (
                              modulos.map((m) => (
                                <tr
                                  key={m.id_acceso}
                                  onClick={() => handleModuloClick(m.id_acceso)}
                                  className={`cursor-pointer transition ${
                                    selectedModulo === m.id_acceso
                                      ? "bg-sat-cyan/10 ring-1 ring-sat-cyan/30"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                                    {m.id_acceso}
                                  </td>
                                  <td className="px-2 py-1.5 text-[11px] font-medium text-slate-700 truncate">
                                    {m.nombre}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ── Accesos table ── */}
                    <div>
                      <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Accesos
                      </span>
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        {!selectedModulo ? (
                          <div className="flex items-center justify-center py-12">
                            <FolderTree size={20} className="text-slate-300" />
                            <span className="ml-2 text-xs text-slate-400">
                              Seleccione un módulo
                            </span>
                          </div>
                        ) : loadingAccesos ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 size={18} className="animate-spin text-slate-400" />
                            <span className="ml-2 text-xs text-slate-400">
                              Cargando accesos...
                            </span>
                          </div>
                        ) : accesos.length === 0 ? (
                          <div className="flex items-center justify-center py-8">
                            <span className="text-xs text-slate-400">
                              Sin accesos para este módulo
                            </span>
                          </div>
                        ) : (
                          <table className="w-full table-fixed border-collapse">
                            <thead className="bg-slate-100 sticky top-0">
                              <tr>
                                <th className="w-[30%] text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                                  Cod.
                                </th>
                                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                                  Nombre
                                </th>
                                <th className="w-[14%] text-center text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                                  Acc.
                                </th>
                                <th className="w-[18%] text-center text-[10px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">
                                  Objs.
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {accesos.map((a) => (
                                <tr
                                  key={a.id_acceso}
                                  className="hover:bg-slate-50 transition"
                                >
                                  <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                                    {a.id_acceso}
                                  </td>
                                  <td className="px-2 py-1.5 text-[11px] font-medium text-slate-700 truncate">
                                    {a.nombre}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={a.checked}
                                      readOnly
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/30"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <button
                                      type="button"
                                      className="rounded px-2 py-0.5 text-[10px] font-medium text-sat-cyan transition hover:bg-sat-cyan/10"
                                      title="Ver objetos del acceso"
                                    >
                                      Objetos
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </fieldset>

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && !fetchError && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan/60 px-4 py-1.5 text-xs font-medium text-white cursor-not-allowed"
              title="Funcionalidad no implementada aún"
            >
              <Save size={13} />
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
