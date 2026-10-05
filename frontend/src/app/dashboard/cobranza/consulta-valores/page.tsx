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
import { searchConsultaValoresAction } from "@/actions/cobranza/consulta-valores";
import type { ConsultaValoresRow } from "@/actions/cobranza/consulta-valores";
import { useConsultaValoresExport } from "@/app/dashboard/cobranza/consulta-valores/export-utils";

// Registros por página. El backend solo acepta 15 (grilla) o 100000 (exportación).

const PAGE_SIZE = 15;

// Columnas de la grilla. El conteo tiene que coincidir con los <td>, con el
// skeleton y con WS_COLUMNS del export-utils.

const COLUMNAS: { header: string; key: string; money?: boolean }[] = [
  { header: "Código", key: "codigo" },
  { header: "Nombre", key: "nombre" },
  { header: "Tipo Valor", key: "nomb_val" },
  { header: "Nro Valor", key: "num_val" },
  { header: "Año", key: "ano_val" },
  { header: "Monto Total", key: "MontoTotal", money: true },
  { header: "F. Valor", key: "fec_val" },
  { header: "Id Valor", key: "id_valor" },
  { header: "Nro Exp.", key: "num_exp" },
  { header: "Año Exp.", key: "ano_exp" },
  { header: "F. Vence", key: "fec_vence" },
  { header: "Observación", key: "observacion" },
];

const NUM_COLS = COLUMNAS.length;

type TipoCriterio = "codigo" | "nombre" | "num_val";

const CRITERIOS: { value: TipoCriterio; label: string; hint: string }[] = [
  { value: "codigo", label: "Código", hint: "Exacto, 7 dígitos" },
  { value: "nombre", label: "Nombre", hint: "Parcial, trae coincidencias" },
  { value: "num_val", label: "Nro Valor", hint: "Exacto, 7 dígitos" },
];

function padCodigo(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  // Sin dígitos no hay código que rellenar. Devolver "" evita inventar un
  // "0000000" que el backend tomaría como una búsqueda real.
  if (!digits) return "";
  return digits.padStart(7, "0");
}

// Normaliza el valor según el criterio ANTES de mandarlo al SP, no solo al
// perder el foco: si se escribe y se pulsa Enter o Procesar sin tabular, el
// onBlur llega tarde (o no llega) y el SP recibiría el valor sin rellenar.
// Código y Nro Valor son exactos de 7 dígitos en el SP: sin los ceros a la
// izquierda no matchean y devuelven 0 filas.
function normalizeValor(tipo: TipoCriterio, value: string): string {
  if ((tipo === "codigo" || tipo === "num_val") && value) {
    return padCodigo(value);
  }
  return value;
}

/** Los montos llegan como number; en la grilla van con 2 decimales. */
function celda(row: ConsultaValoresRow, col: (typeof COLUMNAS)[number]) {
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

export default function ConsultaValoresPage() {
  // Criterio seleccionado (uno a la vez, por decisión del usuario) + valor.

  const [tipo, setTipo] = useState<TipoCriterio>("codigo");
  const [valor, setValor] = useState("");

  // Datos

  const [data, setData] = useState<ConsultaValoresRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const buildFilters = useCallback(() => {
    // Solo viaja lleno el criterio elegido; los otros dos van vacíos y el SP
    // los ignora. Si llegaran dos llenos, el SP los combina con AND.
    // El valor se normaliza acá (no solo en onBlur) para que el SP siempre
    // reciba los 7 dígitos aunque no se haya perdido el foco antes de buscar.
    const v = normalizeValor(tipo, valor);
    return {
      codigo: tipo === "codigo" ? v || undefined : undefined,
      nombre: tipo === "nombre" ? v || undefined : undefined,
      numVal: tipo === "num_val" ? v || undefined : undefined,
    };
  }, [tipo, valor]);

  const executeSearch = useCallback(
    async (pageNum: number = page) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchConsultaValoresAction(
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
          setError(result.error ?? "Error al consultar los valores");
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

  const handleTipoChange = (nuevo: TipoCriterio) => {
    setTipo(nuevo);
    setValor("");
    setPage(1);
  };

  const handleBlurPad = () => {
    // Reflejo visual del mismo normalizeValor que se aplica al buscar.
    if (valor) setValor(normalizeValor(tipo, valor));
  };

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

  const { exportToExcel } = useConsultaValoresExport({
    filters: buildFilters(),
    setExporting,
    setError,
  });

  const criterioActual = CRITERIOS.find((c) => c.value === tipo)!;

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
          {/* Selector de criterio */}
          <div className="md:col-span-4">
            <label
              htmlFor="tipoCriterio"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Buscar por
            </label>
            <select
              id="tipoCriterio"
              value={tipo}
              onChange={(e) => handleTipoChange(e.target.value as TipoCriterio)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {CRITERIOS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Valor del criterio */}
          <div className="md:col-span-4">
            <label
              htmlFor="valor"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              {criterioActual.label}
            </label>
            <input
              id="valor"
              type="text"
              placeholder={
                tipo === "nombre" ? "Nombre parcial..." : "Todos"
              }
              maxLength={tipo === "nombre" ? 200 : 7}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={handleBlurPad}
              onKeyDown={handleKeyDown}
              className={`w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none ${
                tipo === "nombre" ? "" : "font-mono"
              }`}
            />
          </div>

          {/* Procesar */}
          <div className="md:col-span-4 flex items-center gap-2">
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

        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <Info size={11} className="shrink-0" />
          <span>
            {tipo === "codigo" &&
              "El código es exacto: un parcial no trae resultados. Vacío lista todos los valores."}
            {tipo === "nombre" &&
              "El nombre es parcial: trae todo lo que contenga el texto. Vacío lista todos los valores."}
            {tipo === "num_val" &&
              "El nro de valor es exacto (no es documento de identidad). Vacío lista todos los valores."}
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
          data-testid="consulta-valores-grid"
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
        Intente ajustar los criterios de búsqueda
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
              Consulta de Valores
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Valores por código, nombre o número de valor
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
