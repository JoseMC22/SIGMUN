"use client";

import { useState, useCallback } from "react";
import { Building2, Search, Loader2, FileText, Calculator } from "lucide-react";
import {
  searchContribuyenteAction,
  getAlcabalasAction,
  type AlcabalaItem,
  type ContribuyenteItem,
} from "@/actions/alcabala/determinar-alcabala";
import AlcabalasModal from "./alcabalas-modal";
import DetalleAlcabala from "./detalle-alcabala";

// ─── Types ────────────────────────────────────────────────

type TipoBusqueda = "C" | "N" | "R" | "D" | "P" | "V";

const TIPO_BUSQUEDA_OPTIONS: { value: TipoBusqueda; label: string }[] = [
  { value: "C", label: "Código" },
  { value: "N", label: "Nombre" },
  { value: "R", label: "Razón Social" },
  { value: "D", label: "Documento" },
];

// ─── Style tokens ──────────────────────────────────────────

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

const labelClass =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

// ─── Main Page ────────────────────────────────────────────

export default function DeterminarAlcabalaPage() {
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>("C");
  const [busqueda, setBusqueda] = useState("");
  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [nombres, setNombres] = useState("");
  const [contribuyentes, setContribuyentes] = useState<ContribuyenteItem[]>([]);
  const [selectedContribuyente, setSelectedContribuyente] = useState<ContribuyenteItem | null>(null);
  const [alcabalas, setAlcabalas] = useState<AlcabalaItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleRow, setDetalleRow] = useState<AlcabalaItem | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingAlcabalas, setLoadingAlcabalas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const isCodigo = tipoBusqueda === "C";
  const isNombre = tipoBusqueda === "N";

  const handleBusquedaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isCodigo) {
        val = val.replace(/\D/g, "").slice(0, 7);
      } else {
        val = val.toUpperCase();
      }
      setBusqueda(val);
    },
    [isCodigo],
  );

  const formatCodigo = useCallback((val: string): string => {
    return val.replace(/\D/g, "").padStart(7, "0");
  }, []);

  const canSearch = isNombre
    ? !!(paterno.trim() || materno.trim() || nombres.trim())
    : !!busqueda.trim();

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoadingSearch(true);
    setSearched(true);
    setError(null);
    setSelectedContribuyente(null);
    setAlcabalas([]);
    try {
      const searchVal = isCodigo ? formatCodigo(busqueda) : busqueda;
      const res = await searchContribuyenteAction(
        tipoBusqueda,
        isNombre ? undefined : searchVal,
        isNombre ? paterno : undefined,
        isNombre ? materno : undefined,
        isNombre ? nombres : undefined,
      );
      if (res.success) {
        setContribuyentes(res.data);
        if (res.data.length === 0) {
          setError("No se encontraron contribuyentes");
        }
      } else {
        setContribuyentes([]);
        setError(res.error || "Error al buscar contribuyentes");
      }
    } catch {
      setContribuyentes([]);
      setError("Error de conexión");
    } finally {
      setLoadingSearch(false);
    }
  }, [tipoBusqueda, busqueda, isCodigo, isNombre, paterno, materno, nombres, canSearch, formatCodigo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  const resetAll = useCallback(() => {
    setBusqueda("");
    setPaterno("");
    setMaterno("");
    setNombres("");
    setContribuyentes([]);
    setSearched(false);
    setSelectedContribuyente(null);
    setAlcabalas([]);
    setError(null);
  }, []);

  const handleSelectContribuyente = useCallback(async (contribuyente: ContribuyenteItem) => {
    setSelectedContribuyente(contribuyente);
    setModalOpen(true);
    setLoadingAlcabalas(true);
    setError(null);
    try {
      const res = await getAlcabalasAction(contribuyente.codigo);
      if (res.success) {
        setAlcabalas(res.data);
      } else {
        setAlcabalas([]);
        setError(res.error || "Error al cargar alcabalas");
      }
    } catch {
      setAlcabalas([]);
      setError("Error de conexión");
    } finally {
      setLoadingAlcabalas(false);
    }
  }, []);

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
              Determinar Alcabala
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Consulta de alcabalas por contribuyente
            </p>
          </div>
        </div>
      </div>

      {/* Search form */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-end gap-2">
          <div className="w-[160px]">
            <label htmlFor="tipoBusqueda" className={labelClass}>
              Tipo Búsqueda
            </label>
            <select
              id="tipoBusqueda"
              value={tipoBusqueda}
              onChange={(e) => {
                setTipoBusqueda(e.target.value as TipoBusqueda);
                resetAll();
              }}
              className={inputClass}
            >
              {TIPO_BUSQUEDA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {/* Single input for C, R, D, P, V */}
          {!isNombre && (
            <div className="flex-1">
              <label htmlFor="busqueda" className={labelClass}>
                {isCodigo ? "Código (7 dígitos)" : "Búsqueda"}
              </label>
              <input
                id="busqueda"
                type="text"
                inputMode={isCodigo ? "numeric" : "text"}
                value={busqueda}
                onChange={handleBusquedaChange}
                onKeyDown={handleKeyDown}
                placeholder={isCodigo ? "Ej: 0279126" : "Ingrese término de búsqueda"}
                className={`${inputClass} ${isCodigo ? "font-mono" : ""}`}
                autoFocus
              />
            </div>
          )}
          {/* Three inputs for N */}
          {isNombre && (
            <>
              <div className="flex-1">
                <label htmlFor="paterno" className={labelClass}>
                  Ap. Paterno
                </label>
                <input
                  id="paterno"
                  type="text"
                  value={paterno}
                  onChange={(e) => setPaterno(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="PATERNO"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label htmlFor="materno" className={labelClass}>
                  Ap. Materno
                </label>
                <input
                  id="materno"
                  type="text"
                  value={materno}
                  onChange={(e) => setMaterno(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="MATERNO"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="nombres" className={labelClass}>
                  Nombres
                </label>
                <input
                  id="nombres"
                  type="text"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="NOMBRES"
                  className={inputClass}
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={handleSearch}
            disabled={loadingSearch || !canSearch}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loadingSearch ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Search size={13} />
            )}
            Buscar
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Contribuyente search results */}
      {searched && !loadingSearch && contribuyentes.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
              <tr>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[12%]">
                  Código
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[18%]">
                  Nombre
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[15%]">
                  Ap. Paterno
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[15%]">
                  Ap. Materno
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[12%]">
                  N° Doc
                </th>
                <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[22%]">
                  Dirección
                </th>
                <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[14%]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contribuyentes.map((item, idx) => (
                <tr
                  key={`${item.codigo}-${idx}`}
                  className={`transition hover:bg-slate-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                    {item.codigo}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                    {item.nombres}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.paterno}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.materno}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.numDoc}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                    {item.direccion}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => console.log("Ver estados de cuenta", item.codigo)}
                        className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 transition hover:bg-sky-100 active:scale-95"
                        title="Ver estados de cuenta"
                      >
                        <FileText size={11} />
                        Est. Cuenta
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectContribuyente(item)}
                        className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
                        title="Determinar impuesto"
                      >
                        <Calculator size={11} />
                        Determinar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alcabalas modal */}
      <AlcabalasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contribuyente={selectedContribuyente}
        alcabalas={alcabalas}
        loading={loadingAlcabalas}
        onViewDetail={(a) => setDetalleRow(a)}
      />

      {/* Detalle alcabala modal */}
      <DetalleAlcabala
        open={detalleRow !== null}
        onClose={() => setDetalleRow(null)}
        alcabala={detalleRow}
      />

      {/* Empty state when no search */}
      {!searched && !loadingSearch && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16">
          <div className="mb-3 rounded-full bg-slate-100 p-3">
            <Building2 size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Seleccione un contribuyente
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Use el formulario de búsqueda para comenzar
          </p>
        </div>
      )}
    </div>
  );
}