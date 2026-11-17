"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ContribuyenteProyectadoRow,
  ContribuyentesProyectadosFilters,
  TipoBusquedaProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import { searchContribuyentesProyectadosAction } from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import EstadoCuentaProyectadoView from "./estado-cuenta-proyectado-view";

const PAGE_SIZE = 20;
const CODIGO_LENGTH = 7;
const DOCUMENTO_LENGTH = 11;
const DESTINATION_PATH =
  "/dashboard/administracion-tributaria/estado-cuenta-proyectado";

const UPPERCASE_FILTERS: ReadonlySet<keyof ContribuyentesProyectadosFilters> =
  new Set([
    "criterioNombre",
    "criterioPaterno",
    "criterioMaterno",
    "criterioRazon",
  ]);
const NUMERIC_FILTERS: ReadonlySet<keyof ContribuyentesProyectadosFilters> =
  new Set(["codigo", "documento"]);

/** Porta js_Mantcontriproyec.js L246-264: padding a 7 cifras solo si es numérico. */
function padCodigo(value: string): string {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed) || trimmed.length >= CODIGO_LENGTH) return trimmed;
  return "0".repeat(CODIGO_LENGTH - trimmed.length) + trimmed;
}

function buildInitialFilters(): ContribuyentesProyectadosFilters {
  return {
    tipoBusqueda: "C",
    codigo: "",
    criterioNombre: "",
    criterioPaterno: "",
    criterioMaterno: "",
    criterioRazon: "",
    documento: "",
  };
}

/** Honest placeholder for the destination route; T04 will replace it. */
function DetalleStub({ codigo }: { codigo: string }) {
  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy to-sat-navy/70 px-5 py-4 shadow-sm">
        <h1 className="font-outfit text-lg font-bold tracking-tight text-clean-white">
          Estado de Cuenta Proyectado
        </h1>
        <p className="mt-0.5 font-inter text-xs text-clean-white/80">
          Detalle del contribuyente seleccionado
        </p>
      </header>
      <section
        className="rounded-lg border border-sat-navy/15 bg-clean-white p-5 shadow-sm"
        aria-label="Detalle pendiente"
      >
        <p className="font-inter text-xs uppercase tracking-wider text-sat-navy/70">
          Código de contribuyente
        </p>
        <p className="mt-1 font-outfit text-xl font-semibold tabular-nums text-sat-navy">
          {codigo}
        </p>
        <p className="mt-4 rounded-md border border-sat-amber/40 bg-sat-amber/10 px-4 py-3 font-inter text-sm text-sat-navy">
          El detalle del estado de cuenta proyectado se implementa en el siguiente
          work unit. No se muestran datos todavía.
        </p>
      </section>
    </div>
  );
}

function EstadoCuentaProyectadoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codigoDestino = searchParams.get("codigo");

  const [filters, setFilters] = useState<ContribuyentesProyectadosFilters>(
    buildInitialFilters,
  );
  const [rows, setRows] = useState<ContribuyenteProyectadoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const handleFilterChange = useCallback(
    (field: keyof ContribuyentesProyectadosFilters, value: string) => {
      setFilters((previous) => {
        let normalized = value;
        if (NUMERIC_FILTERS.has(field)) {
          const maxLength = field === "documento" ? DOCUMENTO_LENGTH : CODIGO_LENGTH;
          normalized = value.replace(/\D/g, "").slice(0, maxLength);
        } else if (UPPERCASE_FILTERS.has(field)) {
          normalized = value.toUpperCase();
        }
        return { ...previous, [field]: normalized };
      });
    },
    [],
  );

  const handleCriterioChange = useCallback((criterio: TipoBusquedaProyectado) => {
    setFilters((previous) => ({ ...previous, tipoBusqueda: criterio }));
  }, []);

  const handleCodigoBlur = useCallback(() => {
    setFilters((previous) => ({
      ...previous,
      codigo: padCodigo(previous.codigo),
    }));
  }, []);

  const executeSearch = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchContribuyentesProyectadosAction(
          { ...filters, codigo: padCodigo(filters.codigo) },
          targetPage,
          PAGE_SIZE,
        );
        if (result.success) {
          setRows(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setRows([]);
          setTotal(0);
          setTotalPages(0);
          setError(result.message);
        }
      } catch {
        setRows([]);
        setError("Error de conexión");
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    },
    [filters],
  );

  const handleSearch = useCallback(() => {
    setPage(1);
    void executeSearch(1);
  }, [executeSearch]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) return;
      void executeSearch(nextPage);
    },
    [executeSearch, totalPages],
  );

  const handleOpenEstadoCuenta = useCallback(
    (codigo: string) => {
      router.push(
        `${DESTINATION_PATH}?codigo=${encodeURIComponent(codigo)}`,
      );
    },
    [router],
  );

  if (codigoDestino) {
    return <DetalleStub codigo={codigoDestino} />;
  }

  return (
    <EstadoCuentaProyectadoView
      filters={filters}
      onFilterChange={handleFilterChange}
      onCriterioChange={handleCriterioChange}
      onCodigoBlur={handleCodigoBlur}
      onSearch={handleSearch}
      onOpenEstadoCuenta={handleOpenEstadoCuenta}
      rows={rows}
      loading={loading}
      error={error}
      hasSearched={hasSearched}
      page={page}
      pageSize={PAGE_SIZE}
      total={total}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  );
}

export default function EstadoCuentaProyectadoPage() {
  return (
    <Suspense fallback={<div className="p-6 font-inter text-xs text-sat-navy/70">Cargando...</div>}>
      <EstadoCuentaProyectadoPageContent />
    </Suspense>
  );
}
