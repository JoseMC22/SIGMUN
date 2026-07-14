"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Key,
  SearchX,
  AlertCircle,
  RotateCcw,
  Loader2,
  FolderSearch,
} from "lucide-react";
import {
  searchAccesosAction,
  fetchMenusAction,
  fetchModulosAction,
  deleteAccesoAction,
} from "@/actions/seguridad/accesos";
import type { MenuOption, ModuloOption } from "@/actions/seguridad/accesos";
import AccesoEditModal from "./acceso-edit-modal";
import ConfirmDialog from "@/components/confirm-dialog";

// ── Types ────────────────────────────────────────────────

interface AccesoRow {
  id_acceso: string;
  orden: string;
  nombre: string;
  id_objeto: string;
  icono: string;
  doform: string;
  nestado: string;
}

// ── Tipo badge ───────────────────────────────────────────

function TipoBadge({ orden }: { orden: string }) {
  const isMenu = orden === "M";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        isMenu
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300/40"
          : "bg-purple-50 text-purple-700 ring-1 ring-purple-300/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isMenu ? "bg-blue-500" : "bg-purple-400"
        }`}
      />
      {isMenu ? "MENU" : "OBJETOS"}
    </span>
  );
}

// ── Estado badge ─────────────────────────────────────────

function EstadoBadge({ nestado }: { nestado: string }) {
  const isActive = nestado === "1";
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
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

// ── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-8 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-8 gap-4">
              {[...Array(8)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{ width: j === 0 ? "60%" : j === 3 ? "40%" : "80%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function AccesosPage() {
  // ── Filters ──────────────────────────────────────────────

  const [filters, setFilters] = useState({
    id_acceso: "",
    nombre: "",
    menu: "",
    pantalla: "",
    orden: "",
  });

  // ── Data ─────────────────────────────────────────────────

  const [data, setData] = useState<AccesoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Catálogos ────────────────────────────────────────────

  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [modulos, setModulos] = useState<ModuloOption[]>([]);
  const [modulosLoading, setModulosLoading] = useState(false);

  // ── AbortController para carrera Menú → Módulo ───────────

  const menuAbortRef = useRef<AbortController | null>(null);

  // ── Edit modal ───────────────────────────────────────────

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAccesoId, setEditAccesoId] = useState<string | null>(null);

  // ── Delete confirm dialog ───────────────────────────────

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteDialog = (id: string, nombre: string) =>
    setDeleteTarget({ id, nombre });
  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteAccesoAction(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.success) {
      executeSearch(page);
    } else {
      setError(result.error);
    }
  };

  const openEditModal = (id: string) => {
    setEditAccesoId(id);
    setEditModalOpen(true);
  };

  const openNewModal = () => {
    setEditAccesoId(null);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditAccesoId(null);
  };

  const handleSaved = () => {
    executeSearch(page);
  };

  // ── executeSearch ────────────────────────────────────────

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchAccesosAction(filters, pageNum, pageSize);
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

  // ── Initial load ─────────────────────────────────────────

  useEffect(() => {
    executeSearch(1);
    fetchMenusAction().then((res) => {
      if (res.success) setMenus(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter handlers ──────────────────────────────────────

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

  // ── Menú change handler (cascada a Módulos) ──────────────

  const handleMenuChange = (menuId: string) => {
    handleFilterChange("menu", menuId);
    handleFilterChange("pantalla", ""); // Resetea Módulo
    setModulos([]);

    if (!menuId) return;

    // Cancela petición anterior si el usuario cambia rápido
    if (menuAbortRef.current) {
      menuAbortRef.current.abort();
    }
    const controller = new AbortController();
    menuAbortRef.current = controller;

    setModulosLoading(true);
    fetchModulosAction(menuId).then((res) => {
      if (controller.signal.aborted) return;
      if (res.success) setModulos(res.data);
      setModulosLoading(false);
    });
  };

  // ── Search Form ──────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Acceso */}
          <div className="md:col-span-2">
            <label htmlFor="id_acceso" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Acceso</label>
            <input id="id_acceso" type="text" placeholder="Código de acceso"
              value={filters.id_acceso}
              onChange={(e) => handleFilterChange("id_acceso", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Nombre */}
          <div className="md:col-span-2">
            <label htmlFor="nombre" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Nombre</label>
            <input id="nombre" type="text" placeholder="Nombre del acceso"
              value={filters.nombre}
              onChange={(e) => handleFilterChange("nombre", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Menú */}
          <div className="md:col-span-3">
            <label htmlFor="menu" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Menú</label>
            <select id="menu" value={filters.menu}
              onChange={(e) => handleMenuChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              {menus.map((m) => (
                <option key={m.id_acceso} value={m.id_acceso}>
                  {m.nommenu}
                </option>
              ))}
            </select>
          </div>

          {/* Módulo */}
          <div className="md:col-span-3">
            <label htmlFor="pantalla" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Módulo</label>
            <select id="pantalla" value={filters.pantalla}
              onChange={(e) => handleFilterChange("pantalla", e.target.value)}
              disabled={modulos.length === 0 && !modulosLoading}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50"
            >
              <option value="">Todos</option>
              {modulosLoading ? (
                <option value="" disabled>Cargando...</option>
              ) : (
                modulos.map((m) => (
                  <option key={m.id_acceso} value={m.id_acceso}>
                    {m.nommenu}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Tipo */}
          <div className="md:col-span-1">
            <label htmlFor="orden" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Tipo</label>
            <select id="orden" value={filters.orden}
              onChange={(e) => handleFilterChange("orden", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="M">MENU</option>
              <option value="O">OBJETOS</option>
            </select>
          </div>

          {/* Buscar button */}
          <div className="md:col-span-1 flex items-center gap-2">
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

  // ── Table ───────────────────────────────────────────────

  const renderTableHeader = () => (
    <colgroup>
      <col className="w-[8%]" />
      <col className="w-[8%]" />
      <col className="w-[24%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[12%]" />
      <col className="w-[10%]" />
      <col className="w-[18%]" />
    </colgroup>
  );

  const renderTableBody = () => (
    <tbody className="divide-y divide-slate-100">
      {data.map((row, idx) => (
        <tr
          key={row.id_acceso}
          className={`transition hover:bg-slate-50 ${
            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
          }`}
        >
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
            {row.id_acceso}
          </td>
          <td className="px-2 py-1.5">
            <TipoBadge orden={row.orden} />
          </td>
          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
            {row.nombre}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-500 truncate">
            {row.id_objeto}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.icono}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.doform}
          </td>
          <td className="px-2 py-1.5">
            <EstadoBadge nestado={row.nestado} />
          </td>
          <td className="px-2 py-1.5">
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => openEditModal(row.id_acceso)}
                className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan"
                aria-label="Editar"
                title="Editar acceso"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => openDeleteDialog(row.id_acceso, row.nombre)}
                className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label="Eliminar"
                title="Eliminar acceso"
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
        data-testid="accesos-grid"
        role="grid"
      >
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Id Acceso</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Tipo</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nombre</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Id Objeto</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Icono</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Formulario</th>
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
      <FolderSearch size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "acceso" : "accesos"}
      </span>
    </div>
  );

  // ── Pagination ──────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
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
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron accesos
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
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Key size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Gestión de Accesos
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Administración de accesos del sistema
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
        >
          <Plus size={12} />
          Nuevo
        </button>
      </div>

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
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

      {/* Edit / New modal */}
      <AccesoEditModal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        onSaved={handleSaved}
        accesoId={editAccesoId}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Eliminar acceso"
        message={
          deleteTarget
            ? `¿Está seguro de eliminar el acceso "${deleteTarget.id}" (${deleteTarget.nombre})? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="No"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
