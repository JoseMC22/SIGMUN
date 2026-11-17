"use client";

import type { FormEvent, KeyboardEvent } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  SearchX,
} from "lucide-react";
import type {
  ConsultaPrediosFilters,
  ConsultaPrediosRow,
} from "@/actions/administracion-tributaria/consulta-predios";

export interface ConsultaPrediosViewProps {
  filters: ConsultaPrediosFilters;
  onFilterChange: (field: keyof ConsultaPrediosFilters, value: string) => void;
  onCodigoBlur: () => void;
  onSearch: () => void;
  mostrarPisos: boolean;
  onMostrarPisosChange: (checked: boolean) => void;
  rows: ConsultaPrediosRow[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Quince campos de datos (D8). La numeración se renderiza aparte: es UI-only
// del RowNumberer legacy y NO pertenece a ConsultaPrediosRow.
interface ColumnDef {
  key: keyof ConsultaPrediosRow;
  label: string;
  numeric?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre" },
  { key: "cod_pred", label: "Predio" },
  { key: "anexo", label: "Anexo" },
  { key: "direccion", label: "Dirección" },
  { key: "uso", label: "Uso" },
  { key: "area_terreno", label: "Área Terreno", numeric: true },
  { key: "porcen", label: "% Propiedad", numeric: true },
  { key: "t_area_const", label: "T. Área Const.", numeric: true },
  { key: "val_terreno", label: "Val. Terreno", numeric: true },
  { key: "val_constru", label: "Val. Construcción", numeric: true },
  { key: "autoavaluo", label: "Autoavalúo", numeric: true },
  { key: "id_instalas", label: "Instalaciones" },
  { key: "num_pisos", label: "N° Pisos", numeric: true },
  { key: "categoria", label: "Categoría" },
];

const TH_CLASS =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-clean-white/90";
const TD_CLASS =
  "truncate px-3 py-2 text-left text-xs font-inter text-sat-navy";
const INPUT_CLASS =
  "h-9 w-full rounded-md border border-sat-navy/25 bg-clean-white px-2.5 font-inter text-xs text-sat-navy tabular-nums transition placeholder:text-sat-navy/70 focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/30";

interface FilterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

function FilterField({
  id,
  label,
  value,
  onChange,
  maxLength,
  onBlur,
  onKeyDown,
}: FilterFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-sat-navy/70"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function formatCell(value: string | number): string {
  return value === "" ? "—" : String(value);
}

export default function ConsultaPrediosView({
  filters,
  onFilterChange,
  onCodigoBlur,
  onSearch,
  mostrarPisos,
  onMostrarPisosChange,
  rows,
  loading,
  error,
  hasSearched,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: ConsultaPrediosViewProps) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = 1998; year <= currentYear; year += 1) years.push(year);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  const handleCodigoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Evita el submit implícito del form y dispara una sola búsqueda.
      event.preventDefault();
      onSearch();
    }
  };

  const renderCriterios = () => (
    <section
      className="overflow-hidden rounded-lg border border-sat-navy/15 bg-clean-white shadow-sm"
      aria-labelledby="criterios-title"
    >
      <div className="flex items-center gap-2 border-b border-sat-navy/10 bg-gradient-to-r from-sat-navy/5 to-clean-white px-3 py-2">
        <span className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
        <h2
          id="criterios-title"
          className="text-xs font-semibold uppercase tracking-widest text-sat-navy/70"
        >
          Criterios
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <FilterField
            id="txtcodigo"
            label="Código"
            value={filters.codigo}
            maxLength={7}
            onBlur={onCodigoBlur}
            onKeyDown={handleCodigoKeyDown}
            onChange={(value) => onFilterChange("codigo", value)}
          />
          <FilterField
            id="codPred"
            label="Código de predio"
            value={filters.codPred}
            onChange={(value) => onFilterChange("codPred", value)}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor="anno"
              className="text-xs font-semibold uppercase tracking-wider text-sat-navy/70"
            >
              Año
            </label>
            <select
              id="anno"
              name="anno"
              value={filters.anno}
              onChange={(event) => onFilterChange("anno", event.target.value)}
              className={INPUT_CLASS}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <FilterField
            id="codVia"
            label="Vía"
            value={filters.codVia}
            onChange={(value) => onFilterChange("codVia", value)}
          />
          <FilterField
            id="urbBus"
            label="Urbanización"
            value={filters.urbBus}
            onChange={(value) => onFilterChange("urbBus", value)}
          />
          <FilterField
            id="nro"
            label="Número"
            value={filters.nro}
            onChange={(value) => onFilterChange("nro", value)}
          />
          <FilterField
            id="dpto"
            label="Dpto."
            value={filters.dpto}
            onChange={(value) => onFilterChange("dpto", value)}
          />
          <FilterField
            id="mza"
            label="Mza."
            value={filters.mza}
            onChange={(value) => onFilterChange("mza", value)}
          />
          <FilterField
            id="lte"
            label="Lte."
            value={filters.lte}
            onChange={(value) => onFilterChange("lte", value)}
          />
          <FilterField
            id="sublote"
            label="Sublote"
            value={filters.sublote}
            onChange={(value) => onFilterChange("sublote", value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-sat-navy/10 pt-3">
          <label
            htmlFor="mostrarPisos"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-sat-navy/80"
          >
            <input
              id="mostrarPisos"
              name="mostrarPisos"
              type="checkbox"
              checked={mostrarPisos}
              onChange={(event) => onMostrarPisosChange(event.target.checked)}
              className="h-4 w-4 rounded border-sat-navy/25 text-sat-cyan accent-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
            />
            Mostrar Pisos
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-xs font-semibold text-sat-navy shadow-sm transition hover:bg-sat-cyan/90 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Buscando...
              </>
            ) : (
              <>
                <Search size={14} aria-hidden="true" />
                Buscar
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );

  const renderSkeleton = () => (
    <div
      role="status"
      data-testid="loading-skeleton"
      className="overflow-hidden rounded-lg border border-sat-navy/15 bg-clean-white"
    >
      <span className="sr-only">Cargando predios...</span>
      <div className="animate-pulse">
        <div className="border-b border-sat-navy/15 bg-sat-navy/10 px-3 py-2.5">
          <div className="grid grid-cols-16 gap-4">
            {COLUMNS.map((column) => (
              <div
                key={column.key}
                className="h-3 w-3/4 rounded bg-sat-navy/15"
              />
            ))}
          </div>
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="border-b border-sat-navy/10 px-3 py-3 last:border-b-0">
            <div className="grid grid-cols-16 gap-4">
              {COLUMNS.map((column) => (
                <div key={column.key} className="h-3.5 rounded bg-sat-navy/10" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="animate-fade-in overflow-x-auto rounded-lg border border-sat-navy/15 bg-clean-white">
      <table
        role="grid"
        aria-label="Resultados de consulta de predios"
        className="w-full min-w-[1600px] table-fixed border-collapse"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-sat-navy/80">
          <tr>
            <th scope="col" className={`${TH_CLASS} w-12`}>
              N
            </th>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col" className={TH_CLASS}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-sat-navy/10">
          {rows.map((row, index) => (
            <tr
              key={`${row.codigo}-${index}`}
              className="transition hover:bg-sat-navy/5"
            >
              <td className={`${TD_CLASS} tabular-nums text-sat-navy/70`}>
                {(page - 1) * pageSize + index + 1}
              </td>
              {COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={`${TD_CLASS} ${
                    column.numeric ? "tabular-nums text-right" : ""
                  }`}
                >
                  {formatCell(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFooter = () => {
    if (rows.length === 0) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let number = startPage; number <= endPage; number += 1) {
      pages.push(number);
    }

    return (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sat-navy/15 bg-sat-navy/5 px-4 py-2">
        <span className="font-inter text-xs text-sat-navy/70">
          Mostrando{" "}
          <span className="font-semibold tabular-nums text-sat-navy">{from}</span>
          {" – "}
          <span className="font-semibold tabular-nums text-sat-navy">{to}</span> de{" "}
          <span className="font-semibold tabular-nums text-sat-navy">{total}</span>{" "}
          resultados
        </span>
        {totalPages > 1 && (
          <nav aria-label="Paginación de predios" className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Anterior"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-sat-navy/15 px-2.5 py-1 text-xs font-medium text-sat-navy/80 transition hover:bg-sat-navy/5 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={13} aria-hidden="true" />
              Anterior
            </button>
            {pages.map((number) => (
              <button
                key={number}
                type="button"
                aria-label={`Página ${number}`}
                aria-current={number === page ? "page" : undefined}
                onClick={() => onPageChange(number)}
                className={`min-h-9 min-w-9 rounded-md px-2 py-1 text-xs font-medium tabular-nums transition focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 ${
                  number === page
                    ? "bg-sat-cyan text-sat-navy shadow-sm"
                    : "border border-sat-navy/15 text-sat-navy/80 hover:bg-sat-navy/5"
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              aria-label="Siguiente"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-sat-navy/15 px-2.5 py-1 text-xs font-medium text-sat-navy/80 transition hover:bg-sat-navy/5 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight size={13} aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (loading && !hasSearched) return renderSkeleton();
    if (loading && rows.length === 0) return renderSkeleton();
    if (!loading && error) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-lg border border-sat-amber/40 bg-sat-amber/10 py-12"
        >
          <AlertCircle size={24} className="text-sat-navy" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-sat-navy">{error}</p>
          <button
            type="button"
            onClick={onSearch}
            className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-sat-amber px-4 py-1.5 text-xs font-medium text-sat-navy transition hover:bg-sat-amber/90 focus:outline-none focus:ring-2 focus:ring-sat-amber/50"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      );
    }
    if (!loading && !error && !hasSearched) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sat-navy/15 bg-clean-white py-12">
          <Search size={24} className="text-sat-cyan" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-sat-navy/80">
            Presione Buscar para consultar los predios
          </p>
          <p className="mt-1 font-inter text-xs text-sat-navy/70">
            Los resultados se mostrarán en la grilla
          </p>
        </div>
      );
    }
    if (!loading && !error && hasSearched && rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sat-navy/15 bg-clean-white py-12">
          <SearchX size={24} className="text-sat-navy/70" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-sat-navy/80">
            No se encontraron predios
          </p>
        </div>
      );
    }
    return (
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-clean-white/60 backdrop-blur-[1px]">
            <span className="font-inter text-xs font-medium text-sat-navy/80">
              Cargando...
            </span>
          </div>
        )}
        {renderGrid()}
        {renderFooter()}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy to-sat-navy/70 px-5 py-4 shadow-sm">
        <h1 className="font-outfit text-lg font-bold tracking-tight text-clean-white">
          Consulta de Predios
        </h1>
        <p className="mt-0.5 font-inter text-xs text-clean-white/80">
          Búsqueda de predios por código, año, vía y ubicación
        </p>
      </header>

      {renderCriterios()}

      <section
        className="rounded-lg border border-sat-navy/15 bg-clean-white p-2.5 shadow-sm"
        aria-label="Resultados"
      >
        {renderResults()}
      </section>
    </div>
  );
}
