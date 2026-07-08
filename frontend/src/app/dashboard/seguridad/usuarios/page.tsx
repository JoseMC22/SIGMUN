"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserX,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Plus,
} from "lucide-react";
import {
  searchUsuariosAction,
  fetchAreasAction,
  fetchPerfilesAction,
  eliminarUsuarioAction,
} from "@/actions/seguridad/usuarios";
import UsuarioEditModal from "./usuario-edit-modal";
import CajaModal from "./caja-modal";

// ─── Types ────────────────────────────────────────────────

interface UsuarioRow {
  id: string;
  nombre: string;
  area: string;
  perfil: string;
  usuario: string;
  estado: string;
}

interface AreaOption {
  area: string;
  nombre: string;
}

interface PerfilOption {
  id_perfil: string;
  nombre: string;
}

// ─── Status badge ─────────────────────────────────────────

function StatusBadge({ estado }: { estado: string }) {
  const isActive = estado === "ACTIVADO";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40"
          : "bg-red-50 text-red-700 ring-1 ring-red-300/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-red-400"
        }`}
      />
      {isActive ? "ACTIVADO" : "DESACTIVADO"}
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{ width: j === 0 ? "60%" : j === 5 ? "40%" : "80%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function UsuariosPage() {
  const [filters, setFilters] = useState({
    codigo: "",
    nombre: "",
    usuario: "",
    area: "",
    perfil: "",
    estado: "1",
  });

  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilOption[]>([]);
  const [data, setData] = useState<UsuarioRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCajaModal, setShowCajaModal] = useState(false);

  // Load areas and perfiles on mount
  useEffect(() => {
    const init = async () => {
      const [areasRes, perfilesRes] = await Promise.all([
        fetchAreasAction(),
        fetchPerfilesAction(),
      ]);
      if (areasRes.success) setAreas(areasRes.data);
      if (perfilesRes.success) setPerfiles(perfilesRes.data);
    };
    init();
  }, []);

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchUsuariosAction(filters, pageNum, pageSize);
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error);
          setData([]);
        }
      } catch {
        setError("Error de conexión");
        setData([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [filters, pageSize],
  );

  const handleNewClick = useCallback(() => {
    setEditUserId(null);
    setShowEditModal(true);
  }, []);

  const handleCajaClick = useCallback(() => {
    setShowCajaModal(true);
  }, []);

  const handleCajaClose = useCallback(() => {
    setShowCajaModal(false);
  }, []);

  const handleCajaSaved = useCallback(() => {
    executeSearch(page);
  }, [executeSearch, page]);

  const handleEditClick = useCallback((id: string) => {
    setEditUserId(id);
    setShowEditModal(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setShowEditModal(false);
    setEditUserId(null);
  }, []);

  const handleEditSaved = useCallback(() => {
    executeSearch(page);
  }, [executeSearch, page]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await eliminarUsuarioAction(deleteTarget);
      if (res.success) {
        setDeleteTarget(null);
        executeSearch(page);
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, executeSearch, page]);

  const handleDeleteCancel = useCallback(() => {
    if (!deleting) setDeleteTarget(null);
  }, [deleting]);

  // Initial search on mount
  useEffect(() => {
    executeSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  // ── Search Form ─────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Accent header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Código — max 7 chars */}
          <div className="md:col-span-1">
            <label htmlFor="codigo" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Código</label>
            <input id="codigo" type="text" placeholder="Código" maxLength={7}
              value={filters.codigo}
              onChange={(e) => handleFilterChange("codigo", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Nombres y Apellidos */}
          <div className="md:col-span-2">
            <label htmlFor="nombre" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Nombres y Apellidos</label>
            <input id="nombre" type="text" placeholder="Nombres"
              value={filters.nombre}
              onChange={(e) => handleFilterChange("nombre", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Usuario — max 15 chars */}
          <div className="md:col-span-1">
            <label htmlFor="usuario" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Usuario</label>
            <input id="usuario" type="text" placeholder="Usuario" maxLength={15}
              value={filters.usuario}
              onChange={(e) => handleFilterChange("usuario", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Área */}
          <div className="md:col-span-2">
            <label htmlFor="area" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Área</label>
            <select id="area" value={filters.area}
              onChange={(e) => handleFilterChange("area", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todas</option>
              {areas.map((a) => (<option key={a.area} value={a.area}>{a.nombre}</option>))}
            </select>
          </div>

          {/* Perfil */}
          <div className="md:col-span-2">
            <label htmlFor="perfil" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Perfil</label>
            <select id="perfil" value={filters.perfil}
              onChange={(e) => handleFilterChange("perfil", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              {perfiles.map((p) => (<option key={p.id_perfil} value={p.id_perfil}>{p.nombre}</option>))}
            </select>
          </div>

          {/* Estado */}
          <div className="md:col-span-1">
            <label htmlFor="estado" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Estado</label>
            <select id="estado" value={filters.estado}
              onChange={(e) => handleFilterChange("estado", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="1">Activado</option>
              <option value="0">Desactivado</option>
            </select>
          </div>

          {/* Buscar button */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button type="button" onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Buscar
            </button>
            <span className="text-[9px] text-slate-400 leading-none">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[8px] text-slate-500">↵</kbd>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Results table ───────────────────────────────────────

  const renderTableHeader = () => (
    <colgroup>
      <col className="w-[8%]" />
      <col className="w-[27%]" />
      <col className="w-[16%]" />
      <col className="w-[14%]" />
      <col className="w-[15%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
    </colgroup>
  );

  const renderTableBody = () => (
    <tbody className="divide-y divide-slate-100">
      {data.map((row, idx) => (
        <tr
          key={row.id}
          className={`transition hover:bg-slate-50 ${
            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
          }`}
        >
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
            {row.id}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
            {row.nombre}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.area}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.perfil}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-700 truncate">
            {row.usuario}
          </td>
          <td className="px-2 py-1.5">
            <StatusBadge estado={row.estado} />
          </td>
          <td className="px-2 py-1.5">
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handleEditClick(row.id)}
                className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan"
                aria-label="Editar"
                title="Editar usuario"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClick(row.id)}
                className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label="Eliminar"
                title="Eliminar usuario"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table
        className="w-full table-fixed border-collapse"
        data-testid="usuarios-grid"
        role="grid"
      >
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Código</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nombres y Apellidos</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Área</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Perfil</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Usuario</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Estado</th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acciones</th>
          </tr>
        </thead>
        {renderTableBody()}
      </table>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Users size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "usuario" : "usuarios"}
      </span>
    </div>
  );

  // ── Pagination ──────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    // Generate page numbers (show at most 5)
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          resultados
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Anterior"
          >
            <ChevronLeft size={13} />
            Anterior
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
                p === page
                  ? "bg-sat-cyan text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Siguiente"
          >
            Siguiente
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  };

  // ── Empty state ──────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <UserX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron usuarios
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Intente ajustar los filtros de búsqueda
      </p>
    </div>
  );

  // ── Error state ──────────────────────────────────────────

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button
        type="button"
        onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // ── Main render ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        {/* Dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        {/* Gloss flare */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Users size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Administración de usuarios del sistema
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info + actions */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewClick}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Plus size={14} />
              Nuevo Usuario
            </button>
            <button
              type="button"
              onClick={handleCajaClick}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98]"
            >
              <Plus size={14} />
              Nueva Caja
            </button>
            
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && initialLoading && <TableSkeleton />}

      {/* Loading overlay for subsequent searches */}
      {loading && !initialLoading && (
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
              <span className="text-xs font-medium text-slate-500">
                Buscando...
              </span>
            </div>
          </div>
          {renderGrid()}
          {renderPagination()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading && (
        renderEmptyState()
      )}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) handleDeleteCancel(); }}
          onKeyDown={(e) => { if (e.key === "Escape") handleDeleteCancel(); }}
          tabIndex={-1}
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="mb-3 rounded-full bg-red-50 p-3">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                ¿Seguro que quieres eliminar?
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-center gap-8 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="min-w-[80px] rounded-md border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : null}
                {deleting ? "Eliminando..." : "Sí"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      <UsuarioEditModal
        isOpen={showEditModal}
        userId={editUserId}
        onClose={handleEditClose}
        onSaved={handleEditSaved}
      />

      {/* Nueva Caja modal */}
      <CajaModal
        isOpen={showCajaModal}
        onClose={handleCajaClose}
        onSaved={handleCajaSaved}
      />
    </div>
  );
}
