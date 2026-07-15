"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  AlertCircle,
  RotateCcw,
  Calendar,
  DollarSign,
} from "lucide-react";
import NuevoValorModal from "./components/nuevo-valor-modal";
import EditarValorModal from "./components/editar-valor-modal";
import ConfirmDeleteModal from "./components/confirm-delete-modal";

// ─── Types ─────────────────────────────────────────────

interface UitRow {
  anno: number;
  tipo: string;
  valor_uit: number;
  imp_minimo: number | null;
  imp_maximo: number | null;
  costo_emis: number;
  costo_adic: number;
  estado: string;
  row: number;
}

// ─── Helpers ───────────────────────────────────────────

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Main Page ─────────────────────────────────────────

export default function MantenimientoUitPage() {
  const currentYear = new Date().getFullYear();

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<UitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [showNuevoValorModal, setShowNuevoValorModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRow, setEditRow] = useState<UitRow | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAnno, setDeleteAnno] = useState<number | null>(null);

  // Load years from DB on mount
  useEffect(() => {
    fetch("/api/mantenimiento/uit/annos")
      .then((res) => res.json())
      .then((json) => {
        const annos = json.annos ?? [];
        setYears(annos);
        if (annos.length > 0 && !annos.includes(selectedYear)) {
          setSelectedYear(annos[0]);
        }
      })
      .catch(() => {
        // Fallback to hardcoded range if API fails
        setYears(Array.from({ length: currentYear - 1992 + 1 }, (_, i) => currentYear - i));
      });
  }, []);

  const executeSearch = useCallback(async (anno: number) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/mantenimiento/uit?anno=${anno}`);
      if (!res.ok) {
        if (res.status === 404) {
          setData([]);
          return;
        }
        throw new Error("Error al buscar");
      }
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setError("Error de conexión");
      setData([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (years.length > 0) {
      executeSearch(selectedYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years]);

  const handleSearch = () => {
    executeSearch(selectedYear);
  };

  const handleNuevoValorSaved = () => {
    setShowNuevoValorModal(false);
    executeSearch(selectedYear);
  };

  const handleDeleteClick = (anno: number) => {
    setDeleteAnno(anno);
    setShowDeleteModal(true);
  };

  const handleEditClick = (row: UitRow) => {
    setEditRow(row);
    setShowEditModal(true);
  };

  const handleEditSaved = () => {
    setShowEditModal(false);
    setEditRow(null);
    executeSearch(selectedYear);
  };

  const handleDeleteConfirm = async () => {
    if (deleteAnno === null) return;
    try {
      const res = await fetch(`/api/mantenimiento/uit/${deleteAnno}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError(`No se encontró el año ${deleteAnno}`);
        } else {
          setError("Error al eliminar");
        }
        return;
      }
      setShowDeleteModal(false);
      setDeleteAnno(null);
      executeSearch(selectedYear);
    } catch {
      setError("Error de conexión");
    }
  };

  // ── Search Form ───────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Consulta de valores UIT
        </span>
      </div>
      <div className="p-2.5">
        <div className="flex items-end gap-2">
          <div className="w-48">
            <label htmlFor="anno-select" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Año
            </label>
            <select
              id="anno-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-50"
          >
            <Search size={12} />
            Buscar
          </button>
        </div>
      </div>
    </div>
  );

  // ── Results table ─────────────────────────────────────

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table className="w-full table-fixed border-collapse" data-testid="uit-grid" role="grid">
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-white/50" />
                Año
              </div>
            </th>
            <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
              Tipo
            </th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[13%]">
              <div className="flex items-center justify-end gap-1.5">
                <DollarSign size={11} className="text-white/50" />
                Valor UIT
              </div>
            </th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
              Imp. Mínimo
            </th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
              Imp. Máximo
            </th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[11%]">
              Costo Emis.
            </th>
            <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[11%]">
              Costo Adic.
            </th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
              Estado
            </th>
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[15%]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={`${row.anno}-${idx}`}
              className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
            >
              <td className="px-3 py-2 text-[11px] font-mono text-slate-700 font-medium">
                {row.anno}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600">
                {row.tipo}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-700 font-mono text-right">
                {formatNumber(row.valor_uit)}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600 font-mono text-right">
                {formatNumber(row.imp_minimo)}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600 font-mono text-right">
                {formatNumber(row.imp_maximo)}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600 font-mono text-right">
                {formatNumber(row.costo_emis)}
              </td>
              <td className="px-3 py-2 text-[11px] text-slate-600 font-mono text-right">
                {formatNumber(row.costo_adic)}
              </td>
              <td className="px-3 py-2 text-center">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  row.estado === '1'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-600 ring-1 ring-red-200'
                }`}>
                  {row.estado === '1' ? 'Activado' : 'Desactivado'}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditClick(row)}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] font-medium text-amber-600 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 active:scale-[0.98]"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(row.anno)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400/30 active:scale-[0.98]"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Empty state ───────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <DollarSign size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron registros para el año {selectedYear}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Puede agregar un nuevo valor usando el botón superior
      </p>
    </div>
  );

  // ── Error state ───────────────────────────────────────

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button
        type="button"
        onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // ── Main render ───────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <DollarSign size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Mantenimiento UIT
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Gestión de valores de la Unidad Impositiva Tributaria
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Actions bar */}
      {hasSearched && !loading && !error && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowNuevoValorModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo valor
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && initialLoading && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="animate-pulse p-8 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent mr-2" />
            <span className="text-xs text-slate-400">Cargando...</span>
          </div>
        </div>
      )}

      {/* Loading overlay for subsequent searches */}
      {loading && !initialLoading && (
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
              <span className="text-xs font-medium text-slate-500">Buscando...</span>
            </div>
          </div>
          {renderGrid()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && hasSearched && data.length === 0 && renderEmptyState()}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && renderGrid()}

      {/* Modals */}
      <NuevoValorModal
        isOpen={showNuevoValorModal}
        onClose={() => setShowNuevoValorModal(false)}
        onSuccess={handleNuevoValorSaved}
      />
      <EditarValorModal
        isOpen={showEditModal}
        row={editRow}
        onClose={() => { setShowEditModal(false); setEditRow(null); }}
        onSuccess={handleEditSaved}
      />
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        anno={deleteAnno}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteAnno(null);
        }}
      />
    </div>
  );
}
