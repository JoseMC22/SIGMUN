"use client";

import { FileSpreadsheet, Search } from "lucide-react";
import type {
  TipoInconsistenciaOption,
  UsoPredioOption,
} from "@/actions/inconsistencia/predios";

// ── Combo de años: año vigente → 1998 (descendente) ──

const YEAR_START = 1998;

const YEARS: number[] = [];
for (let y = new Date().getFullYear(); y >= YEAR_START; y--) {
  YEARS.push(y);
}

export interface PrediosFilterValues {
  idAcceso: string;
  anno: string;
  uso: string;
}

interface PrediosFiltersProps {
  tipos: TipoInconsistenciaOption[];
  usos: UsoPredioOption[];
  filters: PrediosFilterValues;
  onFilterChange: (field: keyof PrediosFilterValues, value: string) => void;
  onSearch: () => void;
  /** Definido solo cuando la exportación client-side está disponible. */
  onExport?: () => void;
  exporting?: boolean;
}

/**
 * Sección de criterios: tipo de inconsistencia → año → tipo de uso → Buscar →
 * Exportar. El combo de uso es solo visual (no viaja al SP).
 */
export function PrediosFilters({
  tipos,
  usos,
  filters,
  onFilterChange,
  onSearch,
  onExport,
  exporting = false,
}: PrediosFiltersProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          {/* Tipo de inconsistencia */}
          <div className="md:col-span-3">
            <label
              htmlFor="tipo"
              className="mb-0.5 block text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400"
            >
              Tipo de inconsistencia
            </label>
            <select
              id="tipo"
              data-testid="control-tipo"
              aria-label="Tipo de inconsistencia"
              value={filters.idAcceso}
              onChange={(e) => onFilterChange("idAcceso", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
            >
              {tipos.length === 0 && <option value="">Seleccione...</option>}
              {tipos.map((opt) => (
                <option key={opt.id_acceso} value={opt.id_acceso}>
                  {opt.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div className="md:col-span-2">
            <label
              htmlFor="anno"
              className="mb-0.5 block text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400"
            >
              Año
            </label>
            <select
              id="anno"
              data-testid="control-anno"
              aria-label="Año"
              value={filters.anno}
              onChange={(e) => onFilterChange("anno", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de uso (solo visual) */}
          <div className="md:col-span-3">
            <label
              htmlFor="uso"
              className="mb-0.5 block text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400"
            >
              Tipo de uso
            </label>
            <select
              id="uso"
              data-testid="control-uso"
              aria-label="Tipo de uso"
              value={filters.uso}
              onChange={(e) => onFilterChange("uso", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
            >
              <option value="">Todos</option>
              {usos.map((opt) => (
                <option key={opt.id_uso} value={opt.id_uso}>
                  {opt.uso}
                </option>
              ))}
            </select>
          </div>

          {/* Buscar + Exportar */}
          <div className="flex items-center gap-2 md:col-span-4">
            <button
              type="button"
              data-testid="control-buscar"
              onClick={onSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Buscar
            </button>
            <button
              type="button"
              data-testid="control-exportar"
              onClick={onExport}
              disabled={!onExport || exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-sat-navy focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={12} />
              {exporting ? "Exportando..." : "Exportar a Excel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
