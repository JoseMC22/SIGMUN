"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  SearchX,
  AlertCircle,
  RotateCcw,
  FolderSearch,
  Wallet,
  Eraser,
} from "lucide-react";
import {
  searchReportePagosAction,
} from "@/actions/tesoreria/reporte-pagos";
import type {
  ReportePagoRow,
  ReportePagosFilters,
} from "@/actions/tesoreria/reporte-pagos";

// ── Helpers ───────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const montoFormat = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMonto(value: number): string {
  return montoFormat.format(Number.isFinite(value) ? value : 0);
}

// ── Columnas (orden y títulos del legacy "Parte Diario") ──

const COLUMNS: Array<{
  key: keyof ReportePagoRow;
  label: string;
  align?: "right" | "center";
  mono?: boolean;
  className?: string;
}> = [
  { key: "recibo", label: "Recibo", mono: true },
  { key: "fecha_pago", label: "Fecha Pago", mono: true },
  { key: "clasificacion", label: "Clasificación" },
  { key: "codigo", label: "Código", mono: true },
  { key: "contribuyente", label: "Contribuyente", className: "min-w-[220px]" },
  { key: "tributo", label: "Tributo", className: "min-w-[200px]" },
  { key: "monto", label: "Monto", align: "right", mono: true },
  { key: "tipo_pago", label: "T. Pago", align: "center" },
  { key: "estado", label: "Extor", align: "center" },
];

// ── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      data-testid="loading-spinner"
    >
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-9 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-3 py-3 border-b border-slate-100">
            <div className="grid grid-cols-9 gap-4">
              {[...Array(9)].map((_, j) => (
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

// ── Main Page ────────────────────────────────────────────

export default function ReportePagosPage() {
  // ── Filters ─────────────────────────────────────────────

  const [fechaInicio, setFechaInicio] = useState(todayISO());
  const [fechaFin, setFechaFin] = useState(todayISO());
  const [recibo, setRecibo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [contribuyente, setContribuyente] = useState("");
  const [placa, setPlaca] = useState("");
  const [papeleta, setPapeleta] = useState("");
  const [talonario, setTalonario] = useState("01");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));

  // ── Data ────────────────────────────────────────────────

  const [data, setData] = useState<ReportePagoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [montoTotal, setMontoTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Construir filtros actuales ───────────────────────────

  const buildFilters = useCallback((): ReportePagosFilters => {
    return {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      recibo: recibo.trim() || undefined,
      codigo: codigo.trim() || undefined,
      contribuyente: contribuyente.trim() || undefined,
      placa: placa.trim() || undefined,
      papeleta: papeleta.trim() || undefined,
      talonario: talonario.trim() || "01",
      anio: anio.trim() || String(CURRENT_YEAR),
    };
  }, [
    fechaInicio,
    fechaFin,
    recibo,
    codigo,
    contribuyente,
    placa,
    papeleta,
    talonario,
    anio,
  ]);

  // ── executeSearch ────────────────────────────────────────

  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchReportePagosAction(buildFilters());
      if (result.success) {
        setData(result.data);
        setTotal(result.total);
        setMontoTotal(result.monto_total);
      } else {
        setError(result.error ?? "Error al consultar el reporte de pagos");
        setData([]);
        setTotal(0);
        setMontoTotal(0);
      }
    } catch {
      setError("Error de conexión");
      setData([]);
      setTotal(0);
      setMontoTotal(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [buildFilters]);

  // ── Carga inicial (el legacy autoload con fecha de hoy) ──

  useEffect(() => {
    const t = setTimeout(() => executeSearch(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") executeSearch();
  };

  const handleLimpiar = () => {
    setRecibo("");
    setCodigo("");
    setContribuyente("");
    setPlaca("");
    setPapeleta("");
    setTalonario("01");
    setAnio(String(CURRENT_YEAR));
    setFechaInicio(todayISO());
    setFechaFin(todayISO());
    setError(null);
    setData([]);
    setTotal(0);
    setMontoTotal(0);
  };

  // ── Search Form ──────────────────────────────────────────

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

  const labelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        {/* Fila 1: identificación del pago */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-3">
            <label htmlFor="recibo" className={labelClass}>
              Num. Recibo
            </label>
            <input
              id="recibo"
              type="text"
              placeholder="055000123"
              value={recibo}
              onChange={(e) => setRecibo(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="codigo" className={labelClass}>
              Código
            </label>
            <input
              id="codigo"
              type="text"
              placeholder="0234567"
              maxLength={12}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="md:col-span-4">
            <label htmlFor="contribuyente" className={labelClass}>
              Contribuyente
            </label>
            <input
              id="contribuyente"
              type="text"
              placeholder="Nombres o razón social"
              maxLength={40}
              value={contribuyente}
              onChange={(e) => setContribuyente(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="placa" className={labelClass}>
              Placa
            </label>
            <input
              id="placa"
              type="text"
              placeholder="ABC-123"
              maxLength={10}
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className={`${inputClass} font-mono uppercase`}
            />
          </div>
        </div>

        {/* Fila 2: papeleta + rango de fechas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-2">
            <label htmlFor="papeleta" className={labelClass}>
              Papeleta N°
            </label>
            <input
              id="papeleta"
              type="text"
              placeholder="088645"
              maxLength={15}
              value={papeleta}
              onChange={(e) => setPapeleta(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="talonario" className={labelClass}>
              Talon.
            </label>
            <input
              id="talonario"
              type="text"
              placeholder="01"
              maxLength={2}
              value={talonario}
              onChange={(e) => setTalonario(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="anio" className={labelClass}>
              Año
            </label>
            <input
              id="anio"
              type="text"
              placeholder={String(CURRENT_YEAR)}
              maxLength={4}
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="fechaInicio" className={labelClass}>
              Desde
            </label>
            <input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="fechaFin" className={labelClass}>
              Hasta
            </label>
            <input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={executeSearch}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Search size={12} />
              Buscar
            </button>
            <button
              type="button"
              onClick={handleLimpiar}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-sat-navy focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eraser size={12} />
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Table ───────────────────────────────────────────────

  const rowClass = (row: ReportePagoRow, idx: number): string => {
    // Precedencia del legacy: el switch de tipo_rec pisa al de tipo_operacion.
    if (row.tipo_rec === "12.23") return "bg-[#CCFF99]";
    if (row.tipo_operacion === "2") return "bg-[#D5F4FF]";
    return idx % 2 === 0 ? "bg-white" : "bg-slate-50/40";
  };

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          data-testid="reporte-pagos-grid"
          role="grid"
        >
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`text-[9px] font-semibold text-white/90 uppercase px-2 py-2 border-b border-white/5 whitespace-nowrap ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr
                key={`${row.recibo}-${idx}`}
                className={`transition hover:brightness-95 ${rowClass(row, idx)}`}
              >
                {COLUMNS.map((column) => {
                  const value = row[column.key];
                  const content =
                    column.key === "monto"
                      ? formatMonto(Number(value))
                      : String(value ?? "");
                  return (
                    <td
                      key={column.key}
                      className={`px-2 py-1.5 text-[10px] text-slate-700 ${
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                            ? "text-center"
                            : ""
                      } ${column.mono ? "font-mono" : ""} ${
                        column.key === "monto" ? "font-semibold" : ""
                      } ${column.className ?? ""}`}
                      title={String(value ?? "")}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td
                colSpan={6}
                className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Total
              </td>
              <td className="px-2 py-2 text-right text-[11px] font-bold font-mono text-sat-navy">
                {formatMonto(montoTotal)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
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
        {total === 1 ? "pago" : "pagos"}
      </span>
    </div>
  );

  // ── Empty state ──────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron pagos
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
            <Wallet
              size={18}
              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Reporte Pagos
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Parte diario de pagos — Tesorería
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500">
            Total:{" "}
            <span
              className="font-mono font-bold text-sat-navy"
              data-testid="reporte-pagos-total"
            >
              S/ {formatMonto(montoTotal)}
            </span>
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
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading && (
        renderEmptyState()
      )}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && renderGrid()}
    </div>
  );
}
