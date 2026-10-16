"use client";

// Genera Deuda — step 1: contribuyente search based on the declaración
// jurada screen, simplified to the 4 contribuyente modes (C/N/R/D) plus a
// per-row "Generar Deuda" action. Later steps will extend this page, so the
// structure mirrors the source (administracion-tributaria/declaracion-jurada)
// closely. The search reuses searchContribuyenteAction (DJ backend,
// JwtAuthGuard only).

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserX,
  AlertCircle,
  RotateCcw,
  Receipt,
  Users,
  FilePlus,
} from "lucide-react";
import { searchContribuyenteAction } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { ContribuyenteListItem } from "@/actions/administracion-tributaria/declaracion-jurada";

// ─── Types ────────────────────────────────────────────────

type TipoBusqueda = "C" | "N" | "R" | "D";

const TIPO_BUSQUEDA_OPTIONS: { value: TipoBusqueda; label: string }[] = [
  { value: "C", label: "Código" },
  { value: "N", label: "Nombre" },
  { value: "R", label: "Razón Social" },
  { value: "D", label: "Documento" },
];

// ─── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-7 gap-4">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-7 gap-4">
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-1/3" />
              <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function GeneraDeudaPage() {
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>("C");
  const [filters, setFilters] = useState({
    codigo: "",
    nombres: "",
    paterno: "",
    materno: "",
    razon: "",
    numDoc: "",
  });

  const [data, setData] = useState<ContribuyenteListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const executeSearch = useCallback(
    async (pageNum: number, overrideFilters?: typeof filters) => {
      setLoading(true);
      setError(null);
      try {
        // checkfrac se omite: el backend lo defaultea a 0 (búsqueda normal).
        const result = await searchContribuyenteAction(
          { ...(overrideFilters ?? filters), tipoBusqueda },
          pageNum,
          pageSize,
        );
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
    [filters, tipoBusqueda, pageSize],
  );

  useEffect(() => {
    executeSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTipoBusquedaChange = (value: TipoBusqueda) => {
    setTipoBusqueda(value);
    setFilters({
      codigo: "",
      nombres: "",
      paterno: "",
      materno: "",
      razon: "",
      numDoc: "",
    });
    setData([]);
    setTotal(0);
    setTotalPages(0);
    setPage(1);
    setError(null);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Contribuyente codes are always 7 digits with a leading zero ("0279126"),
  // but users type the short form ("279126"). Only 1-6 digit numeric values
  // are padded; anything else (e.g. papeleta codes starting with "P") is left
  // untouched.
  const normalizeCodigo = (value: string): string => {
    const trimmed = value.trim();
    return /^\d{1,6}$/.test(trimmed) ? trimmed.padStart(7, "0") : trimmed;
  };

  // Runs a search normalizing the codigo first; the padded value is also
  // written back so the user sees it in the input.
  const runSearch = (pageNum: number) => {
    const normalized = { ...filters, codigo: normalizeCodigo(filters.codigo) };
    if (normalized.codigo !== filters.codigo) setFilters(normalized);
    executeSearch(pageNum, normalized);
  };

  const handleSearch = () => {
    setPage(1);
    runSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  // ── Acción "Generar Deuda" por fila ──────────────────────
  // TODO: el flujo real de generación de deuda está pendiente de definición;
  // por ahora solo se muestra el placeholder estándar (mismo patrón que el
  // botón "Cargo de Notificación" de declaración jurada). Cuando se defina,
  // este handler es el seam único para conectarlo (recibe la fila completa).
  const handleGenerarDeuda = (item: ContribuyenteListItem) => {
    alert("Por desarrollar");
  };

  // ── Filter inputs by tipoBusqueda ──────────────────────

  const renderFilterInputs = () => {
    const inputClass =
      "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
    const labelClass =
      "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

    switch (tipoBusqueda) {
      case "C":
        return (
          <div className="w-[150px]">
            <label htmlFor="codigo" className={labelClass}>Código</label>
            <input
              id="codigo"
              type="text"
              placeholder="Código"
              value={filters.codigo}
              onChange={(e) => handleFilterChange("codigo", e.target.value)}
              onBlur={(e) =>
                handleFilterChange("codigo", normalizeCodigo(e.target.value))
              }
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
      case "N":
        return (
          <>
            <div className="w-[250px]">
              <label htmlFor="nombres" className={labelClass}>Nombres</label>
              <input
                id="nombres"
                type="text"
                placeholder="Nombres"
                value={filters.nombres}
                onChange={(e) => handleFilterChange("nombres", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[250px]">
              <label htmlFor="paterno" className={labelClass}>Paterno</label>
              <input
                id="paterno"
                type="text"
                placeholder="Ap. paterno"
                value={filters.paterno}
                onChange={(e) => handleFilterChange("paterno", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[250px]">
              <label htmlFor="materno" className={labelClass}>Materno</label>
              <input
                id="materno"
                type="text"
                placeholder="Ap. materno"
                value={filters.materno}
                onChange={(e) => handleFilterChange("materno", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
          </>
        );
      case "R":
        return (
          <div className="w-[350px]">
            <label htmlFor="razon" className={labelClass}>Razón Social / RUC</label>
            <input
              id="razon"
              type="text"
              placeholder="RUC o razón social"
              value={filters.razon}
              onChange={(e) => handleFilterChange("razon", e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
      case "D":
        return (
          <div className="w-[140px]">
            <label htmlFor="numDoc" className={labelClass}>Nro. Documento</label>
            <input
              id="numDoc"
              type="text"
              placeholder="DNI"
              value={filters.numDoc}
              onChange={(e) => handleFilterChange("numDoc", e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
    }
  };

  // ── Search Form ─────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="flex flex-wrap gap-2 items-end">
          {/* Tipo búsqueda select */}
          <div className="w-[130px]">
            <label htmlFor="tipoBusqueda" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Tipo Búsqueda
            </label>
            <select
              id="tipoBusqueda"
              value={tipoBusqueda}
              onChange={(e) => handleTipoBusquedaChange(e.target.value as TipoBusqueda)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {TIPO_BUSQUEDA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic filter inputs */}
          {renderFilterInputs()}

          {/* Buscar button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Buscar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Results table ───────────────────────────────────────

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table
        className="w-full table-fixed border-collapse"
        data-testid="genera-deuda-grid"
        role="grid"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
              Código
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
              T. Contribuyente
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
              Tipo/Gestor
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[20%]">
              Nombres
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
              Nro. Documento
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[16%]">
              Dirección
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, idx) => {
            const key = `${item.codigo}-${idx}`;

            return (
              <tr
                key={key}
                className={`transition hover:bg-slate-50 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                  {item.codigo}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                  {item.tipoDetalle}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                  {item.gestion}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                  {item.nombresCompletos}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                  {item.numDoc}
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                  {item.direFis}
                </td>
                <td className="px-3 py-2">
                  {/* Acción secundaria por fila: tinte sat-cyan, más callada
                      que el botón primario "Buscar" (sólido). */}
                  <button
                    type="button"
                    onClick={() => handleGenerarDeuda(item)}
                    className="inline-flex items-center gap-1 rounded-md border border-sat-cyan/30 bg-sat-cyan/5 px-2 py-1 text-[10px] font-medium text-sat-cyan transition hover:border-sat-cyan/50 hover:bg-sat-cyan/10 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
                  >
                    <FilePlus size={11} />
                    Generar Deuda
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Users size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "contribuyente" : "contribuyentes"}
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
        <UserX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron resultados
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
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Receipt
              size={18}
              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Genera Deuda
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Búsqueda de contribuyentes para la generación de deuda
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info (actions will be added in later steps) */}
      {!loading && !error && !initialLoading && (
        <div className="flex items-center justify-between">
          {data.length > 0 && renderResultsBar()}
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
    </div>
  );
}
