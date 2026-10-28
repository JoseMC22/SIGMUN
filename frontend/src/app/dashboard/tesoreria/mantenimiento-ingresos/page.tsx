"use client";

import { useState, useCallback, useRef } from "react";
import {
  Wallet,
  Play,
  Loader2,
  SearchX,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileDown,
} from "lucide-react";
import {
  searchMantenimientoIngresosAction,
  type MantenimientoIngresoRow,
  type CriterioBusqueda,
} from "@/actions/tesoreria/mantenimiento-ingresos";

// ─── Helpers ────────────────────────────────────────────────

// Tope de filas de la re-consulta de exportación (igual al pageSize que maneja la vista).
const EXPORT_MAX_ROWS = 100000;

// Formatea importes con separador de miles (es-PE) y hasta 2 decimales; 0 → "0".
const formatNumber = (value: number) =>
  Number(value ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 2 });

// ─── Columnas de la tabla ──────────────────────────────────

interface ColumnDef {
  key: keyof MantenimientoIngresoRow;
  label: string;
  align?: "left" | "right";
  mono?: boolean;
  numeric?: boolean;
  strong?: boolean;
}

const columns: ColumnDef[] = [
  { key: "codigo", label: "Código", mono: true },
  { key: "concepto", label: "Concepto" },
  { key: "partida", label: "Partida", mono: true },
  { key: "nombre", label: "Gerencia" },
  { key: "ftefin", label: "Rubro", mono: true },
  { key: "valor", label: "Valor", align: "right", numeric: true, strong: true },
];

const cellText = (row: MantenimientoIngresoRow, col: ColumnDef) => {
  if (col.numeric) {
    return formatNumber((row[col.key] as unknown as number) ?? 0);
  }
  const text = String((row[col.key] as unknown as string) ?? "");
  return text || "—";
};

// ─── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid="loading-spinner">
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
                  style={{ width: j === 1 ? "50%" : "65%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Criterios de búsqueda ────────────────────────────────

const CRITERIOS: { value: CriterioBusqueda; label: string; hint: string }[] = [
  { value: "C", label: "Código", hint: "Ej. 0001" },
  { value: "N", label: "Nombre", hint: "Ej. Alquiler de fincas" },
];

// ─── Main Page ────────────────────────────────────────────

export default function MantenimientoIngresosPage() {
  // Criterio seleccionado (uno a la vez) + valor.
  const [criterio, setCriterio] = useState<CriterioBusqueda>("C");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<MantenimientoIngresoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportSeq = useRef(0);

  const executeSearch = useCallback(
    async (pageNum: number, crit?: CriterioBusqueda, val?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchMantenimientoIngresosAction({
          criterio: crit ?? criterio,
          valor: val ?? valor,
          page: pageNum,
          pageSize,
        });
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error ?? "Error desconocido");
          setData([]);
        }
      } catch {
        setError("Error de conexión");
        setData([]);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    },
    [criterio, valor, pageSize],
  );

  const handleProcesar = () => {
    setPage(1);
    executeSearch(1, criterio, valor);
  };

  const handleCriterioChange = (nuevo: CriterioBusqueda) => {
    setCriterio(nuevo);
    setValor("");
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setPage(1);
      executeSearch(1, criterio, valor);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  // ── Exportar a Excel: re-consulta el listado COMPLETO (no la página visible) ──

  const exportToExcel = useCallback(async () => {
    const token = ++exportSeq.current;
    setExporting(true);
    setError(null);
    try {
      const result = await searchMantenimientoIngresosAction({
        criterio,
        valor,
        page: 1,
        pageSize: EXPORT_MAX_ROWS,
      });
      if (!result.success) throw new Error(result.error ?? "Error al exportar Excel");
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        result.data.map((r) => ({
          "Código": r.codigo,
          "Concepto": r.concepto,
          "Partida": r.partida,
          "Gerencia": r.nombre,
          "Rubro": r.ftefin,
          "Valor": r.valor,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clasificador de Ingresos");
      XLSX.writeFile(wb, `mantenimiento-ingresos-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      if (token === exportSeq.current) setError("Error al exportar Excel");
    } finally {
      if (token === exportSeq.current) setExporting(false);
    }
  }, [criterio, valor]);

  // ── Sección 1: filtros + botón Procesar ───────────────────

  const renderSeccionProcesar = () => (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Consulta
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sat-cyan/10">
            <Wallet size={18} className="text-sat-cyan" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 font-outfit tracking-tight">
              Clasificador de Ingresos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-inter">
              Seleccione el criterio, ingrese el valor y presione Procesar para consultar el clasificador
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Criterio
            </span>
            <select
              value={criterio}
              onChange={(e) => handleCriterioChange(e.target.value as CriterioBusqueda)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/30"
            >
              {CRITERIOS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Valor
            </span>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={CRITERIOS.find((c) => c.value === criterio)?.hint}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/30"
            />
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={handleProcesar}
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Procesar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tabla de resultados ──────────────────────────────────

  const renderGrid = () => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 animate-fade-in">
      <table
        className="w-full min-w-[1200px] table-fixed border-collapse"
        role="grid"
        data-testid="mi-grid"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={`${row.codigo}-${idx}`}
              className={`transition hover:bg-slate-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-[11px] truncate ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${col.mono ? "font-mono " : ""}${
                    col.strong ? "font-semibold text-slate-700" : "text-slate-600"
                  }`}
                >
                  {cellText(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Footer de registros + paginación ────────────────────

  const renderFooter = () => {
    if (data.length === 0) return null;

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
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-2">
        <span className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          resultados
        </span>

        {totalPages > 1 && (
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
        )}
      </div>
    );
  };

  // ── Estados ──────────────────────────────────────────────

  const renderInitialState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-sat-cyan/10 p-3">
        <Play size={24} className="text-sat-cyan" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        Presione Procesar para consultar el clasificador
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Se mostrarán los ingresos según los filtros ingresados
      </p>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron ingresos
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Ajuste los filtros y vuelva a procesar
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button
        type="button"
        onClick={() => executeSearch(page)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // ── Sección 2: resultados ────────────────────────────────

  const renderSeccionResultados = () => (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Resultados
          </span>
        </div>
        {!loading && !error && hasSearched && data.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Wallet size={12} className="text-slate-400" />
              <span>
                Se encontraron{" "}
                <span className="font-semibold text-slate-700">{total}</span>{" "}
                {total === 1 ? "ingreso" : "ingresos"}
              </span>
            </div>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown size={13} className="text-sat-cyan" />
                  Exportar a Excel
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-2.5">
        {/* Primer procesamiento: skeleton */}
        {loading && !hasSearched && <TableSkeleton />}

        {/* Carga posterior (reintento / paginación) sin datos previos */}
        {loading && hasSearched && data.length === 0 && <TableSkeleton />}

        {/* Error */}
        {!loading && error && renderErrorState()}

        {/* Estado inicial: aún no se procesó */}
        {!loading && !error && !hasSearched && renderInitialState()}

        {/* Sin resultados */}
        {!loading && !error && hasSearched && data.length === 0 && renderEmptyState()}

        {/* Tabla + footer con datos */}
        {data.length > 0 && (
          <div className="relative animate-fade-in">
            {loading && hasSearched && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
                  <span className="text-xs font-medium text-slate-500">
                    Cargando...
                  </span>
                </div>
              </div>
            )}
            {renderGrid()}
            {renderFooter()}
          </div>
        )}
      </div>
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
            <Wallet size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Mantenimiento de Ingresos
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Reporteador del clasificador de ingresos
            </p>
          </div>
        </div>
      </div>

      {renderSeccionProcesar()}

      {renderSeccionResultados()}
    </div>
  );
}
