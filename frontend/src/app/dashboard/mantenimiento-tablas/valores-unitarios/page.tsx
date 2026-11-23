"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  AlertCircle,
  RotateCcw,
  Calendar,
  DollarSign,
  Plus,
  Loader2,
} from "lucide-react";
import ConfirmDeleteModal from "./components/confirm-delete-modal";
import ValorUnitarioFormModal from "./components/valor-unitario-form-modal";
import ValoresUnitariosBulkModal from "./components/valores-unitarios-bulk-modal";
import ValoresUnitariosGrid from "./components/valores-unitarios-grid";
import { ValorUnitarioRow } from "./types";

const BASE = "/api/mantenimiento-tablas/valores-unitarios";
const FIRST_YEAR = 1992;

function fallbackYears(): string[] {
  const last = new Date().getFullYear() + 1;
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, index) =>
    String(last - index),
  );
}

export default function ValoresUnitariosPage() {
  const currentYear = String(new Date().getFullYear());

  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [data, setData] = useState<ValorUnitarioRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [formMode, setFormMode] = useState<"bulk" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<ValorUnitarioRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ValorUnitarioRow | null>(null);

  const executeSearch = useCallback(async (anno: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch(`${BASE}?anno=${encodeURIComponent(anno)}`);
      if (!res.ok) throw new Error("Error al buscar");
      const json = (await res.json()) as { data?: ValorUnitarioRow[] };
      setData(Array.isArray(json.data) ? json.data : []);
    } catch {
      setData([]);
      setError("Error de conexión");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadYearsAndSearch = async () => {
      let available = fallbackYears();
      try {
        const res = await fetch(`${BASE}/years`);
        if (!res.ok) throw new Error("Error al cargar años");
        const json = (await res.json()) as { years?: unknown };
        if (Array.isArray(json.years) && json.years.length > 0) {
          available = json.years.map(String);
        }
      } catch {
        // El fallback mantiene la página operativa si /years no responde.
      }

      if (!mounted) return;
      setYears(available);
      const initial = available[0] ?? currentYear;
      setSelectedYear(initial);
      await executeSearch(initial);
    };

    void loadYearsAndSearch();
    return () => {
      mounted = false;
    };
  }, [currentYear, executeSearch]);

  const handleMutationSuccess = () => {
    setFormMode(null);
    setEditRow(null);
    void executeSearch(selectedYear);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    const { region, anno, codi } = deleteRow;
    const url = `${BASE}/${encodeURIComponent(region)}/${encodeURIComponent(
      anno,
    )}/${encodeURIComponent(codi)}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        setError(
          res.status === 404
            ? "No se encontró la fila"
            : "Error al eliminar el registro",
        );
      } else {
        await executeSearch(selectedYear);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setDeleteRow(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-sat-navy/90 to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
            <DollarSign size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-outfit text-lg font-bold tracking-tight text-white">
              Valores unitarios
            </h1>
            <p className="font-inter text-xs text-white/50">
              Mantenimiento de valores por año, región y código
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
          <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Consulta de valores unitarios
          </span>
        </div>
        <div className="p-2.5">
          <div className="flex items-end gap-2">
            <div className="w-48">
              <label
                htmlFor="anno-select"
                className="mb-0.5 block text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400"
              >
                Año
              </label>
              <select
                id="anno-select"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void executeSearch(selectedYear)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-50"
            >
              <Search size={12} />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {hasSearched && !loading && !error && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setFormMode("bulk")}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            <Plus size={14} />
            Nuevo valor
          </button>
        </div>
      )}

      {loading && initialLoading && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex animate-pulse items-center justify-center p-8">
            <Loader2 size={16} className="mr-2 animate-spin text-sat-cyan" />
            <span className="text-xs text-slate-400">Cargando...</span>
          </div>
        </div>
      )}

      {loading && !initialLoading && (
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <Loader2 size={16} className="animate-spin text-sat-cyan" />
              <span className="text-xs font-medium text-slate-500">
                Buscando...
              </span>
            </div>
          </div>
          <ValoresUnitariosGrid
            data={data}
            onEdit={(row) => {
              setEditRow(row);
              setFormMode("edit");
            }}
            onDelete={setDeleteRow}
          />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
          <div className="mb-3 rounded-full bg-red-100 p-3">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void executeSearch(selectedYear)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
          >
            <RotateCcw size={13} />
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && hasSearched && data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
          <div className="mb-3 rounded-full bg-slate-100 p-3">
            <Calendar size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            No se encontraron valores para el año {selectedYear}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Use «Nuevo valor» para agregar un registro.
          </p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <ValoresUnitariosGrid
          data={data}
          onEdit={(row) => {
            setEditRow(row);
            setFormMode("edit");
          }}
          onDelete={setDeleteRow}
        />
      )}

      {formMode === "bulk" && (
        <ValoresUnitariosBulkModal
          isOpen
          defaultAnno={selectedYear}
          endpoint={BASE}
          onClose={() => setFormMode(null)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {formMode === "edit" && (
        <ValorUnitarioFormModal
          isOpen
          mode="edit"
          row={editRow}
          endpoint={BASE}
          onClose={() => {
            setFormMode(null);
            setEditRow(null);
          }}
          onSuccess={handleMutationSuccess}
        />
      )}

      <ConfirmDeleteModal
        isOpen={deleteRow !== null}
        row={deleteRow}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  );
}
