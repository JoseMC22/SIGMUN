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
} from "lucide-react";
import { searchConstanciaExigibilidadAction } from "@/actions/notificaciones/reporte-constancia-exigibilidad";
import type {
  ConstanciaExigibilidadRow,
} from "@/actions/notificaciones/reporte-constancia-exigibilidad";
import { useConstanciaExigibilidadExport } from "@/app/dashboard/notificaciones/reporte-constancia-exigibilidad/export-utils";

// ── Pad código a 7 dígitos con ceros a la izquierda ──

function padCodigo(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.padStart(7, "0");
}

// ── Fecha de hoy en formato YYYY-MM-DD (para los inputs date default) ──

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

export default function ReporteConstanciaExigibilidadPage() {
  // ── Filters ─────────────────────────────────────────────

  const [codigo, setCodigo] = useState("");
  const [fdesde, setFdesde] = useState(todayISO());
  const [fhasta, setFhasta] = useState(todayISO());

  // ── Data ─────────────────────────────────────────────────

  const [data, setData] = useState<ConstanciaExigibilidadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Construir filtros actuales ───────────────────────────

  const buildFilters = useCallback(() => {
    return {
      codigo: codigo || undefined,
      fdesde,
      fhasta,
    };
  }, [codigo, fdesde, fhasta]);

  // ── executeSearch ────────────────────────────────────────

  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchConstanciaExigibilidadAction(buildFilters());
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

  // ── Export helpers ───────────────────────────────────────

  const { exportToExcel, exportToPdf } = useConstanciaExigibilidadExport({
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
          Criterios de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Código */}
          <div className="md:col-span-3">
            <label htmlFor="codigo" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Código</label>
            <input id="codigo" type="text" placeholder="0000000"
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

          {/* Fecha desde */}
          <div className="md:col-span-3">
            <label htmlFor="fdesde" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Fecha Desde</label>
            <input id="fdesde" type="date" value={fdesde}
              onChange={(e) => setFdesde(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Fecha hasta */}
          <div className="md:col-span-3">
            <label htmlFor="fhasta" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Fecha Hasta</label>
            <input id="fhasta" type="date" value={fhasta}
              onChange={(e) => setFhasta(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Buscar */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button type="button" onClick={executeSearch}
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

  // ── Table ───────────────────────────────────────────────

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" data-testid="reporte-constancia-exigibilidad-grid" role="grid">
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
      <p className="mt-1 text-xs text-slate-400">Intente ajustar los criterios de búsqueda</p>
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
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">Reporte de Constancia de Exigibilidad</h1>
            <p className="text-xs text-white/50 font-inter">Consulta de constancias de exigibilidad</p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info + export buttons */}
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
