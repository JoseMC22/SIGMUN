"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Calculator,
  Play,
  Loader2,
  SearchX,
  AlertCircle,
  RotateCcw,
  FileDown,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  searchCuadreCajaAction,
  type CuadreCajaRow,
} from "@/actions/tesoreria/cuadre-caja";

// ─── Helpers ────────────────────────────────────────────────

// Fecha de hoy en YYYY-MM-DD: default del filtro y de la auto-consulta.
const TODAY = new Date().toISOString().split("T")[0];

// Importes con separador de miles y 2 decimales fijos (es-PE), prefijo "S/".
const formatCurrency = (value: number) =>
  Number(value ?? 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Fecha YYYY-MM-DD → DD/MM/YYYY para el caption del header de Resultados.
const formatFecha = (fecha: string) => {
  if (!fecha) return "";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ─── Fila etiqueta → importe de una distribución ────────────

interface FilaDistribucionProps {
  label: string;
  value: number;
  destacada?: boolean;
}

function FilaDistribucion({ label, value, destacada = false }: FilaDistribucionProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={
          destacada
            ? "text-[11px] font-bold uppercase tracking-wide text-slate-700"
            : "text-xs text-slate-500"
        }
      >
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-[11px] font-medium text-slate-400">S/</span>
        <span
          className={`tabular-nums ${
            destacada ? "font-bold text-sat-navy" : "font-semibold text-slate-700"
          }`}
        >
          {formatCurrency(value)}
        </span>
      </span>
    </div>
  );
}

// ─── Tarjeta de distribución ───────────────────────────────

interface DistribucionCardProps {
  title: string;
  rows: { label: string; value: number }[];
  totalLabel: string;
  totalValue: number;
}

function DistribucionCard({ title, rows, totalLabel, totalValue }: DistribucionCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        {rows.map((row) => (
          <FilaDistribucion key={row.label} label={row.label} value={row.value} />
        ))}
        <div className="border-t border-slate-200 pt-2.5">
          <FilaDistribucion label={totalLabel} value={totalValue} destacada />
        </div>
      </div>
    </div>
  );
}

// ─── Cifra hero del Resumen General ─────────────────────────

interface HeroFigureProps {
  label: string;
  value: number;
}

function HeroFigure({ label, value }: HeroFigureProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-semibold text-slate-400">S/</span>
        <span className="font-outfit text-2xl font-bold tabular-nums text-sat-navy">
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────

function CuadreSkeleton() {
  return (
    <div className="animate-pulse" data-testid="loading-spinner">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5">
              <div className="h-2.5 w-2/5 rounded bg-slate-200" />
            </div>
            <div className="flex flex-col gap-3 px-4 py-3.5">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                  <div className="h-3.5 w-1/3 rounded bg-slate-200" />
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="h-3 w-1/4 rounded bg-slate-200" />
                <div className="h-4 w-1/3 rounded bg-slate-300" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="h-2.5 w-1/5 rounded bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 gap-5 p-5 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5">
              <div className="h-2.5 w-2/3 rounded bg-slate-100" />
              <div className="h-7 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function CuadreCajaPage() {
  const [fecha, setFecha] = useState(TODAY);
  const [data, setData] = useState<CuadreCajaRow | null>(null);
  // Fecha que produjo `data` (para subtítulos de export y caption); evita
  // exportar cifras con una fecha editada sin procesar.
  const [fechaProcesada, setFechaProcesada] = useState(TODAY);
  // Arranca cargando: la auto-consulta al montar muestra skeleton inmediato.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const exportSeq = useRef(0);

  // Derivados del fuente: otrosIng, totalGral y diferencia.
  const otrosIng = data ? data.sat100 - data.costas : 0;
  const totalGral = data ? data.total + data.sat100 : 0;
  const diferencia = data ? totalGral - data.ingreso : 0;
  const cuadra = Math.abs(diferencia) <= 0.01;

  const executeSearch = useCallback(async (fechaConsulta: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchCuadreCajaAction({ fecha: fechaConsulta });
      if (result.success) {
        setData(result.data);
        setFechaProcesada(fechaConsulta);
      } else {
        setError(result.error ?? "Error desconocido");
        setData(null);
      }
    } catch {
      setError("Error de conexión");
      setData(null);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, []);

  // Auto-consulta al montar con la fecha de hoy (comportamiento del fuente).
  useEffect(() => {
    executeSearch(TODAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProcesar = () => {
    if (!fecha) return;
    executeSearch(fecha);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && fecha) executeSearch(fecha);
  };

  // ── Exportar a Excel: tabla COMPLETA del fuente (distribución + resumen final) ──

  const exportToExcel = useCallback(async () => {
    if (!data) return;
    const token = ++exportSeq.current;
    setExporting("excel");
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const aoa: (string | number)[][] = [
        ["Cuadre de Ingresos"],
        [`Fecha de Cuadre: ${fechaProcesada}`],
        ["", "", "", ""],
        ["Concepto", "Por Tipos", "6%", "100%"],
        ["Tipo 08", data.tipo8, data.tipo8_06, ""],
        ["Tipo 09", data.tipo9, data.tipo9_06, ""],
        ["Costas", "", "", data.costas],
        ["Otros Ing", "", "", otrosIng],
        ["TOTAL", data.total, data.total_6, data.sat100],
        ["", "", "", ""],
        ["RESUMEN FINAL", "", "", ""],
        ["Total 08+09 + 100%", totalGral, "", ""],
        ["Ingreso Total", data.ingreso, "", ""],
        ["FIVI", data.fivi, "", ""],
        ["Diferencia", diferencia, "", ""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cuadre de Ingresos");
      XLSX.writeFile(wb, `cuadre-caja-${fechaProcesada}.xlsx`);
    } catch {
      if (token === exportSeq.current) setError("Error al exportar Excel");
    } finally {
      if (token === exportSeq.current) setExporting(null);
    }
  }, [data, fechaProcesada, otrosIng, totalGral, diferencia]);

  // ── Exportar a PDF: SOLO la distribución, con título y subtítulo del fuente ──

  const exportToPdf = useCallback(async () => {
    if (!data) return;
    const token = ++exportSeq.current;
    setExporting("pdf");
    setError(null);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.text("Cuadre de Ingresos", 14, 10);
      doc.text(`Fecha de Cuadre: ${fechaProcesada}`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [["Concepto", "Por Tipos", "6%", "100%"]],
        body: [
          ["Tipo 08", formatCurrency(data.tipo8), formatCurrency(data.tipo8_06), ""],
          ["Tipo 09", formatCurrency(data.tipo9), formatCurrency(data.tipo9_06), ""],
          ["Costas", "", "", formatCurrency(data.costas)],
          ["Otros Ing", "", "", formatCurrency(otrosIng)],
          [
            "TOTAL",
            formatCurrency(data.total),
            formatCurrency(data.total_6),
            formatCurrency(data.sat100),
          ],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 48, 80] },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
        },
      });
      doc.save(`cuadre-caja-${fechaProcesada}.pdf`);
    } catch {
      if (token === exportSeq.current) setError("Error al exportar PDF");
    } finally {
      if (token === exportSeq.current) setExporting(null);
    }
  }, [data, fechaProcesada, otrosIng]);

  // ── Sección 1: fecha + botón Procesar ───────────────────

  const renderSeccionConsulta = () => (
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
            <Calculator size={18} className="text-sat-cyan" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 font-outfit tracking-tight">
              Cuadre de Ingresos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-inter">
              Seleccione la fecha y presione Procesar para consultar el cuadre de caja
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Fecha
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/30"
            />
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={handleProcesar}
              disabled={loading || !fecha}
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

  // ── Distribuciones (solo con data) ───────────────────────

  const renderDistribuciones = (row: CuadreCajaRow) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <DistribucionCard
        title="Distribución por Tipos (94%)"
        rows={[
          { label: "Tipo 08", value: row.tipo8 },
          { label: "Tipo 09", value: row.tipo9 },
        ]}
        totalLabel="TOTAL TIPOS"
        totalValue={row.total}
      />
      <DistribucionCard
        title="Comisión (6%)"
        rows={[
          { label: "Tipo 08", value: row.tipo8_06 },
          { label: "Tipo 09", value: row.tipo9_06 },
        ]}
        totalLabel="TOTAL 6%"
        totalValue={row.total_6}
      />
      <DistribucionCard
        title="Distribución SAT (100%)"
        rows={[
          { label: "Costas Coactivas", value: row.costas },
          { label: "Otros Ingresos", value: otrosIng },
        ]}
        totalLabel="TOTAL 100%"
        totalValue={row.sat100}
      />
    </div>
  );

  // ── Resumen General (tarjeta destacada, punto focal de la vista) ──

  const renderResumenGeneral = (row: CuadreCajaRow) => (
    <div className="mt-3 rounded-lg border border-sat-cyan/60 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Resumen General
        </span>
      </div>
      <div className="grid grid-cols-1 items-center gap-x-6 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <HeroFigure label="SUMA TOTAL (TIPOS + 100%)" value={totalGral} />
        <HeroFigure label="INGRESO REAL EN CAJA" value={row.ingreso} />
        {/* Celda-veredicto: la diferencia es el punto focal de la vista */}
        <div
          className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center ${
            cuadra
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-red-200 bg-red-50/60"
          }`}
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            DIFERENCIA
          </span>
          <div className="flex items-center gap-1.5">
            {cuadra ? (
              <CheckCircle2 size={17} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={17} className="text-red-600" />
            )}
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xs font-semibold ${
                  cuadra ? "text-emerald-500" : "text-red-400"
                }`}
              >
                S/
              </span>
              <span
                data-testid="diferencia-valor"
                className={`font-outfit text-3xl font-bold tabular-nums ${
                  cuadra ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(diferencia)}
              </span>
            </div>
          </div>
        </div>
        <HeroFigure label="FONDO INVERSION (FIVI)" value={row.fivi} />
      </div>
    </div>
  );

  // ── Estados ──────────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontró cuadre para la fecha seleccionada
      </p>
      <p className="mt-1 text-xs text-slate-400">
        No hay movimientos de caja registrados en la fecha consultada
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
        onClick={() => executeSearch(fecha)}
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
        {!loading && !error && data && (
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 text-[11px] text-slate-500 sm:flex">
              <Calculator size={12} className="text-slate-400" />
              <span>
                Cuadre del{" "}
                <span className="font-semibold text-slate-700">
                  {formatFecha(fechaProcesada)}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "excel" ? (
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
            <button
              type="button"
              onClick={exportToPdf}
              disabled={exporting !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "pdf" ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileText size={13} className="text-sat-cyan" />
                  Exportar a PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Primera carga (o recarga sin datos previos): skeleton */}
        {loading && !data && <CuadreSkeleton />}

        {/* Error */}
        {!loading && error && renderErrorState()}

        {/* Sin cuadre para la fecha */}
        {!loading && !error && hasSearched && !data && renderEmptyState()}

        {/* Distribuciones + Resumen con datos */}
        {data && (
          <div className="relative animate-fade-in">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
                  <span className="text-xs font-medium text-slate-500">
                    Cargando...
                  </span>
                </div>
              </div>
            )}
            {renderDistribuciones(data)}
            {renderResumenGeneral(data)}
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
            <Calculator size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Cuadre de Caja
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Verificación diaria de ingresos y distribución por conceptos
            </p>
          </div>
        </div>
      </div>

      {renderSeccionConsulta()}

      {renderSeccionResultados()}
    </div>
  );
}
