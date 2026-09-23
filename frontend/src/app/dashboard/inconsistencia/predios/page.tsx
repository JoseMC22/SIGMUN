"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTiposInconsistenciaAction,
  getUsosPredioAction,
  searchInconsistenciasAction,
} from "@/actions/inconsistencia/predios";
import type {
  InconsistenciaPrediosFilters,
  PredioInconsistenciaRow,
  TipoInconsistenciaOption,
  UsoPredioOption,
} from "@/actions/inconsistencia/predios";
import { PrediosFilters } from "./components/predios-filters";
import type { PrediosFilterValues } from "./components/predios-filters";
import {
  PrediosEmptyState,
  PrediosErrorState,
  PrediosGrid,
  PrediosResultsBar,
  TableSkeleton,
} from "./components/predios-table";
import { PrediosPagination } from "./components/predios-pagination";
import { PrediosHeader } from "./components/predios-header";

/** Filas por página de la grilla (fijo). */
const GRID_PAGE_SIZE = 10;
/** Tope de filas de la re-consulta de exportación (igual al DTO del backend). */
const EXPORT_MAX_ROWS = 100000;

export default function InconsistenciaPrediosPage() {
  const [filters, setFilters] = useState<PrediosFilterValues>({
    idAcceso: "",
    anno: "",
    uso: "",
  });

  const [data, setData] = useState<PredioInconsistenciaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(GRID_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tipos, setTipos] = useState<TipoInconsistenciaOption[]>([]);
  const [usos, setUsos] = useState<UsoPredioOption[]>([]);
  const [exporting, setExporting] = useState(false);
  // Fallo de combos durante el bootstrap → estado de error con Reintentar que
  // re-ejecuta TODO el bootstrap (combos + primera búsqueda), nunca un search suelto.
  const [combosError, setCombosError] = useState<string | null>(null);
  // Combos cargaron pero no hay tipos → mensaje honesto, no el vacío de búsqueda.
  const [noTipos, setNoTipos] = useState(false);

  // Guarda de respuestas obsoletas: cada búsqueda/export captura un token; si al
  // resolver ya no es el último, la respuesta se ignora (una respuesta lenta vieja
  // nunca sobrescribe resultados más nuevos).
  const searchSeq = useRef(0);
  const exportSeq = useRef(0);
  // Filtros de la ÚLTIMA búsqueda efectuada: la exportación usa estos (los que la
  // grilla muestra), no los del combo si el usuario los editó sin buscar.
  const lastSearchedFilters = useRef<InconsistenciaPrediosFilters | null>(null);

  // ── Búsqueda ───────────────────────────────────────────

  const runSearch = useCallback(
    async (activeFilters: InconsistenciaPrediosFilters, pageNum: number) => {
      const token = ++searchSeq.current;
      lastSearchedFilters.current = activeFilters;
      setLoading(true);
      setError(null);
      try {
        const result = await searchInconsistenciasAction(
          activeFilters,
          pageNum,
          pageSize,
        );
        if (token !== searchSeq.current) return; // respuesta obsoleta → ignorar
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
        if (token !== searchSeq.current) return;
        setError("Error de conexión");
        setData([]);
      } finally {
        if (token === searchSeq.current) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    },
    [pageSize],
  );

  const executeSearch = useCallback(
    (pageNum: number) =>
      runSearch(
        { idAcceso: filters.idAcceso, anno: Number(filters.anno) },
        pageNum,
      ),
    [filters, runSearch],
  );

  // ── Bootstrap (combos + primera búsqueda) ──────────────

  const runBootstrap = useCallback(async () => {
    setCombosError(null);
    setNoTipos(false);
    setInitialLoading(true);
    setError(null);

    const [tiposRes, usosRes] = await Promise.all([
      getTiposInconsistenciaAction(),
      getUsosPredioAction(),
    ]);

    if (!tiposRes.success) {
      setCombosError(tiposRes.error);
      setInitialLoading(false);
      return;
    }
    if (!usosRes.success) {
      setCombosError(usosRes.error);
      setInitialLoading(false);
      return;
    }

    setTipos(tiposRes.data);
    setUsos(usosRes.data);

    const initialYear = new Date().getFullYear();
    const firstId = tiposRes.data.length > 0 ? tiposRes.data[0].id_acceso : "";
    setFilters({ idAcceso: firstId, anno: String(initialYear), uso: "" });

    if (firstId) {
      await runSearch({ idAcceso: firstId, anno: initialYear }, 1);
    } else {
      setNoTipos(true);
      setInitialLoading(false);
    }
  }, [runSearch]);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  // ── Handlers ───────────────────────────────────────────

  const handleFilterChange = (field: keyof PrediosFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    executeSearch(1);
  };

  const handleCombosRetry = () => {
    runBootstrap();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  // ── Exportación a Excel (client-side) ──────────────────

  /**
   * Re-consulta el filtro COMPLETO (no la página visible) para exportar todos
   * los registros que cumplen el filtro de la ÚLTIMA búsqueda (lo que la grilla
   * muestra), no los del combo si el usuario los editó sin buscar.
   */
  const fetchAllFilteredRecords = useCallback(
    async (exportFilters: InconsistenciaPrediosFilters): Promise<
      PredioInconsistenciaRow[]
    > => {
      const result = await searchInconsistenciasAction(
        exportFilters,
        1,
        EXPORT_MAX_ROWS,
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    [],
  );

  const exportToExcel = useCallback(async () => {
    const token = ++exportSeq.current;
    const exportFilters =
      lastSearchedFilters.current ?? {
        idAcceso: filters.idAcceso,
        anno: Number(filters.anno) || new Date().getFullYear(),
      };
    setExporting(true);
    setError(null);
    try {
      const allData = await fetchAllFilteredRecords(exportFilters);
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        allData.map((r) => ({
          "Código": r.codigo,
          "Nombre": r.nombre,
          "Cód. Pred": r.cod_pred,
          "Anexo": r.anexo,
          "Sub Anexo": r.sub_anexo,
          "Dirección": r.direcion,
          "Uso": r.uso,
          "Área Terreno": r.area_terreno,
          "% Propiedad": r.porcen_propiedad,
          "Val. Terreno": r.val_total_terreno,
          "Val. Constru.": r.val_total_constru,
          "Total Autoavalúo": r.total_autoavaluo,
          "ROW": r.ROW,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inconsistencia de Predios");
      XLSX.writeFile(
        wb,
        `inconsistencia-predios-${exportFilters.anno}-${exportFilters.idAcceso}.xlsx`,
      );
    } catch {
      if (token === exportSeq.current) setError("Error al exportar Excel");
    } finally {
      if (token === exportSeq.current) setExporting(false);
    }
  }, [fetchAllFilteredRecords, filters]);

  // ── Render principal ───────────────────────────────────

  return (
    <div className="space-y-4">
      <PrediosHeader />

      <PrediosFilters
        tipos={tipos}
        usos={usos}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onExport={exportToExcel}
        exporting={exporting}
      />

      {/* Info de resultados */}
      {!loading && !error && !combosError && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          <PrediosResultsBar total={total} />
        </div>
      )}

      {/* Loading */}
      {loading && initialLoading && <TableSkeleton />}

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
          <PrediosGrid data={data} />
          <PrediosPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Error de combos — Reintentar re-ejecuta TODO el bootstrap */}
      {!loading && combosError && (
        <PrediosErrorState message={combosError} onRetry={handleCombosRetry} />
      )}

      {/* Combos cargados sin tipos — mensaje honesto, no el vacío de búsqueda */}
      {!loading && !combosError && noTipos && (
        <PrediosEmptyState
          title="No hay tipos de inconsistencia disponibles"
          hint="Revise la configuración de los accesos 30.01.x"
        />
      )}

      {/* Error de búsqueda */}
      {!loading && !combosError && error && (
        <PrediosErrorState message={error} onRetry={handleSearch} />
      )}

      {/* Vacío */}
      {!loading && !error && !combosError && !noTipos && data.length === 0 && !initialLoading && (
        <PrediosEmptyState />
      )}

      {/* Con datos */}
      {!loading && !error && !combosError && !noTipos && data.length > 0 && (
        <>
          <PrediosGrid data={data} />
          <PrediosPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}