"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SearchX,
  AlertCircle,
  RotateCcw,
  FolderSearch,
  LayoutGrid,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { searchAnularValorAction } from "@/actions/cobranza/anular-valor";
import type { AnularValorRow } from "@/actions/cobranza/anular-valor";
import { useAnularValorExport } from "@/app/dashboard/cobranza/anular-valor/export-utils";

// Registros por página. El backend solo acepta 15 (grilla) o 100000 (exportación).

const PAGE_SIZE = 15;

// Columnas de la grilla (espejo de maestro-contribuyentes, 16). El conteo tiene
// que coincidir con los <td>, con el skeleton y con WS_COLUMNS del export-utils.

const COLUMNAS: { header: string; key: string; money?: boolean }[] = [
  { header: "Código", key: "codigo" },
  { header: "Nombre", key: "nombre" },
  { header: "Dirección", key: "direccion" },
  { header: "Junta", key: "junta" },
  { header: "DNI", key: "dni" },
  { header: "Correo", key: "correo" },
  { header: "Id Vía", key: "idVia" },
  { header: "Teléfono", key: "telefono1" },
  { header: "Base Imponible", key: "baseImponible", money: true },
  { header: "Inafecto", key: "inafecto", money: true },
  { header: "Categoría", key: "categoria" },
  { header: "Gestor", key: "gestor" },
  { header: "Imp. Anual", key: "impAnual", money: true },
  { header: "Imp. Trime.", key: "impTrime", money: true },
  { header: "Costo Emi.", key: "costoEmi", money: true },
  { header: "Imp. Total", key: "impTotal", money: true },
];

const NUM_COLS = COLUMNAS.length;

/** Los montos llegan como number; en la grilla van con 2 decimales. */
function celda(row: AnularValorRow, col: (typeof COLUMNAS)[number]) {
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === "") return "";
  if (col.money && !Number.isNaN(Number(raw))) return Number(raw).toFixed(2);
  return String(raw);
}

function TableSkeleton() {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      data-testid="loading-spinner"
    >
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${NUM_COLS}, minmax(0, 1fr))`,
            }}
          >
            {[...Array(NUM_COLS)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-3 py-1 border-b border-slate-100">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${NUM_COLS}, minmax(0, 1fr))`,
              }}
            >
              {[...Array(NUM_COLS)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{ width: "80%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnularValorPage() {
  // Datos (fase 1: sin filtros, se listan todos al cargar).

  const [data, setData] = useState<AnularValorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const executeSearch = useCallback(async (pageNum: number = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchAnularValorAction(pageNum, PAGE_SIZE);
      if (result.success) {
        setData(result.data);
        setTotal(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } else {
        setError(result.error ?? "Error al consultar los contribuyentes");
        setData([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch {
      setError("Error de conexión con el servidor");
      setData([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      executeSearch(1);
      setPage(1);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  const handleRetry = () => {
    setPage(1);
    executeSearch(1);
  };

  const { exportToExcel } = useAnularValorExport({
    setExporting,
    setError,
  });

  // Pagination

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
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

  // Table

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse min-w-[1800px]"
          data-testid="anular-valor-grid"
          role="grid"
        >
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              {COLUMNAS.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-[9px] font-semibold text-white/90 uppercase px-2 py-2 border-b border-white/5 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={`transition hover:bg-slate-50 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                {COLUMNAS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2 py-1 text-[10px] truncate ${
                      col.money
                        ? "text-right font-mono text-slate-700"
                        : "text-slate-600"
                    }`}
                  >
                    {celda(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <FolderSearch size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "resultado" : "resultados"}
      </span>
    </div>
  );

  // Empty state

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron resultados
      </p>
    </div>
  );

  // Error state

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // Main render (fase 1: solo listado, sin acciones de anulación).

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
            <LayoutGrid
              size={18}
              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Anular Valor
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Listado de contribuyentes
            </p>
          </div>
        </div>
      </div>

      {/* Results info + export buttons */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting || total === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-sat-navy focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={13} />
              )}
              {exporting ? "Exportando..." : "Exportar a Excel"}
            </button>
          </div>
        </div>
      )}

      {/* Results content */}
      {initialLoading || loading ? (
        <TableSkeleton />
      ) : error ? (
        renderErrorState()
      ) : data.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}
    </div>
  );
}
