"use client";

import { useCallback, useState } from "react";
import {
  searchConsultaPrediosAction,
  type ConsultaPrediosFilters,
  type ConsultaPrediosRow,
} from "@/actions/administracion-tributaria/consulta-predios";
import ConsultaPrediosView from "./consulta-predios-view";

const PAGE_SIZE = 20;
const CODIGO_LENGTH = 7;

/** Porta js_consultapred.js L39-52: padding a 7 cifras solo si es numérico. */
function padCodigo(value: string): string {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed) || trimmed.length >= CODIGO_LENGTH) return trimmed;
  return "0".repeat(CODIGO_LENGTH - trimmed.length) + trimmed;
}

function buildInitialFilters(): ConsultaPrediosFilters {
  return {
    codigo: "",
    codPred: "",
    anno: String(new Date().getFullYear()),
    codVia: "",
    urbBus: "",
    nro: "",
    dpto: "",
    mza: "",
    lte: "",
    sublote: "",
  };
}

export default function ConsultaPrediosPage() {
  const [filters, setFilters] = useState<ConsultaPrediosFilters>(buildInitialFilters);
  // Estado del flag de pisos: T05 consumirá este valor para el XLS (16/33 columnas).
  const [mostrarPisos, setMostrarPisos] = useState(false);
  const [rows, setRows] = useState<ConsultaPrediosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const handleFilterChange = useCallback(
    (field: keyof ConsultaPrediosFilters, value: string) => {
      setFilters((previous) => ({
        ...previous,
        [field]: field === "codigo" ? value.toUpperCase() : value,
      }));
    },
    [],
  );

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
        const result = await searchConsultaPrediosAction(
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

  return (
    <ConsultaPrediosView
      filters={filters}
      onFilterChange={handleFilterChange}
      onCodigoBlur={handleCodigoBlur}
      onSearch={handleSearch}
      mostrarPisos={mostrarPisos}
      onMostrarPisosChange={setMostrarPisos}
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
