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
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  searchFraccDetalladoAction,
  fetchFraccDetalladoCatalogosAction,
} from "@/actions/cobranza/reporte-fracc-detallado";
import type {
  FraccDetalladoRow,
  FraccDetalladoFilters,
} from "@/actions/cobranza/reporte-fracc-detallado";
import {
  useFraccDetalladoExport,
  buildTituloFraccDetallado,
} from "@/app/dashboard/cobranza/reporte-fracc-detallado/export-utils";

// Registros por página. El backend solo acepta 15 (grilla) o 100000 (exportación).

const PAGE_SIZE = 15;

// Columnas de la grilla (labels literales del reporte legado). Este array es
// el único driver de <th>, <td> y del skeleton, y su espejo WS_COLUMNS del
// export-utils está assertado por test: este repo ya se rompió dos veces por
// desincronizar ese conteo.
//
// Quedan fuera de la grilla (Decisión 1 del design): T_INSOL_CONVENIO
// (semántica ambigua frente a IMP_INSOL; el legado no la mostraba) y
// ANIO_SALDO (es constante en todas las filas: lo fija el filtro Año).

export const COLUMNAS: { header: string; key: string; money?: boolean }[] = [
  { header: "CODIGO", key: "CODIGO" },
  { header: "NOMBRE", key: "nombre" },
  { header: "ANIO_CTA", key: "ANIO_CTA" },
  { header: "CONVENIO", key: "CONVENIO" },
  { header: "FECHA CONVENIO", key: "FECHA" },
  { header: "DESCRIPCION", key: "descrip" },
  { header: "INSOLUTO", key: "IMP_INSOL", money: true },
  { header: "# CUOTAS TOTAL", key: "NUM_CUOTAS" },
  { header: "# CUOTAS PENDIENTES", key: "CUOTAS_PENDIENTES" },
  { header: "SALDO", key: "SALDO", money: true },
];

const NUM_COLS = COLUMNAS.length;

interface MesOption {
  id_mes: number;
  nom_mes: string;
}

/** Los montos llegan como number desde el SP; en la grilla van con 2 decimales. */
function celda(row: FraccDetalladoRow, col: (typeof COLUMNAS)[number]) {
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === "") return "";
  if (col.money && !Number.isNaN(Number(raw))) return Number(raw).toFixed(2);
  return String(raw);
}

function TableSkeleton() {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      data-testid="table-skeleton"
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

export default function ReporteFraccDetalladoPage() {
  // Filtros

  const [codigo, setCodigo] = useState("");
  const [anios, setAnios] = useState<string[]>([]);
  const [anno, setAnno] = useState("");
  const [meses, setMeses] = useState<MesOption[]>([]);
  const [idMes, setIdMes] = useState(0);

  // Catálogos (combos Año Corte / Mes Corte)

  const [catalogosError, setCatalogosError] = useState<string | null>(null);

  // Datos

  const [data, setData] = useState<FraccDetalladoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // El título del reporte (R6) sale de los filtros, no de las filas: funciona
  // con 0 resultados y corrige el bug del legado que exportaba el año vacío.
  const mesNombre = meses.find((m) => m.id_mes === idMes)?.nom_mes ?? "";
  const titulo =
    anno && mesNombre ? buildTituloFraccDetallado(mesNombre, anno) : "";

  // La búsqueda queda deshabilitada hasta que haya año y mes válidos (R5).
  const canSearch = anno !== "" && idMes > 0;

  const buildFilters = useCallback((): FraccDetalladoFilters => {
    return {
      // El filtro del SP es LIKE contiene y vacío = sin acotar, así que NO se
      // rellena con ceros a la izquierda: un código parcial es búsqueda válida.
      codigo: codigo.trim() || undefined,
      anno,
      idMes,
    };
  }, [codigo, anno, idMes]);

  const executeSearch = useCallback(
    async (pageNum: number, filtros: FraccDetalladoFilters) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchFraccDetalladoAction(
          filtros,
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
    [],
  );

  // Carga inicial (R5): años (@BUSC=38), meses del primer año (@BUSC=39) y
  // búsqueda automática con esos defaults, como el hermano.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const cat = await fetchFraccDetalladoCatalogosAction();
        if (cancelled) return;
        if (!cat.success) {
          setCatalogosError(cat.error ?? "Error al cargar los catálogos");
          return;
        }
        const primerAnio = cat.anios[0] ?? "";
        setAnios(cat.anios);
        setAnno(primerAnio);
        if (!primerAnio) return;

        const catMeses = await fetchFraccDetalladoCatalogosAction(primerAnio);
        if (cancelled) return;
        if (!catMeses.success) {
          setCatalogosError(catMeses.error ?? "Error al cargar los catálogos");
          return;
        }
        const primerMes = catMeses.meses[0];
        setMeses(catMeses.meses);
        if (!primerMes) return;

        setIdMes(primerMes.id_mes);
        await executeSearch(1, {
          codigo: "",
          anno: primerAnio,
          idMes: primerMes.id_mes,
        });
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar el año se refresca el combo Mes Corte (@BUSC=39 con el nuevo
  // año) y vuelve al primer mes (Decisión 5): el legado lo dejaba congelado
  // con los meses del primer año cargado.
  const handleAnioChange = async (nuevoAnio: string) => {
    setAnno(nuevoAnio);
    setCatalogosError(null);
    if (!nuevoAnio) return;
    try {
      const cat = await fetchFraccDetalladoCatalogosAction(nuevoAnio);
      const primerMes = cat.meses[0];
      setMeses(cat.meses);
      setIdMes(primerMes ? primerMes.id_mes : 0);
      if (!cat.success) {
        setCatalogosError(cat.error ?? "Error al cargar los catálogos");
      }
    } catch {
      setCatalogosError("Error de conexión con el servidor");
      setMeses([]);
      setIdMes(0);
    }
  };

  const handleSearch = () => {
    if (!canSearch) return;
    setExportError(null);
    setPage(1);
    executeSearch(1, buildFilters());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage, buildFilters());
  };

  const { exportToExcel } = useFraccDetalladoExport({
    filters: buildFilters(),
    titulo,
    setExporting,
    // Los mensajes de exportación no reemplazan la grilla: van en su propio banner.
    setError: setExportError,
  });

  // Search Form

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Criterios de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Código */}
          <div className="md:col-span-3">
            <label
              htmlFor="codigo"
              className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 leading-none"
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
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-mono text-slate-700 placeholder:text-slate-500 transition focus:border-sat-cyan focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2"
            />
          </div>

          {/* Año Corte */}
          <div className="md:col-span-3">
            <label
              htmlFor="anioCorte"
              className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 leading-none"
            >
              Año Corte
            </label>
            <select
              id="anioCorte"
              value={anno}
              onChange={(e) => void handleAnioChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={anios.length === 0}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {anios.length === 0 && <option value="">Sin años disponibles</option>}
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Mes Corte */}
          <div className="md:col-span-3">
            <label
              htmlFor="mesCorte"
              className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 leading-none"
            >
              Mes Corte
            </label>
            <select
              id="mesCorte"
              value={idMes > 0 ? String(idMes) : ""}
              onChange={(e) => setIdMes(Number(e.target.value))}
              onKeyDown={handleKeyDown}
              disabled={meses.length === 0}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {meses.length === 0 && (
                <option value="">Sin meses disponibles</option>
              )}
              {meses.map((m) => (
                <option key={m.id_mes} value={String(m.id_mes)}>
                  {m.nom_mes}
                </option>
              ))}
            </select>
          </div>

          {/* Procesar */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-sat-cyan hover:text-slate-deep focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sat-navy disabled:hover:text-white"
            >
              <Search size={12} />
              Procesar
            </button>
          </div>
        </div>

        {/* Hay que decir la semántica real de los filtros: el código se busca
            por coincidencia parcial y el vacío no acota nada. */}
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <Info size={11} className="shrink-0" />
          <span>
            El código se busca por coincidencia parcial y puede quedar vacío: en
            ese caso se listan todos los fraccionamientos del año y mes
            seleccionados.
          </span>
        </p>
      </div>
    </div>
  );

  // Pagination

  const renderPagination = () => {
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
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
          {total === 0 ? (
            "Sin resultados"
          ) : (
            <>
              Mostrando{" "}
              <span className="font-semibold text-slate-700">{from}</span>
              {" – "}
              <span className="font-semibold text-slate-700">{to}</span> de{" "}
              <span className="font-semibold text-slate-700">{total}</span>{" "}
              resultados
            </>
          )}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600"
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
              aria-current={p === page ? "page" : undefined}
              className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 ${
                p === page
                  ? "bg-sat-navy text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-sat-cyan hover:text-slate-deep"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={totalPages === 0 || page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600"
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
          className="w-full border-collapse min-w-[1100px]"
          data-testid="reporte-fracc-detallado-grid"
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
                    title={celda(row, col)}
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <FolderSearch size={13} className="text-slate-500" />
        <span>
          Se encontraron{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          {total === 1 ? "resultado" : "resultados"}
        </span>
      </div>
      <button
        type="button"
        onClick={exportToExcel}
        disabled={exporting || !canSearch}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-sat-cyan hover:text-slate-deep focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600"
      >
        <FileSpreadsheet size={13} />
        {exporting ? "Exportando..." : "Exportar a Excel"}
      </button>
    </div>
  );

  // Empty state

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron resultados
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Intente ajustar los criterios de búsqueda o verifique el código
        informado
      </p>
    </div>
  );

  // Error state

  const renderErrorState = () => (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in"
      role="alert"
    >
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-600" />
      </div>
      <p className="text-sm font-medium text-red-700">{error}</p>
      <button
        type="button"
        onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-4 py-1.5 text-xs font-medium text-white transition hover:bg-sat-cyan hover:text-slate-deep focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2"
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
              Reporte de Fraccionamientos Detallados
            </h1>
            <p className="text-xs text-white/70 font-inter">
              Listado de fraccionamientos (convenios de pago) y su estado de
              cuotas
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Catálogos caídos: sin combos válidos no hay búsqueda posible (R5) */}
      {catalogosError && (
        <div
          role="alert"
          className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <AlertCircle size={13} className="shrink-0 text-red-600" />
          <span>{catalogosError}</span>
        </div>
      )}

      {/* Título del reporte (R6): derivado de los filtros, visible incluso sin filas */}
      {titulo && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm">
          <h2
            className="text-sm font-bold tracking-wide text-sat-navy"
            data-testid="reporte-titulo"
          >
            {titulo}
          </h2>
        </div>
      )}

      {/* Mensajes de exportación: no reemplazan la grilla */}
      {exportError && (
        <div
          role="alert"
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-deep"
        >
          <Info size={13} className="shrink-0 text-slate-500" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Results info + export */}
      {!loading && !initialLoading && !error && !catalogosError && (
        renderResultsBar()
      )}

      {/* Results content */}
      {initialLoading || loading ? (
        <TableSkeleton />
      ) : error ? (
        renderErrorState()
      ) : catalogosError ? (
        <></>
      ) : data.length === 0 ? (
        renderEmptyState()
      ) : (
        renderGrid()
      )}

      {/* Paginación de 15; en vacío los controles quedan deshabilitados (R2/R3) */}
      {!loading && !initialLoading && !error && !catalogosError && (
        renderPagination()
      )}
    </div>
  );
}
