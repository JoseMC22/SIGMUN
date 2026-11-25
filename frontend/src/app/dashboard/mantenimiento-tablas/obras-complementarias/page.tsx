"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  Loader2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import ConfirmDeleteModal from "./components/confirm-delete-modal";
import ObraComplementariaFormModal from "./components/obra-complementaria-form-modal";
import ObrasComplementariasGrid from "./components/obras-complementarias-grid";
import {
  ObraComplementariaRow,
  toObraComplementariaKey,
} from "./types";

const BASE = "/api/mantenimiento-tablas/obras-complementarias";
const FIRST_YEAR = 1992;
const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2";

function fallbackYears(): string[] {
  const last = new Date().getFullYear() + 1;
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, index) =>
    String(last - index),
  );
}

export default function ObrasComplementariasPage() {
  const currentYear = String(new Date().getFullYear());
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedCateg, setSelectedCateg] = useState("");
  const [data, setData] = useState<ObraComplementariaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<ObraComplementariaRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ObraComplementariaRow | null>(null);

  const executeSearch = useCallback(async (anno: string, categ: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ anno });
      const trimmedCateg = categ.trim();
      if (trimmedCateg) {
        params.set("categ", trimmedCateg);
      }
      const res = await fetch(`${BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Error al buscar");
      const json = (await res.json()) as { data?: ObraComplementariaRow[] };
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
        // El fallback mantiene la consulta disponible si /years no responde.
      }

      if (!mounted) return;
      setYears(available);
      const initial = available[0] ?? currentYear;
      setSelectedYear(initial);
      await executeSearch(initial, "");
    };

    void loadYearsAndSearch();
    return () => {
      mounted = false;
    };
  }, [currentYear, executeSearch]);

  const handleMutationSuccess = () => {
    setFormMode(null);
    setEditRow(null);
    void executeSearch(selectedYear, selectedCateg);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    try {
      const res = await fetch(BASE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: toObraComplementariaKey(deleteRow) }),
      });
      if (!res.ok) {
        setError(
          res.status === 404
            ? "No se encontró la obra complementaria"
            : "Error al dar de baja el registro",
        );
      } else {
        await executeSearch(selectedYear, selectedCateg);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setDeleteRow(null);
    }
  };

  const openEdit = (row: ObraComplementariaRow) => {
    setEditRow(row);
    setFormMode("edit");
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg bg-sat-navy px-5 py-4 shadow-sm">
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
            <Building2 size={18} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-outfit text-lg font-bold tracking-tight text-white">
              Obras complementarias
            </h1>
            <p className="font-inter text-xs text-white/80">
              Mantenimiento de instalaciones por año y categoría
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="oc-search-title">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" aria-hidden="true" />
          <h2 id="oc-search-title" className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Consulta de obras complementarias
          </h2>
        </div>
        <form
          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void executeSearch(selectedYear, selectedCateg);
          }}
        >
          <div className="w-full sm:w-48">
            <label htmlFor="oc-filter-anno" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Año
            </label>
            <select
              id="oc-filter-anno"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className={`w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-800 ${focusClass}`}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label htmlFor="oc-filter-categ" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Categoría
            </label>
            <input
              id="oc-filter-categ"
              type="text"
              maxLength={2}
              value={selectedCateg}
              onChange={(event) => setSelectedCateg(event.target.value.toUpperCase())}
              placeholder="Todas"
              className={`w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-800 placeholder-slate-500 ${focusClass}`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !selectedYear}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-sat-navy px-4 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 ${focusClass}`}
          >
            <Search size={12} aria-hidden="true" />
            Buscar
          </button>
        </form>
      </section>

      {hasSearched && !loading && !error && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600" role="status">
            {data.length} {data.length === 1 ? "registro activo" : "registros activos"}
          </p>
          <button
            type="button"
            onClick={() => setFormMode("create")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md bg-sat-navy px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.98] ${focusClass}`}
          >
            <Plus size={14} aria-hidden="true" />
            Nueva obra
          </button>
        </div>
      )}

      {loading && initialLoading && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-center p-8 shadow-sm" role="status">
            <Loader2 size={16} className="mr-2 animate-spin text-sat-navy" aria-hidden="true" />
            <span className="text-xs text-slate-600">Cargando obras complementarias...</span>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in" role="alert">
          <div className="mb-3 rounded-full bg-red-100 p-3">
            <AlertCircle size={24} className="text-red-700" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void executeSearch(selectedYear, selectedCateg)}
            className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-red-700 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && hasSearched && data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16 animate-fade-in">
          <div className="mb-3 rounded-full bg-slate-100 p-3">
            <Calendar size={24} className="text-slate-600" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            No se encontraron obras para el año {selectedYear}
            {selectedCateg ? ` y la categoría ${selectedCateg}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Puede cambiar los filtros o registrar una nueva obra.
          </p>
        </div>
      )}

      {!initialLoading && !error && data.length > 0 && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg" role="status">
                <Loader2 size={16} className="animate-spin text-sat-navy" aria-hidden="true" />
                <span className="text-xs font-medium text-slate-700">Buscando...</span>
              </div>
            </div>
          )}
          <ObrasComplementariasGrid data={data} onEdit={openEdit} onDelete={setDeleteRow} />
        </div>
      )}

      {formMode && (
        <ObraComplementariaFormModal
          isOpen
          mode={formMode}
          row={formMode === "edit" ? editRow : null}
          defaultAnno={selectedYear}
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
