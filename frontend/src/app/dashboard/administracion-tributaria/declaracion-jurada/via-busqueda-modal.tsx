"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { searchViasAction, type MviaItem } from "@/actions/administracion-tributaria/declaracion-jurada";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (via: MviaItem) => void;
}

const PAGE_SIZE = 10;

export default function ViaBusquedaModal({ isOpen, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<MviaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (nombreVia: string, currentPage: number) => {
    setLoading(true);
    setError(null);
    const res = await searchViasAction(nombreVia, currentPage, PAGE_SIZE);
    if (res.success) {
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } else {
      setError(res.error);
      setData([]);
      setTotal(0);
      setTotalPages(0);
    }
    setLoading(false);
  }, []);

  // Load initial data on open
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setPage(1);
    fetchData("", 1);
  }, [isOpen, fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData(query, 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") handleSearch();
  };

  const handleSelect = (via: MviaItem) => {
    onSelect(via);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[80vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Búsqueda de Vías
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-3 space-y-3">
          {/* Criterio */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
            <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
              <MapPin size={13} />
              Criterio
            </legend>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Ingrese nombre de vía"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sat-amber px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#d98707] focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Search size={13} />
                )}
                Buscar
              </button>
            </div>
          </fieldset>

          {/* ── Tabla ── */}
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-2.5 py-1.5">Código</th>
                  <th className="px-2.5 py-1.5">Zona</th>
                  <th className="px-2.5 py-1.5">Urbanización</th>
                  <th className="px-2.5 py-1.5">Vía</th>
                  <th className="px-2.5 py-1.5 text-center">Cuadra</th>
                  <th className="px-2.5 py-1.5 text-center">Lado</th>
                  <th className="px-2.5 py-1.5 text-right">Arancel</th>
                  <th className="px-2.5 py-1.5 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      <Loader2 size={16} className="mx-auto mb-1 animate-spin text-sat-cyan" />
                      Cargando...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-red-500 text-[11px]">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-[11px]">
                      No se encontraron resultados
                    </td>
                  </tr>
                ) : (
                  data.map((via, idx) => (
                    <tr
                      key={`${via.codVia}-${idx}`}
                      className="transition hover:bg-sat-cyan/5 cursor-pointer"
                      onClick={() => handleSelect(via)}
                    >
                      <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-600">{via.codVia}</td>
                      <td className="px-2.5 py-1.5 text-slate-700">{via.zona}</td>
                      <td className="px-2.5 py-1.5 text-slate-700">{via.urbanizacion}</td>
                      <td className="px-2.5 py-1.5 font-medium text-slate-800">{via.via}</td>
                      <td className="px-2.5 py-1.5 text-center text-slate-600">{via.nCuadra}</td>
                      <td className="px-2.5 py-1.5 text-center text-slate-600">{via.nLado}</td>
                       <td className="px-2.5 py-1.5 text-right font-mono text-slate-700">
                         {Number(via.arancel).toLocaleString("es-PE", {
                           minimumFractionDigits: 2,
                           maximumFractionDigits: 2,
                         })}
                       </td>
                      <td className="px-2.5 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelect(via); }}
                          className="rounded-md bg-sat-cyan/10 px-2 py-0.5 text-[10px] font-medium text-sat-cyan transition hover:bg-sat-cyan/20"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginador ── */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Mostrando {data.length} de {total} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => { const p = page - 1; setPage(p); fetchData(query, p); }}
                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-medium text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => { const p = page + 1; setPage(p); fetchData(query, p); }}
                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
