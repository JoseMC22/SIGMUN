"use client";

import type { FormEvent, KeyboardEvent } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  SearchX,
} from "lucide-react";
import type {
  ContribuyenteProyectadoRow,
  ContribuyentesProyectadosFilters,
  TipoBusquedaProyectado,
} from "@/actions/administracion-tributaria/estado-cuenta-proyectado";

export interface EstadoCuentaProyectadoViewProps {
  filters: ContribuyentesProyectadosFilters;
  onFilterChange: (field: keyof ContribuyentesProyectadosFilters, value: string) => void;
  onCriterioChange: (criterio: TipoBusquedaProyectado) => void;
  onCodigoBlur: () => void;
  onSearch: () => void;
  onOpenEstadoCuenta: (codigo: string) => void;
  rows: ContribuyenteProyectadoRow[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const INPUT_CLASS =
  "h-9 w-full rounded-md border border-sat-navy/25 bg-clean-white px-2.5 font-inter text-xs text-sat-navy tabular-nums uppercase transition placeholder:text-sat-navy/70 focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/30";
const TH_CLASS =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-clean-white/90";
const TD_CLASS = "truncate px-3 py-2 text-left text-xs font-inter text-sat-navy";

const CRITERIOS: ReadonlyArray<{
  value: TipoBusquedaProyectado;
  label: string;
}> = [
  { value: "C", label: "Código" },
  { value: "N", label: "Nombres" },
  { value: "R", label: "Razón Social" },
  { value: "D", label: "Documento" },
];

interface FilterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  numeric?: boolean;
}

function FilterField({
  id,
  label,
  value,
  onChange,
  maxLength,
  onBlur,
  onKeyDown,
  numeric = false,
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
        inputMode={numeric ? "numeric" : undefined}
        pattern={numeric ? "[0-9]*" : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function formatCell(value: string): string {
  return value === "" ? "—" : value;
}

export default function EstadoCuentaProyectadoView({
  filters,
  onFilterChange,
  onCriterioChange,
  onCodigoBlur,
  onSearch,
  onOpenEstadoCuenta,
  rows,
  loading,
  error,
  hasSearched,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: EstadoCuentaProyectadoViewProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  const handleCodigoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch();
    }
  };

  const renderFiltros = () => (
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <fieldset className="lg:shrink-0">
            <legend className="sr-only">Criterio de búsqueda</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 lg:max-w-[18rem]">
              {CRITERIOS.map((criterio) => (
                <label
                  key={criterio.value}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-sat-navy/80"
                >
                  <input
                    type="radio"
                    name="tipoBusqueda"
                    value={criterio.value}
                    aria-label={`Criterio ${criterio.label}`}
                    checked={filters.tipoBusqueda === criterio.value}
                    onChange={() => onCriterioChange(criterio.value)}
                    className="h-4 w-4 border-sat-navy/25 accent-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
                  />
                  {criterio.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid flex-1 grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <div hidden={filters.tipoBusqueda !== "C"}>
              <FilterField
                id="codigo"
                label="Código de contribuyente"
                value={filters.codigo}
                maxLength={7}
                numeric
                onBlur={onCodigoBlur}
                onKeyDown={handleCodigoKeyDown}
                onChange={(value) => onFilterChange("codigo", value)}
              />
            </div>
            <div hidden={filters.tipoBusqueda !== "N"}>
              <FilterField
                id="criterioNombre"
                label="Nombres"
                value={filters.criterioNombre}
                onChange={(value) => onFilterChange("criterioNombre", value)}
              />
            </div>
            <div hidden={filters.tipoBusqueda !== "N"}>
              <FilterField
                id="criterioPaterno"
                label="Apellido Paterno"
                value={filters.criterioPaterno}
                onChange={(value) => onFilterChange("criterioPaterno", value)}
              />
            </div>
            <div hidden={filters.tipoBusqueda !== "N"}>
              <FilterField
                id="criterioMaterno"
                label="Apellido Materno"
                value={filters.criterioMaterno}
                onChange={(value) => onFilterChange("criterioMaterno", value)}
              />
            </div>
            <div hidden={filters.tipoBusqueda !== "R"}>
              <FilterField
                id="criterioRazon"
                label="Razón Social"
                value={filters.criterioRazon}
                onChange={(value) => onFilterChange("criterioRazon", value)}
              />
            </div>
            <div hidden={filters.tipoBusqueda !== "D"}>
              <FilterField
                id="documento"
                label="Nro. Documento"
                value={filters.documento}
                maxLength={11}
                numeric
                onChange={(value) => onFilterChange("documento", value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-2 text-xs font-semibold text-sat-navy shadow-sm transition hover:bg-sat-cyan/90 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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

  const renderGrid = () => (
    <div className="animate-fade-in overflow-x-auto rounded-lg border border-sat-navy/15 bg-clean-white">
      <table
        role="grid"
        aria-label="Resultados de búsqueda de contribuyentes"
        className="w-full min-w-[760px] table-fixed border-collapse"
      >
        <colgroup>
          <col className="w-[60px]" />
          <col />
          <col className="w-[105px]" />
          <col />
          <col className="w-[82px]" />
        </colgroup>
        <thead className="bg-gradient-to-r from-sat-navy to-sat-navy/80">
          <tr>
            <th scope="col" className={TH_CLASS}>Código</th>
            <th scope="col" className={TH_CLASS}>Nombres</th>
            <th scope="col" className={TH_CLASS}>Nro. Documento</th>
            <th scope="col" className={TH_CLASS}>Dirección</th>
            <th scope="col" className={TH_CLASS}>Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sat-navy/10">
          {rows.map((row, index) => (
            <tr
              key={`${row.codigo}-${index}`}
              className="transition hover:bg-sat-navy/5"
            >
              <td className={`${TD_CLASS} tabular-nums`}>{formatCell(row.codigo)}</td>
              <td className={TD_CLASS}>{formatCell(row.nombres)}</td>
              <td className={`${TD_CLASS} tabular-nums`}>{formatCell(row.documento)}</td>
              <td className={TD_CLASS}>{formatCell(row.direccion)}</td>
              <td className={TD_CLASS}>
                <button
                  type="button"
                  aria-label="Estado de Cuenta"
                  title="Estado de Cuenta Proyectado"
                  onClick={() => onOpenEstadoCuenta(row.codigo)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md border border-sat-navy/15 px-2 py-1 text-xs font-medium text-sat-navy/80 transition hover:bg-sat-navy/5 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
                >
                  <FileText size={13} aria-hidden="true" />
                  Ver
                </button>
              </td>
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
    for (let number = startPage; number <= endPage; number += 1) pages.push(number);

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
          <nav aria-label="Paginación de contribuyentes" className="flex items-center gap-1">
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
    if (loading && !hasSearched) {
      return (
        <div role="status" className="py-12 text-center">
          <span className="sr-only">Cargando contribuyentes...</span>
          <Loader2 size={24} className="mx-auto animate-spin text-sat-cyan" aria-hidden="true" />
        </div>
      );
    }
    if (!loading && error) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-lg border border-sat-amber/40 bg-sat-amber/10 py-12"
        >
          <AlertCircle size={24} className="text-sat-navy" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-sat-navy">{error}</p>
        </div>
      );
    }
    if (!loading && !error && !hasSearched) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sat-navy/15 bg-clean-white py-12">
          <Search size={24} className="text-sat-cyan" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-sat-navy/80">
            Presione Buscar para consultar los contribuyentes
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
            No se encontraron contribuyentes
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
          Estado de Cuenta Proyectado
        </h1>
        <p className="mt-0.5 font-inter text-xs text-clean-white/80">
          Búsqueda de contribuyentes por código, nombres, razón social o documento
        </p>
      </header>

      {renderFiltros()}

      <section
        className="rounded-lg border border-sat-navy/15 bg-clean-white p-2.5 shadow-sm"
        aria-label="Resultados"
      >
        {renderResults()}
      </section>
    </div>
  );
}
