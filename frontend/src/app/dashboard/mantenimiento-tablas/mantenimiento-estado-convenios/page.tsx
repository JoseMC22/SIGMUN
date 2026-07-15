"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RotateCcw, Calendar, FileText, ToggleLeft, Edit2, AlertCircle } from "lucide-react";
import { NuevoConvenioEstadoModal } from "./components/nuevo-convenio-estado-modal";
import { EditarConvenioEstadoModal } from "./components/editar-convenio-estado-modal";

// ─── Types ────────────────────────────────────────────────────────

export interface ConvenioEstadoRow {
  id: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  row: number;
}

// ─── Main Page ────────────────────────────────────────────────────

export default function MantenimientoEstadoConveniosPage() {
  const [data, setData] = useState<ConvenioEstadoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [searchCodigo, setSearchCodigo] = useState("");
  const [searchDescripcion, setSearchDescripcion] = useState("");
  const [searchActivo, setSearchActivo] = useState<string>("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRow, setEditRow] = useState<ConvenioEstadoRow | null>(null);

  // Load data on mount and when search/page changes
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchCodigo) params.append("codigo", searchCodigo);
      if (searchDescripcion) params.append("descripcion", searchDescripcion);
      if (searchActivo) params.append("activo", searchActivo);

      const res = await fetch(`/api/mantenimiento-tablas/mantenimiento-estado-convenios/search?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          setData([]);
          setTotal(0);
          return;
        }
        throw new Error("Error al buscar");
      }
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setError("Error de conexión");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [page, searchCodigo, searchDescripcion, searchActivo]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleNuevoSaved = () => {
    setShowNuevoModal(false);
    executeSearch();
  };

  const handleEditSaved = () => {
    setShowEditModal(false);
    setEditRow(null);
    executeSearch();
  };

  const handleEditClick = (row: ConvenioEstadoRow) => {
    setEditRow(row);
    setShowEditModal(true);
  };

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Consulta de estados de convenio
        </span>
      </div>
      <div className="p-2.5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-56">
            <label htmlFor="search-codigo" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Código
            </label>
            <input
              id="search-codigo"
              type="text"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: ACT"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>
          <div className="w-72">
            <label htmlFor="search-descripcion" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Descripción
            </label>
            <input
              id="search-descripcion"
              type="text"
              value={searchDescripcion}
              onChange={(e) => setSearchDescripcion(e.target.value)}
              placeholder="Buscar por descripción..."
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>
          <div className="w-44">
            <label htmlFor="search-activo" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Estado
            </label>
            <select
              id="search-activo"
              value={searchActivo}
              onChange={(e) => setSearchActivo(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setPage(1); executeSearch(); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-50"
          >
            <Search size={12} />
            Buscar
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchCodigo("");
              setSearchDescripcion("");
              setSearchActivo("");
              setPage(1);
              executeSearch();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98] disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table className="w-full table-fixed border-collapse" data-testid="convenio-estado-grid" role="grid">
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
              <div className="flex items-center gap-1.5">
                <FileText size={11} className="text-white/50" />
                Código
              </div>
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[25%]">
              Descripción
            </th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
              <div className="flex items-center justify-center gap-1.5">
                <ToggleLeft size={11} className="text-white/50" />
                Activo
              </div>
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
              Creado
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
              Actualizado
            </th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[25%]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={`${row.id}-${idx}`}
              className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
            >
              <td className="px-3 py-2 text-[11px] font-mono text-slate-700 font-medium">
                {row.codigo}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600">
                {row.descripcion}
              </td>
              <td className="px-3 py-2 text-center">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  row.activo
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-red-50 text-red-600 ring-1 ring-red-200"
                }`}>
                  {row.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-500 font-mono">
                {new Date(row.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-500 font-mono">
                {new Date(row.updatedAt).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </td>
              <td className="px-3 py-2 text-center">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditClick(row)}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] font-medium text-amber-600 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 active:scale-[0.98]"
                    title="Editar"
                  >
                    <Edit2 size={11} />
                    Editar
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && hasSearched && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-[11px]">
                No se encontraron estados de convenio
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-white/50">
        <div className="text-[11px] text-slate-500">
          Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registros
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-[11px] text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Anterior"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="px-2 text-[11px] text-slate-600 font-mono">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-[11px] text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Siguiente"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-sat-cyan rounded-full" />
          <h1 className="text-[13px] font-semibold text-slate-800">Mantenimiento de Estados de Convenio</h1>
        </div>
        <button
          onClick={() => { setEditRow(null); setShowNuevoModal(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
        >
          <FileText size={12} />
          Nuevo
        </button>
      </div>

      {/* Search + Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {renderSearchForm()}
        {renderGrid()}
        {renderPagination()}
      </div>

      {/* Modals */}
      {showNuevoModal && (
        <NuevoEstadoConvenioModal onClose={() => setShowNuevoModal(false)} onSaved={handleNuevoSaved} />
      )}
      {showEditModal && editRow && (
        <EditarEstadoConvenioModal row={editRow} onClose={() => setShowEditModal(false)} onSaved={handleEditSaved} />
      )}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-[11px] flex items-center gap-2 shadow-lg">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modals (inline for simplicity - can be extracted to components) ────────

interface NuevoEstadoConvenioModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function NuevoEstadoConvenioModal({ onClose, onSaved }: NuevoEstadoConvenioModalProps) {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/mantenimiento-tablas/mantenimiento-estado-convenios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.toUpperCase(), descripcion, activo: activo ? "1" : "0" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Nuevo Estado de Convenio</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-[11px]">{error}</div>}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Código *</label>
            <input
              type="text"
              value={codigo.toUpperCase()}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={10}
              required
              className="w-full mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              placeholder="Ej: ACT"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">3-10 caracteres, solo letras y números</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Descripción *</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={255}
              required
              className="w-full mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              placeholder="Descripción del estado"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo-nuevo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
            />
            <label htmlFor="activo-nuevo" className="text-[11px] text-slate-600 cursor-pointer">Activo</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={loading || !codigo || !descripcion} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sat-cyan text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditarEstadoConvenioModalProps {
  row: ConvenioEstadoRow;
  onClose: () => void;
  onSaved: () => void;
}

function EditarEstadoConvenioModal({ row, onClose, onSaved }: EditarEstadoConvenioModalProps) {
  const [codigo, setCodigo] = useState(row.codigo);
  const [descripcion, setDescripcion] = useState(row.descripcion);
  const [activo, setActivo] = useState(row.activo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/mantenimiento-tablas/mantenimiento-estado-convenios/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.toUpperCase(), descripcion, activo: activo ? "1" : "0" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Editar Estado de Convenio</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-[11px]">{error}</div>}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Código *</label>
            <input
              type="text"
              value={codigo.toUpperCase()}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={10}
              required
              className="w-full mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Descripción *</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={255}
              required
              className="w-full mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo-edit"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
            />
            <label htmlFor="activo-edit" className="text-[11px] text-slate-600 cursor-pointer">Activo</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={loading || !codigo || !descripcion} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sat-cyan text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}