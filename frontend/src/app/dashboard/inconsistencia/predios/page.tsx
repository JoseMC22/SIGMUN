"use client";

import { useCallback, useEffect, useState } from "react";
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
const GRID_PAGE_SIZE = 20;

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

  // ── Búsqueda ───────────────────────────────────────────

  const runSearch = useCallback(
    async (activeFilters: InconsistenciaPrediosFilters, pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchInconsistenciasAction(
          activeFilters,
          pageNum,
          pageSize,
        );
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
        setError("Error de conexión");
        setData([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
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

  // ── Carga inicial (combos + primera búsqueda) ──────────

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [tiposRes, usosRes] = await Promise.all([
        getTiposInconsistenciaAction(),
        getUsosPredioAction(),
      ]);
      if (cancelled) return;

      const tiposData = tiposRes.success ? tiposRes.data : [];
      if (tiposRes.success) setTipos(tiposRes.data);
      if (usosRes.success) setUsos(usosRes.data);

      const initialYear = new Date().getFullYear();
      const firstId = tiposData.length > 0 ? tiposData[0].id_acceso : "";
      setFilters({ idAcceso: firstId, anno: String(initialYear), uso: "" });

      if (firstId) {
        await runSearch({ idAcceso: firstId, anno: initialYear }, 1);
      } else {
        setInitialLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [runSearch]);

  // ── Handlers ───────────────────────────────────────────

  const handleFilterChange = (field: keyof PrediosFilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    executeSearch(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

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
      />

      {/* Info de resultados */}
      {!loading && !error && !initialLoading && data.length > 0 && (
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

      {/* Error */}
      {!loading && error && (
        <PrediosErrorState message={error} onRetry={handleSearch} />
      )}

      {/* Vacío */}
      {!loading && !error && data.length === 0 && !initialLoading && (
        <PrediosEmptyState />
      )}

      {/* Con datos */}
      {!loading && !error && data.length > 0 && (
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
