"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserX,
  AlertCircle,
  RotateCcw,
  Building2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
  Users,
  Mail,
} from "lucide-react";
import { searchContribuyenteAction } from "@/actions/administracion-tributaria/declaracion-jurada";
import type { ContribuyenteAnyItem } from "@/actions/administracion-tributaria/declaracion-jurada";
import ContribuyenteModal from "./contribuyente-modal";

// ─── Types ────────────────────────────────────────────────

type TipoBusqueda = "C" | "N" | "R" | "D" | "P" | "V";

const TIPO_BUSQUEDA_OPTIONS: { value: TipoBusqueda; label: string }[] = [
  { value: "C", label: "Código" },
  { value: "N", label: "Nombre" },
  { value: "R", label: "Razón Social" },
  { value: "D", label: "Documento" },
  { value: "P", label: "Dirección Predio" },
  { value: "V", label: "Placa" },
];

// ─── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-7 gap-4">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-7 gap-4">
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function DeclaracionJuradaPage() {
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>("C");
  const [filters, setFilters] = useState({
    codigo: "",
    nombres: "",
    paterno: "",
    materno: "",
    razon: "",
    numDoc: "",
    codPred: "",
    // ── Address/Predio fields ──
    anno: "",
    idVia: "",
    nro: "",
    dpto: "",
    mza: "",
    lte: "",
    subLte: "",
    codUrb: "",
    placa: "",
  });
  const [checkfrac, setCheckfrac] = useState(0);

  const [data, setData] = useState<ContribuyenteAnyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [nuevoModalOpen, setNuevoModalOpen] = useState(false);

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchContribuyenteAction(
          { ...filters, tipoBusqueda, checkfrac },
          pageNum,
          pageSize,
        );
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error);
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
    [filters, tipoBusqueda, checkfrac, pageSize],
  );

  useEffect(() => {
    executeSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTipoBusquedaChange = (value: TipoBusqueda) => {
    setTipoBusqueda(value);
    setCheckfrac(0);
    setFilters({
      codigo: "",
      nombres: "",
      paterno: "",
      materno: "",
      razon: "",
      numDoc: "",
      codPred: "",
      anno: "",
      idVia: "",
      nro: "",
      dpto: "",
      mza: "",
      lte: "",
      subLte: "",
      codUrb: "",
      // ── Placa field ──
      placa: "",
    });
    setData([]);
    setTotal(0);
    setTotalPages(0);
    setPage(1);
    setError(null);
  };

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

  // ── Filter inputs by tipoBusqueda ──────────────────────

  const renderFilterInputs = () => {
    const inputClass =
      "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
    const labelClass =
      "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

    switch (tipoBusqueda) {
      case "C":
        return (
          <div className="w-[150px]">
            <label htmlFor="codigo" className={labelClass}>Código</label>
            <input
              id="codigo"
              type="text"
              placeholder="Código"
              value={filters.codigo}
              onChange={(e) => handleFilterChange("codigo", e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
      case "N":
        return (
          <>
            <div className="w-[250px]">
              <label htmlFor="nombres" className={labelClass}>Nombres</label>
              <input
                id="nombres"
                type="text"
                placeholder="Nombres"
                value={filters.nombres}
                onChange={(e) => handleFilterChange("nombres", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[250px]">
              <label htmlFor="paterno" className={labelClass}>Paterno</label>
              <input
                id="paterno"
                type="text"
                placeholder="Ap. paterno"
                value={filters.paterno}
                onChange={(e) => handleFilterChange("paterno", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[250px]">
              <label htmlFor="materno" className={labelClass}>Materno</label>
              <input
                id="materno"
                type="text"
                placeholder="Ap. materno"
                value={filters.materno}
                onChange={(e) => handleFilterChange("materno", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
          </>
        );
      case "R":
        return (
          <div className="w-[350px]">
            <label htmlFor="razon" className={labelClass}>Razón Social / RUC</label>
            <input
              id="razon"
              type="text"
              placeholder="RUC o razón social"
              value={filters.razon}
              onChange={(e) => handleFilterChange("razon", e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
      case "D":
        return (
          <div className="w-[140px]">
            <label htmlFor="numDoc" className={labelClass}>Nro. Documento</label>
            <input
              id="numDoc"
              type="text"
              placeholder="DNI"
              value={filters.numDoc}
              onChange={(e) => handleFilterChange("numDoc", e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
      case "P":
        return (
          <>
            <div className="w-[160px]">
              <label htmlFor="codPred" className={labelClass}>Código Predio</label>
              <input
                id="codPred"
                type="text"
                placeholder="Código predio"
                value={filters.codPred}
                onChange={(e) => handleFilterChange("codPred", e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[120px]">
              <label htmlFor="anno" className={labelClass}>Año</label>
              <select
                id="anno"
                value={filters.anno}
                onChange={(e) => handleFilterChange("anno", e.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {Array.from({ length: new Date().getFullYear() - 1991 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={String(y)}>{y}</option>
                  );
                })}
              </select>
            </div>
            <div className="w-[200px]">
              <label htmlFor="idVia" className={labelClass}>Nombre Vía</label>
              <input
                id="idVia"
                type="text"
                placeholder="Nombre vía"
                value={filters.idVia}
                onChange={(e) => handleFilterChange("idVia", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[160px]">
              <label htmlFor="codUrb" className={labelClass}>Nombre Urb.</label>
              <input
                id="codUrb"
                type="text"
                placeholder="Nombre urbanización"
                value={filters.codUrb}
                onChange={(e) => handleFilterChange("codUrb", e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[120px]">
              <label htmlFor="nro" className={labelClass}>Nro.</label>
              <input
                id="nro"
                type="text"
                placeholder="Nro."
                value={filters.nro}
                onChange={(e) => handleFilterChange("nro", e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[80px]">
              <label htmlFor="dpto" className={labelClass}>Dpto</label>
              <input
                id="dpto"
                type="text"
                placeholder="Dpto"
                value={filters.dpto}
                onChange={(e) => handleFilterChange("dpto", e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[80px]">
              <label htmlFor="mza" className={labelClass}>Mza</label>
              <input
                id="mza"
                type="text"
                placeholder="Mza"
                value={filters.mza}
                onChange={(e) => handleFilterChange("mza", e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[80px]">
              <label htmlFor="lte" className={labelClass}>Lte</label>
              <input
                id="lte"
                type="text"
                placeholder="Lte"
                value={filters.lte}
                onChange={(e) => handleFilterChange("lte", e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            <div className="w-[80px]">
              <label htmlFor="subLte" className={labelClass}>Sub Lte</label>
              <input
                id="subLte"
                type="text"
                placeholder="Sub Lte"
                value={filters.subLte}
                onChange={(e) => handleFilterChange("subLte", e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClass}
              />
            </div>
            
            
          </>
        );
      case "V":
        return (
          <div className="w-[200px]">
            <label htmlFor="placa" className={labelClass}>Placa</label>
            <input
              id="placa"
              type="text"
              placeholder="Nro. placa"
              value={filters.placa}
              onChange={(e) => handleFilterChange("placa", e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
          </div>
        );
    }
  };

  // ── Search Form ─────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="flex flex-wrap gap-2 items-end">
          {/* Tipo búsqueda select */}
          <div className="w-[130px]">
            <label htmlFor="tipoBusqueda" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Tipo Búsqueda
            </label>
            <select
              id="tipoBusqueda"
              value={tipoBusqueda}
              onChange={(e) => handleTipoBusquedaChange(e.target.value as TipoBusqueda)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            >
              {TIPO_BUSQUEDA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic filter inputs */}
          {renderFilterInputs()}

          {/* Infracción checkbox */}
          <div className="flex items-center gap-1.5 pb-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checkfrac === 1}
                onChange={(e) => setCheckfrac(e.target.checked ? 1 : 0)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-sat-cyan accent-sat-cyan transition focus:ring-sat-cyan/20"
              />
              <span className="text-[11px] font-medium text-slate-600">Infracción</span>
            </label>
          </div>

          {/* Buscar button */}
          <div className="flex items-center gap-2">
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

  // ── Results table ───────────────────────────────────────

  const isDireccionMode = tipoBusqueda === "P";
  const isPlacaMode = tipoBusqueda === "V";

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table
        className="w-full table-fixed border-collapse"
        data-testid="dj-grid"
        role="grid"
      >
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          <tr>
            {isPlacaMode ? (
              <>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
                  Código
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[28%]">
                  Nombres
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
                  Nro. Documento
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[32%]">
                  Dirección
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
                  Placa
                </th>
              </>
            ) : isDireccionMode ? (
              <>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
                  Código
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[28%]">
                  Nombre
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[14%]">
                  Cód. Predio
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
                  Anexo
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
                  Sub Anexo
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[20%]">
                  Dirección
                </th>
              </>
            ) : (
              <>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[8%]">
                  Código
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
                  T. Contribuyente
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
                  Tipo/Gestor
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[22%]">
                  Nombres
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[10%]">
                  Nro. Documento
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[18%]">
                  Dirección
                </th>
              </>
            )}
            <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5 w-[12%]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, idx) => {
            const key = isPlacaMode
              ? `${(item as any).codigo}-${idx}`
              : isDireccionMode
              ? `${(item as any).codigo}-${(item as any).codPred}-${idx}`
              : `${(item as any).codigo}-${idx}`;

            return (
              <tr
                key={key}
                className={`transition hover:bg-slate-50 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                {isPlacaMode ? (
                  <>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                      {(item as any).codigo}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                      {(item as any).nombresCompletos}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).numDoc}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).direFis}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-600 truncate">
                      {(item as any).placa}
                    </td>
                  </>
                ) : isDireccionMode ? (
                  <>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                      {(item as any).codigo}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                      {(item as any).nombre}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-600 truncate">
                      {(item as any).codPred}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).anexo}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).subAnexo}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).direccion}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                      {(item as any).codigo}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).tipoDetalle}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).gestion}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                      {(item as any).nombresCompletos}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).numDoc}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                      {(item as any).direFis}
                    </td>
                  </>
                )}
                <td className="px-2 py-2">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="group relative">
                    <button type="button" onClick={() => alert("Por desarrollar")}
                      className="inline-flex items-center justify-center rounded p-1 text-sky-600 transition hover:bg-sky-50 active:scale-95">
                      <Pencil size={13} />
                    </button>
                    <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">Editar</span>
                  </span>
                  <span className="group relative">
                    <button type="button" onClick={() => alert("Por desarrollar")}
                      className="inline-flex items-center justify-center rounded p-1 text-red-500 transition hover:bg-red-50 active:scale-95">
                      <Trash2 size={13} />
                    </button>
                    <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">Eliminar DJ</span>
                  </span>
                  <span className="group relative">
                    <button type="button" onClick={() => alert("Por desarrollar")}
                      className="inline-flex items-center justify-center rounded p-1 text-blue-600 transition hover:bg-blue-50 active:scale-95">
                      <FileText size={13} />
                    </button>
                    <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">Declaración Jurada</span>
                  </span>
                  <span className="group relative">
                    <button type="button" onClick={() => alert("Por desarrollar")}
                      className="inline-flex items-center justify-center rounded p-1 text-emerald-600 transition hover:bg-emerald-50 active:scale-95">
                      <DollarSign size={13} />
                    </button>
                    <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">Estado de Cuenta</span>
                  </span>
                  <span className="group relative">
                    <button type="button" onClick={() => alert("Por desarrollar")}
                      className="inline-flex items-center justify-center rounded p-1 text-violet-600 transition hover:bg-violet-50 active:scale-95">
                      <Users size={13} />
                    </button>
                    <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">Representante</span>
                  </span>
                  <span className="group relative">
                    <button type="button" onClick={() => alert("Por desarrollar")}
                      className="inline-flex items-center justify-center rounded p-1 text-amber-500 transition hover:bg-amber-50 active:scale-95">
                      <Mail size={13} />
                    </button>
                    <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">Cargo de Notificación</span>
                  </span>
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Users size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "contribuyente" : "contribuyentes"}
      </span>
    </div>
  );

  // ── Pagination ──────────────────────────────────────────

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

  // ── Empty state ──────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <UserX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron resultados
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Intente ajustar los filtros de búsqueda
      </p>
    </div>
  );

  // ── Error state ──────────────────────────────────────────

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
            <Building2
              size={18}
              className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Declaración Jurada
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Consulta de contribuyentes
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Results info + actions */}
      {!loading && !error && !initialLoading && (
        <div className="flex items-center justify-between">
          {data.length > 0 && renderResultsBar()}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNuevoModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Plus size={14} />
              Nuevo
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && initialLoading && <TableSkeleton />}

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
          {renderPagination()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading && (
        renderEmptyState()
      )}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}

      {/* Modal Nuevo Contribuyente */}
      <ContribuyenteModal
        isOpen={nuevoModalOpen}
        onClose={() => setNuevoModalOpen(false)}
      />
    </div>
  );
}
