"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Search, Plus, Pencil, Loader2, Home, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { buscarUrbanizacionesAction, getTiposViaAction, type UrbanizacionRow, type TipoViaOption } from "@/actions/administracion-tributaria/mantenimiento-vias";
import UrbanizacionCrudModal from "./urbanizacion-crud-modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
const labelClass =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

export default function DetalleUrbanizacionModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UrbanizacionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tiposVia, setTiposVia] = useState<TipoViaOption[]>([]);

  // ── Search filters ──
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // ── CRUD Modal state ──
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [crudModalMode, setCrudModalMode] = useState<"create" | "edit">("create");
  const [editUrbaId, setEditUrbaId] = useState("");

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const perPage = 12;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(data.length / perPage)), [data.length, perPage]);
  const paginatedData = useMemo(
    () => data.slice((page - 1) * perPage, page * perPage),
    [data, page, perPage],
  );

  // Reset to page 1 when data changes
  useEffect(() => { setPage(1); }, [data]);

  // ── Load on open ──
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setFiltroTipo("");
    setFiltroNombre("");
    setFiltroEstado("");

    Promise.all([
      buscarUrbanizacionesAction({}),
      getTiposViaAction(),
    ])
      .then(([urbRes, tipRes]) => {
        if (urbRes.success) setData(urbRes.data);
        else setError(urbRes.error);
        if (tipRes.success) setTiposVia(tipRes.data);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // ── Search handler ──
  const handleSearch = useCallback(() => {
    setLoading(true);
    setError(null);

    buscarUrbanizacionesAction({
      tipo: filtroTipo || undefined,
      nombre: filtroNombre || undefined,
      nestado: filtroEstado || undefined,
    })
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.error);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [filtroTipo, filtroNombre, filtroEstado]);

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // ── CRUD Modal handlers ──
  const handleNuevaUrbanizacion = useCallback(() => {
    setCrudModalMode("create");
    setEditUrbaId("");
    setCrudModalOpen(true);
  }, []);

  const handleEditarUrbanizacion = useCallback((id_urba: string) => {
    setCrudModalMode("edit");
    setEditUrbaId(id_urba);
    setCrudModalOpen(true);
  }, []);

  const handleCrudSaved = useCallback(() => {
    handleSearch();
    setCrudModalOpen(false);
  }, [handleSearch]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
        data-testid="urbanizacion-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              Urbanizaciones
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

          {/* ── Search section ── */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              {/* Tipo Urbanización */}
              <div className="md:col-span-3">
                <label className={labelClass}>Tipo de Vía</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className={selectClass}
                >
                  <option value="">TODOS</option>
                  {tiposVia.map((t) => (
                    <option key={t.id_tipo} value={t.id_tipo}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre Urb */}
              <div className="md:col-span-4">
                <label className={labelClass}>Nombre Urbanización</label>
                <input
                  type="text"
                  placeholder="Nombre de urbanización"
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  className={`${inputClass} uppercase`}
                />
              </div>

              {/* Estado */}
              <div className="md:col-span-2">
                <label className={labelClass}>Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className={selectClass}
                >
                  <option value="">TODOS</option>
                  <option value="1">ACTIVO</option>
                  <option value="0">INACTIVO</option>
                </select>
              </div>

              {/* Buscar button */}
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] w-full justify-center"
                >
                  <Search size={12} />
                  Buscar
                </button>
              </div>
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

          {/* ── Loading ── */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-sm text-slate-500">Cargando...</span>
            </div>
          ) : (
            /* ── Table ── */
            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
                      ID
                    </th>
                    <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
                      TipoUrb
                    </th>
                    <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[45%]">
                      Nombre Urb
                    </th>
                    <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
                      Estado
                    </th>
                    <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Home size={20} className="text-slate-300 mb-1" />
                          <p className="text-xs font-medium text-slate-500">
                            No se encontraron urbanizaciones
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => {
                      const activo = row.estado === "Activo" || row.estado === "1";
                      return (
                        <tr
                          key={row.id_urba}
                          className={`transition hover:bg-slate-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          }`}
                        >
                          <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                            {row.id_urba}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                            {row.nombabr}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                            {row.nombre}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${
                                activo
                                  ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                                  : "border-red-200 text-red-600 bg-red-50"
                              }`}
                            >
                              {activo ? "ACTIVO" : "INACTIVO"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleEditarUrbanizacion(row.id_urba)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98]"
                                title="Editar urbanización"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

          {/* ── Pagination ── */}
          {!loading && data.length > 0 && (
            <div className="flex items-center justify-between pt-1 pb-2">
              <p className="text-[10px] text-slate-400">
                Mostrando {(page - 1) * perPage + 1}–
                {Math.min(page * perPage, data.length)} de {data.length} registros
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  // Smart page range: show around current page
                  let pageNum: number | null = null;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  const label = pageNum;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPage(label)}
                      className={`min-w-[22px] rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                        page === label
                          ? "bg-sat-cyan text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Siguiente"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={handleNuevaUrbanizacion}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Nueva Urbanización
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
          >
            Salir
          </button>
        </div>
      </div>

      {/* ── CRUD Modal ── */}
      <UrbanizacionCrudModal
        isOpen={crudModalOpen}
        onClose={() => setCrudModalOpen(false)}
        mode={crudModalMode}
        idUrba={editUrbaId || undefined}
        onSaved={handleCrudSaved}
      />
    </div>
  );
}
