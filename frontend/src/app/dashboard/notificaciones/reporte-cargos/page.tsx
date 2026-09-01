"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  SearchX,
  AlertCircle,
  RotateCcw,
  FolderSearch,
  LayoutGrid,
  FileDown,
  FileSpreadsheet,
  Loader2,
  CalendarRange,
  Hash,
  ChevronDown,
} from "lucide-react";
import {
  listarTiposValorAction,
  searchReporteCargosAction,
} from "@/actions/notificaciones/reporte-cargos";
import type {
  ReporteCargosRow,
  TipoValorOption,
  ReporteCargosMode,
} from "@/actions/notificaciones/reporte-cargos";
import { useReporteCargosExport } from "@/app/dashboard/notificaciones/reporte-cargos/export-utils";

// ── Year range (para el combo de año del modo Tipo de Valor) ──

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: number[] = [];
for (let y = CURRENT_YEAR; y >= 1998; y--) {
  YEARS.push(y);
}

// ── Pad num_valor a 7 dígitos con ceros a la izquierda ──

function padNumValor(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.padStart(7, "0");
}

// ── Fecha de hoy en formato YYYY-MM-DD (para el input date default) ──

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
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
          <div key={i} className="px-3 py-3 border-b border-slate-100">
            <div className="grid grid-cols-8 gap-4">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-3.5 bg-slate-100 rounded" style={{ width: "80%" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function ReporteCargosPage() {
  // ── Modo de búsqueda ───────────────────────────────────

  const [mode, setMode] = useState<ReporteCargosMode>("fecha");

  // ── Filters ─────────────────────────────────────────────

  const [idValor, setIdValor] = useState("");
  const [numValor, setNumValor] = useState("");
  const [anoValor, setAnoValor] = useState(String(CURRENT_YEAR));
  const [fechaInicio, setFechaInicio] = useState(todayISO());
  const [fechaFin, setFechaFin] = useState(todayISO());

  // ── Combo tipos de valor ────────────────────────────────

  const [tiposValor, setTiposValor] = useState<TipoValorOption[]>([]);

  // ── Data ─────────────────────────────────────────────────

  const [data, setData] = useState<ReporteCargosRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Cargar combo de tipos de valor al montar ────────────

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await listarTiposValorAction();
      if (active && result.success) {
        setTiposValor(result.data);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── Construir filtros actuales ───────────────────────────

  const buildFilters = useCallback(() => {
    if (mode === "tipo_valor") {
      const selected = tiposValor.find((t) => t.id_valor === idValor);
      return {
        mode: "tipo_valor" as ReporteCargosMode,
        id_valor: idValor || undefined,
        nom_valor: selected?.nomb_val,
        num_valor: numValor ? padNumValor(numValor) : undefined,
        ano_valor: anoValor,
        fecha_inicio: undefined,
        fecha_fin: undefined,
      };
    }
    return {
      mode: "fecha" as ReporteCargosMode,
      id_valor: undefined,
      nom_valor: undefined,
      num_valor: undefined,
      ano_valor: undefined,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    };
  }, [mode, idValor, numValor, anoValor, fechaInicio, fechaFin, tiposValor]);

  // ── executeSearch ────────────────────────────────────────

  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchReporteCargosAction(buildFilters());
      if (result.success) {
        setData(result.data);
        setTotal(result.total);
      } else {
        setError(result.error ?? "Error al consultar el reporte");
        setData([]);
        setTotal(0);
      }
    } catch {
      setError("Error de conexión");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [buildFilters]);

  // ── Initial load ─────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => executeSearch(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") executeSearch();
  };

  const handleModeChange = (nextMode: ReporteCargosMode) => {
    setMode(nextMode);
    setError(null);
    setData([]);
    setTotal(0);
  };

  // ── Export helpers ───────────────────────────────────────

  const { exportToExcel, exportToPdf } = useReporteCargosExport({
    filters: buildFilters(),
    setExporting,
    setError,
  });

  // ── Search Form ──────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      {/* Modo de búsqueda */}
      <div className="px-2.5 pt-2.5">
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => handleModeChange("tipo_valor")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              mode === "tipo_valor"
                ? "bg-sat-cyan text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Hash size={12} />
            Por Tipo de Valor
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("fecha")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              mode === "fecha"
                ? "bg-sat-cyan text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <CalendarRange size={12} />
            Por Rango de Fechas
          </button>
        </div>
      </div>

      <div className="p-2.5">
        {mode === "tipo_valor" ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {/* Tipo de Valor */}
            <div className="md:col-span-4">
              <label htmlFor="idValor" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Tipo de Valor</label>
              <div className="relative">
                <select id="idValor" aria-label="Tipo de Valor" value={idValor}
                  onChange={(e) => setIdValor(e.target.value)}
                  className="w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1.5 pr-8 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                >
                  <option value="">Seleccione...</option>
                  {tiposValor.map((t) => (
                    <option key={t.id_valor} value={t.id_valor}>
                      {t.nomb_val}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* N° de Valor */}
            <div className="md:col-span-3">
              <label htmlFor="numValor" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">N° Valor</label>
              <input id="numValor" type="text" placeholder="0000000"
                maxLength={7}
                value={numValor}
                onChange={(e) => setNumValor(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) setNumValor(padNumValor(e.target.value));
                }}
                onKeyDown={handleKeyDown}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-mono text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Año */}
            <div className="md:col-span-3">
              <label htmlFor="anoValor" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Año</label>
              <select id="anoValor" aria-label="Año" value={anoValor}
                onChange={(e) => setAnoValor(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Buscar */}
            <div className="md:col-span-2 flex items-center gap-2">
              <button type="button" onClick={executeSearch}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
              >
                <Search size={12} />
                Buscar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {/* Fecha inicio */}
            <div className="md:col-span-4">
              <label htmlFor="fechaInicio" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Fecha Inicio</label>
              <input id="fechaInicio" type="date" value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Fecha fin */}
            <div className="md:col-span-4">
              <label htmlFor="fechaFin" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Fecha Fin</label>
              <input id="fechaFin" type="date" value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Buscar */}
            <div className="md:col-span-4 flex items-center gap-2">
              <button type="button" onClick={executeSearch}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
              >
                <Search size={12} />
                Buscar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Table ───────────────────────────────────────────────

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" data-testid="reporte-cargos-grid" role="grid">
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              {headers.map((h) => (
                <th key={h} className="text-left text-[9px] font-semibold text-white/90 uppercase px-2 py-2 border-b border-white/5 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                {headers.map((h) => (
                  <td key={h} className="px-2 py-1.5 text-[10px] text-slate-600 truncate">
                    {String(row[h] ?? "")}
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

  // ── Empty state ──────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">No se encontraron resultados</p>
      <p className="mt-1 text-xs text-slate-400">Intente ajustar los filtros de búsqueda</p>
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
        onClick={executeSearch}
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
            <LayoutGrid size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">Reporte de Cargos</h1>
            <p className="text-xs text-white/50 font-inter">Consulta de cargos de notificación</p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportToExcel} disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-sat-navy focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              {exporting ? "Exportando..." : "Excel"}
            </button>
            <button type="button" onClick={exportToPdf} disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              {exporting ? "Exportando..." : "PDF"}
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
              <span className="text-xs font-medium text-slate-500">Buscando...</span>
            </div>
          </div>
          {renderGrid()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading && renderEmptyState()}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && renderGrid()}
    </div>
  );
}
