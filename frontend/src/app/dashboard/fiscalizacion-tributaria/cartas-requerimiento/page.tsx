"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserX,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { searchCartasRequerimientoAction } from "@/actions/fiscalizacion-tributaria/cartas-requerimiento";
import ModalGenerar from "./modal-generar";

// ─── Types ────────────────────────────────────────────────

interface CartasRequerimientoRow {
  codigo: string;
  contribuyente: string;
  direccionFiscal: string;
  row: number;
}

// ─── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
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
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{ width: j === 4 ? "50%" : "80%" }}
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

export default function CartasRequerimientoPage() {
  const [searchType, setSearchType] = useState("codigo");
  const [searchValue, setSearchValue] = useState("");

  const [data, setData] = useState<CartasRequerimientoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCodigo, setSelectedCodigo] = useState("");

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const filters: Record<string, string | number | undefined> = {
          searchType,
          searchValue,
        };
        const result = await searchCartasRequerimientoAction(filters, pageNum, pageSize);
        console.log('[CartasRequerimiento] API result:', JSON.stringify(result, null, 2));
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
    [searchType, searchValue, pageSize],
  );

  // Initial search on mount
  useEffect(() => {
    executeSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleGenerar = (codigo: string, _contribuyente: string) => {
    setSelectedCodigo(codigo);
    setModalOpen(true);
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Select filter type */}
          <div className="md:col-span-2">
            <label htmlFor="searchType" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Buscar por</label>
            <select
              id="searchType"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              <option value="codigo">Código</option>
              <option value="nombre">Nombre</option>
            </select>
          </div>

          {/* Search value */}
          <div className="md:col-span-4">
            <label htmlFor="searchValue" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              {searchType === "codigo" ? "Código del contribuyente" : "Nombre del contribuyente"}
            </label>
            <input
              id="searchValue"
              type="text"
              placeholder={searchType === "codigo" ? "Buscar código" : "Buscar nombre"}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Buscar button */}
          <div className="md:col-span-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
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
      <col className="w-[15%]" />
      <col className="w-[30%]" />
      <col className="w-[35%]" />
      <col className="w-[8%]" />
      <col className="w-[12%]" />
    </colgroup>
  );

  const renderTableBody = () => (
    <tbody className="divide-y divide-slate-100">
      {data.map((row, idx) => (
        <tr
          key={row.codigo}
          className={`transition hover:bg-slate-50 ${
            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
          }`}
        >
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
            {row.codigo}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
            {row.contribuyente}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
            {row.direccionFiscal}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-500 text-center">
            {row.row}
          </td>
          <td className="px-2 py-1.5">
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handleGenerar(row.codigo, row.contribuyente)}
                className="inline-flex items-center gap-1 rounded-md border border-sat-cyan/30 bg-sat-cyan/5 px-2 py-1 text-[10px] font-medium text-sat-cyan transition hover:bg-sat-cyan/10 hover:border-sat-cyan/50"
                aria-label="Generar"
                title="Generar carta de requerimiento"
              >
                <FileText size={11} />
                Generar
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
        data-testid="cartas-grid"
        role="grid"
      >
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Código</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Contribuyente</th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Dirección Fiscal</th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">ROW</th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acción</th>
          </tr>
        </thead>
        {renderTableBody()}
      </table>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <FileText size={13} className="text-slate-400" />
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
        No se encontraron contribuyentes
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
            <FileText size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Cartas de Requerimiento
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Búsqueda de contribuyentes para generar cartas de requerimiento
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

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

      {/* Modal */}
      <ModalGenerar
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        codigo={selectedCodigo}
      />
    </div>
  );
}
