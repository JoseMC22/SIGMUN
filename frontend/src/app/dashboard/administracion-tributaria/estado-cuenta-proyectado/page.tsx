"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CabeceraProyectado,
  CatalogosProyectado,
  ContribuyenteProyectadoRow,
  ContribuyentesProyectadosFilters,
  DetalleEstadoCuentaFilters,
  DetalleReciboProyectado,
  ReciboEmitidoProyectado,
  TipoBusquedaProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import {
  consultarDetalleProyectadoAction,
  getCabeceraProyectadaAction,
  getCatalogosProyectadoAction,
  getRecibosProyectadoAction,
  searchContribuyentesProyectadosAction,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";
import EstadoCuentaProyectadoView from "./estado-cuenta-proyectado-view";
import EstadoCuentaProyectadoDetalleView from "./estado-cuenta-proyectado-detalle-view";

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

interface DetalleCarga {
  cabecera: CabeceraProyectado;
  catalogos: CatalogosProyectado;
  recibos: ReciboEmitidoProyectado[];
}

/** Read-only detail route: loads the catalog data, then queries on demand. */
function EstadoCuentaProyectadoDetalle({
  codigo,
  onClose,
}: {
  codigo: string;
  onClose: () => void;
}) {
  const [carga, setCarga] = useState<DetalleCarga | null>(null);
  const [detalle, setDetalle] = useState<DetalleReciboProyectado[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load(): Promise<string | null> {
      try {
        const cabecera = await getCabeceraProyectadaAction(codigo);
        if (!cabecera.success) return cabecera.message;
        const catalogos = await getCatalogosProyectadoAction(codigo);
        if (!catalogos.success) return catalogos.message;
        const recibos = await getRecibosProyectadoAction(codigo);
        if (!recibos.success) return recibos.message;
        if (active) {
          setCarga({
            cabecera: cabecera.data,
            catalogos: catalogos.data,
            recibos: recibos.data,
          });
        }
        return null;
      } catch {
        return "Error de conexión";
      }
    }

    void load().then((message) => {
      if (!active) return;
      if (message) setError(message);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [codigo]);

  const handleMostrar = useCallback(
    (filters: DetalleEstadoCuentaFilters) => {
      setError(null);
      setProcesando(true);
      void consultarDetalleProyectadoAction(codigo, filters)
        .then((result) => {
          if (result.success) {
            setDetalle(result.data);
          } else {
            setError(result.message);
          }
        })
        .catch(() => setError("Error de conexión"))
        .finally(() => setProcesando(false));
    },
    [codigo],
  );

  if (!carga) {
    if (!loading && error) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-sat-amber/40 bg-sat-amber/10 px-4 py-3 font-inter text-sm text-sat-navy"
        >
          {error}
        </div>
      );
    }
    return (
      <div role="status" className="py-12 text-center font-inter text-xs text-sat-navy/70">
        Cargando estado de cuenta...
      </div>
    );
  }

  return (
    <EstadoCuentaProyectadoDetalleView
      codigo={codigo}
      cabecera={carga.cabecera}
      catalogos={carga.catalogos}
      recibos={carga.recibos}
      detalle={detalle}
      error={error}
      procesando={procesando}
      onMostrar={handleMostrar}
      onClose={onClose}
    />
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

  const handleCloseDetalle = useCallback(() => {
    router.push(DESTINATION_PATH);
  }, [router]);

  if (codigoDestino) {
    return (
      <EstadoCuentaProyectadoDetalle
        codigo={codigoDestino}
        onClose={handleCloseDetalle}
      />
    );
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
