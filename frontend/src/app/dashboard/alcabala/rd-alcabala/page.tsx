"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SearchX,
  AlertCircle,
  RotateCcw,
  Receipt,
  Loader2,
  Plus,
} from "lucide-react";
import { searchContribuyenteAction, searchPendientesAction } from "@/actions/alcabala/rd-alcabala";
import type { ContribuyenteSearchItem, ContribuyenteSearchResult, PendienteAlcabalaItem, PendienteAlcabalaResult } from "@/actions/alcabala/rd-alcabala";

// ── Types ──────────────────────────────────────────────────

type ModoVista = 'pendientes' | 'contribuyentes';

// ── Crear RD Modal ────────────────────────────────────────

function CrearRDModal({
  row,
  onClose,
  modo,
}: {
  row: ContribuyenteSearchItem | PendienteAlcabalaItem;
  onClose: () => void;
  modo: ModoVista;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Backend pendiente. Aquí se enviará la solicitud de generación de RD.');
  };

  const esPendiente = modo === 'pendientes';
  const pendiente = esPendiente ? (row as PendienteAlcabalaItem) : null;
  const contribuyente = !esPendiente ? (row as ContribuyenteSearchItem) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Generar RD Alcabala"
    >
      <form
        onSubmit={handleSubmit}
        className="relative mx-4 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-3 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Generar RD Alcabala
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <span className="text-sm">✕</span>
          </button>
        </div>

        {/* Info del registro */}
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          {esPendiente && pendiente ? (
            <div className="grid grid-cols-3 gap-4 text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  Tributo
                </span>
                <p className="text-slate-800 font-medium mt-0.5 truncate">
                  {pendiente.tributo || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  Predio / Anexo
                </span>
                <p className="text-slate-800 font-medium mt-0.5 font-mono">
                  {pendiente.predio} / {pendiente.anexo}-{pendiente.subanexo}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  Período / Año
                </span>
                <p className="text-slate-800 font-medium mt-0.5 font-mono">
                  {pendiente.periodo} / {pendiente.anio}
                </p>
              </div>
            </div>
          ) : contribuyente ? (
            <div className="grid grid-cols-3 gap-4 text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  Contribuyente
                </span>
                <p className="text-slate-800 font-medium mt-0.5 truncate">
                  {[contribuyente.paterno, contribuyente.materno, contribuyente.nombres].filter(Boolean).join(' ') || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  Código
                </span>
                <p className="text-slate-800 font-medium mt-0.5 font-mono">
                  {contribuyente.codigo || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                  N° Documento
                </span>
                <p className="text-slate-800 font-medium mt-0.5 font-mono">
                  {contribuyente.numDoc || "—"}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Formulario de generación de RD */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Ejercicio / Año */}
            <div className="md:col-span-1">
              <label
                htmlFor="ejercicio"
                className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
              >
                Ejercicio / Año
              </label>
              <input
                id="ejercicio"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 2026"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Mes / Período */}
            <div className="md:col-span-1">
              <label
                htmlFor="periodo"
                className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
              >
                Mes / Período
              </label>
              <input
                id="periodo"
                type="text"
                placeholder="Ej: 07/2026"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Base imponible */}
            <div className="md:col-span-1">
              <label
                htmlFor="baseImponible"
                className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
              >
                Base imponible (S/.)
              </label>
              <input
                id="baseImponible"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Tipo de RD */}
            <div className="md:col-span-1">
              <label
                htmlFor="tipoRd"
                className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
              >
                Tipo de RD
              </label>
              <select
                id="tipoRd"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                <option value="ALCABALA">Alcabala</option>
                <option value="VEHICULAR">Vehicular</option>
                <option value="PREDIAL">Predial</option>
              </select>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label
                htmlFor="observaciones"
                className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
              >
                Observaciones
              </label>
              <textarea
                id="observaciones"
                rows={2}
                placeholder="Observaciones adicionales para la RD..."
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            <Plus size={13} />
            Generar RD
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────

function TableSkeleton({ modoVista }: { modoVista: ModoVista }) {
  const cols = modoVista === 'pendientes' ? 12 : 5;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {[...Array(cols)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {[...Array(cols)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{ width: j === 0 ? "50%" : j === cols - 1 ? "35%" : "65%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────

export default function RdAlcabalaPage() {
  const [modoVista, setModoVista] = useState<ModoVista>('pendientes');
  const [filters, setFilters] = useState({
    tipoBusqueda: 'C' as 'C' | 'N' | 'R' | 'D',
    codigo: "",
    nombres: "",
    paterno: "",
    materno: "",
    razonSocial: "",
    numDoc: "",
  });

  const [data, setData] = useState<(ContribuyenteSearchItem | PendienteAlcabalaItem)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [crearRow, setCrearRow] = useState<ContribuyenteSearchItem | PendienteAlcabalaItem | null>(null);

  // Clear fields when search criterion changes
  useEffect(() => {
    setFilters((prev) => {
      const next = { ...prev };
      switch (next.tipoBusqueda) {
        case 'C':
          next.nombres = '';
          next.paterno = '';
          next.materno = '';
          next.razonSocial = '';
          next.numDoc = '';
          break;
        case 'N':
          next.codigo = '';
          next.razonSocial = '';
          next.numDoc = '';
          break;
        case 'R':
          next.codigo = '';
          next.nombres = '';
          next.paterno = '';
          next.materno = '';
          next.numDoc = '';
          break;
        case 'D':
          next.codigo = '';
          next.nombres = '';
          next.paterno = '';
          next.materno = '';
          next.razonSocial = '';
          break;
      }
      return next;
    });
    setPage(1);
  }, [filters.tipoBusqueda]);

  const loadPendientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchPendientesAction();
      if (result.success) {
        setData(result.data as PendienteAlcabalaItem[]);
        setTotal(result.total);
        setPage(1);
        setTotalPages(1);
      } else {
        setError(result.error ?? "Error desconocido");
        setData([]);
      }
    } catch {
      setError("Error de conexión");
      setData([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  const executeSearch = useCallback(
    async (pageNum: number) => {
      if (modoVista === 'pendientes') {
        await loadPendientes();
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await searchContribuyenteAction(
          {
            tipoBusqueda: filters.tipoBusqueda,
            codigo: filters.tipoBusqueda === 'C' ? filters.codigo || undefined : undefined,
            nombres: filters.tipoBusqueda === 'N' ? filters.nombres || undefined : undefined,
            paterno: filters.tipoBusqueda === 'N' ? filters.paterno || undefined : undefined,
            materno: filters.tipoBusqueda === 'N' ? filters.materno || undefined : undefined,
            razonSocial: filters.tipoBusqueda === 'R' ? filters.razonSocial || undefined : undefined,
            numDoc: filters.tipoBusqueda === 'D' ? filters.numDoc || undefined : undefined,
          },
          pageNum,
          pageSize,
        );
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error ?? "Error desconocido");
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
    [filters, pageSize, modoVista, loadPendientes],
  );

  useEffect(() => {
    loadPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  const renderSearchForm = () => {
    const criterios = [
      { value: 'C', label: 'Código' },
      { value: 'N', label: 'Nombre' },
      { value: 'R', label: 'Razón Social' },
      { value: 'D', label: 'Documento' },
    ] as const;

    const isCodigo = filters.tipoBusqueda === 'C';
    const isNombre = filters.tipoBusqueda === 'N';
    const isRazon = filters.tipoBusqueda === 'R';
    const isDoc = filters.tipoBusqueda === 'D';

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Filtros de búsqueda
          </span>
        </div>

        <div className="p-2.5 space-y-2.5">
          {/* Criterios de búsqueda */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Criterio:
            </span>
            {criterios.map((c) => (
              <label
                key={c.value}
                className="inline-flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="radio"
                  name="tipoBusqueda"
                  value={c.value}
                  checked={filters.tipoBusqueda === c.value}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      tipoBusqueda: e.target.value as 'C' | 'N' | 'R' | 'D',
                    }))
                  }
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/30"
                />
                <span className="text-[11px] text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>

          {/* Inputs condicionales */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {isCodigo && (
              <div className="md:col-span-4">
                <label
                  htmlFor="codigo"
                  className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
                >
                  Código
                </label>
                <input
                  id="codigo"
                  type="text"
                  inputMode="numeric"
                  placeholder="Código contribuyente"
                  value={filters.codigo}
                  onChange={(e) =>
                    handleFilterChange("codigo", e.target.value.replace(/\D/g, "").slice(0, 7))
                  }
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {isNombre && (
              <>
                <div className="md:col-span-3">
                  <label
                    htmlFor="paterno"
                    className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
                  >
                    Apellido Paterno
                  </label>
                  <input
                    id="paterno"
                    type="text"
                    placeholder="PATERNO"
                    value={filters.paterno}
                    onChange={(e) =>
                      handleFilterChange("paterno", e.target.value.toUpperCase())
                    }
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3">
                  <label
                    htmlFor="materno"
                    className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
                  >
                    Apellido Materno
                  </label>
                  <input
                    id="materno"
                    type="text"
                    placeholder="MATERNO"
                    value={filters.materno}
                    onChange={(e) =>
                      handleFilterChange("materno", e.target.value.toUpperCase())
                    }
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3">
                  <label
                    htmlFor="nombres"
                    className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
                  >
                    Nombres
                  </label>
                  <input
                    id="nombres"
                    type="text"
                    placeholder="NOMBRES"
                    value={filters.nombres}
                    onChange={(e) =>
                      handleFilterChange("nombres", e.target.value.toUpperCase())
                    }
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>
              </>
            )}

            {isRazon && (
              <div className="md:col-span-4">
                <label
                  htmlFor="razonSocial"
                  className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
                >
                  Razón Social
                </label>
                <input
                  id="razonSocial"
                  type="text"
                  placeholder="RAZÓN SOCIAL"
                  value={filters.razonSocial}
                  onChange={(e) =>
                    handleFilterChange("razonSocial", e.target.value.toUpperCase())
                  }
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {isDoc && (
              <div className="md:col-span-4">
                <label
                  htmlFor="numDoc"
                  className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
                >
                  N° Documento
                </label>
                <input
                  id="numDoc"
                  type="text"
                  placeholder="Número documento"
                  value={filters.numDoc}
                  onChange={(e) => handleFilterChange("numDoc", e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 uppercase transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {/* Buscar button */}
            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
              >
                <Search size={12} />
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableHeader = () => {
    if (modoVista === 'pendientes') {
      return (
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
        </colgroup>
      );
    }

    return (
      <colgroup>
        <col className="w-[8%]" />
        <col className="w-[22%]" />
        <col className="w-[15%]" />
        <col className="w-[35%]" />
        <col className="w-[10%]" />
      </colgroup>
    );
  };

  const renderTableBody = () => {
    if (modoVista === 'pendientes') {
      const pendientes = data as PendienteAlcabalaItem[];
      return (
        <tbody className="divide-y divide-slate-100">
          {pendientes.map((row, idx) => (
            <tr
              key={row.idrecibo || `pend-${idx}`}
              className={`transition hover:bg-slate-50 ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              }`}
            >
              <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
                {row.tributo || '—'}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                {row.anio}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                {row.predio}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                {row.anexo}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
                {row.subanexo}
              </td>
              <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
                {row.periodo}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-right">
                {row.impInsol.toFixed(2)}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-right">
                {row.impReaj.toFixed(2)}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-right">
                {row.factorMora.toFixed(4)}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-right">
                {row.interes.toFixed(2)}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate text-right">
                {row.costoEmis.toFixed(2)}
              </td>
              <td className="px-2 py-1.5 text-[11px] font-mono text-slate-700 truncate text-right font-semibold">
                {row.total.toFixed(2)}
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setCrearRow(row)}
                    className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
                  >
                    <Plus size={12} />
                    Generar RD
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      );
    }

    const contribuyentes = data as ContribuyenteSearchItem[];
    return (
      <tbody className="divide-y divide-slate-100">
        {contribuyentes.map((row, idx) => (
          <tr
            key={row.row || `contrib-${idx}`}
            className={`transition hover:bg-slate-50 ${
              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
            }`}
          >
            <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
              {row.codigo}
            </td>
            <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
              {[row.paterno, row.materno, row.nombres].filter(Boolean).join(' ') || '—'}
            </td>
            <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">
              {row.numDoc}
            </td>
            <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">
              {row.direccion}
            </td>
            <td className="px-2 py-1.5">
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setCrearRow(row)}
                  className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
                >
                  <Plus size={12} />
                  Generar RD
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table className="w-full table-fixed border-collapse" role="grid">
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          {modoVista === 'pendientes' ? (
            <tr>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Tributo</th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Año</th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Predio</th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Anexo</th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Subanexo</th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Periodo</th>
              <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Imp. Insol</th>
              <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Imp. Reaj</th>
              <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Fact. Mora</th>
              <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Interés</th>
              <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Costo Emis</th>
              <th className="text-right text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Total</th>
              <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acción</th>
            </tr>
          ) : (
            <tr>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
                Código
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
                Nombres
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
                N° Documento
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
                Dirección
              </th>
              <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">
                Acción
              </th>
            </tr>
          )}
        </thead>
        {renderTableBody()}
      </table>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Receipt size={13} className="text-slate-400" />
      <span>
        {modoVista === 'pendientes'
          ? <>Se encontraron <span className="font-semibold text-slate-700">{total}</span> {total === 1 ? 'registro pendiente' : 'registros pendientes'}</>
          : <>Se encontraron <span className="font-semibold text-slate-700">{total}</span> {total === 1 ? 'contribuyente' : 'contribuyentes'}</>}
      </span>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          resultados
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Anterior"
          >
            <ChevronLeft size={13} />
            Anterior
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
                p === page
                  ? "bg-sat-cyan text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Siguiente"
          >
            Siguiente
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <SearchX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        {modoVista === 'pendientes'
          ? 'No se encontraron alcabalas pendientes'
          : 'No se encontraron contribuyentes'}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {modoVista === 'pendientes'
          ? 'No hay registros pendientes de pago'
          : 'Intente ajustar los filtros de búsqueda'}
      </p>
    </div>
  );

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

  // ── Main render ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Receipt
              size={18}
              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              RD Alcabala
            </h1>
            <p className="text-xs text-white/50 font-inter">
              {modoVista === 'pendientes'
                ? 'Alcabalas pendientes de pago'
                : 'Búsqueda de contribuyentes para creación de RD'}
            </p>
          </div>

          {/* Toggle modo */}
          <div className="ml-auto flex items-center gap-1 rounded-md border border-white/10 bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => {
                setModoVista('pendientes');
                loadPendientes();
              }}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                modoVista === 'pendientes'
                  ? 'bg-white text-sat-navy shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => setModoVista('contribuyentes')}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                modoVista === 'contribuyentes'
                  ? 'bg-white text-sat-navy shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Contribuyentes
            </button>
          </div>
        </div>
      </div>

      {modoVista === 'contribuyentes' && renderSearchForm()}

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
        </div>
      )}

      {/* Loading state */}
      {loading && initialLoading && <TableSkeleton modoVista={modoVista} />}

      {/* Loading overlay for subsequent searches */}
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
          {renderGrid()}
          {modoVista === 'contribuyentes' && renderPagination()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading &&
        renderEmptyState()}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {modoVista === 'contribuyentes' && renderPagination()}
        </>
      )}

      {/* Crear RD modal */}
      {crearRow && (
        <CrearRDModal
          row={crearRow}
          onClose={() => setCrearRow(null)}
          modo={modoVista}
        />
      )}
    </div>
  );
}
