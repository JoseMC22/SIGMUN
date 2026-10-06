"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  SearchX,
  AlertCircle,
  RotateCcw,
  FolderSearch,
  LayoutGrid,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { searchFraccCuotasImpagasAction } from "@/actions/cobranza/reporte-fracc-cuotas-impagas";
import type {
  FraccCuotasImpagasRow,
} from "@/actions/cobranza/reporte-fracc-cuotas-impagas";
import { useFraccCuotasImpagasExport } from "@/app/dashboard/cobranza/reporte-fracc-cuotas-impagas/export-utils";

// Registros por página. El backend solo acepta 15 (grilla) o 100000 (exportación).

const PAGE_SIZE = 15;

// Columnas de la grilla. El conteo tiene que coincidir con los <td>, con el
// skeleton y con WS_COLUMNS del export-utils; este repo ya se rompió dos veces por
// desincronizar ese número.

const COLUMNAS: { header: string; key: string; money?: boolean }[] = [
  { header: "Código", key: "Codigo" },
  { header: "Nombre", key: "Nombre" },
  { header: "Dirección", key: "Direccion" },
  { header: "Año", key: "Año" },
  { header: "Convenio", key: "Convenio" },
  { header: "F. Convenio", key: "F.Convenio" },
  { header: "Deuda", key: "Deuda", money: true },
  { header: "C. Inicial", key: "C.Inicial", money: true },
  { header: "Cuotas", key: "Cuotas" },
  { header: "Pendientes", key: "Pendientes" },
  { header: "Vencidas", key: "Vencidas" },
  { header: "Ins. Vencido", key: "Ins Vencido", money: true },
  { header: "Mora Ven.", key: "Mora Ven", money: true },
  { header: "Estado", key: "estado_frac" },
];

const NUM_COLS = COLUMNAS.length;

function padCodigo(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  // Sin dígitos no hay código que rellenar. Devolver "" evita inventar un
  // "0000000" que el backend tomaría como una búsqueda real.
  if (!digits) return "";
  return digits.padStart(7, "0");
}

/** Los montos llegan como number; en la grilla van con 2 decimales. */
function celda(row: FraccCuotasImpagasRow, col: (typeof COLUMNAS)[number]) {
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
            style={{ gridTemplateColumns: `repeat(${NUM_COLS}, minmax(0, 1fr))` }}
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
              style={{ gridTemplateColumns: `repeat(${NUM_COLS}, minmax(0, 1fr))` }}
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

export default function ReporteFraccCuotasImpagasPage() {
  // Filtros

  const [codigo, setCodigo] = useState("");
  const [fechaCorte, setFechaCorte] = useState("");

  // Datos

  const [data, setData] = useState<FraccCuotasImpagasRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const buildFilters = useCallback(() => {
    return {
      codigo: codigo || undefined,
      fechaCorte: fechaCorte || undefined,
    };
  }, [codigo, fechaCorte]);

  const executeSearch = useCallback(
    async (pageNum: number = page) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchFraccCuotasImpagasAction(
          buildFilters(),
          pageNum,
          PAGE_SIZE,
        );
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error ?? "Error al consultar el reporte");
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
    },
    [buildFilters, page],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      executeSearch(1);
      setPage(1);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setPage(1);
      executeSearch(1);
    }
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  const { exportToExcel } = useFraccCuotasImpagasExport({
    filters: buildFilters(),
    setExporting,
    setError,
  });

  // Search Form

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Criterios de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Código */}
          <div className="md:col-span-3">
            <label
              htmlFor="codigo"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Código
            </label>
            <input
              id="codigo"
              type="text"
              placeholder="Todos"
              maxLength={7}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onBlur={(e) => {
                if (e.target.value) setCodigo(padCodigo(e.target.value));
              }}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-mono text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Fecha de corte */}
          <div className="md:col-span-3">
            <label
              htmlFor="fechaCorte"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Fecha de corte
            </label>
            <input
              id="fechaCorte"
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Procesar */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Procesar
            </button>
          </div>
        </div>

        {/* El SP no aplica la fecha de corte en esta rama: el backend la filtra
            sobre la fecha del convenio. Hay que decirlo o la grilla aparenta un
            filtrado que en realidad no hace el SP. */}
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <Info size={11} className="shrink-0" />
          <span>
            La fecha de corte acota por la fecha del convenio (F. Convenio). El
            código puede quedar vacío: en ese caso se listan todos los
            fraccionamientos.
          </span>
        </p>
      </div>
    </div>
  );

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
          className="w-full border-collapse min-w-[1500px]"
          data-testid="reporte-fracc-cuotas-impagas-grid"
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
      <p className="mt-1 text-xs text-slate-400">
        {codigo.trim() === ""
          ? "Sin código informado y sin resultados: el reporte agrupa todos los " +
            "fraccionamientos. Verifique el procedimiento almacenado."
          : "Intente ajustar los criterios de búsqueda"}
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
        onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // Main render

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
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
              Reporte de Fraccionamientos con Cuotas Impagadas
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Fraccionamientos con cuotas pendientes y vencidas
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

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