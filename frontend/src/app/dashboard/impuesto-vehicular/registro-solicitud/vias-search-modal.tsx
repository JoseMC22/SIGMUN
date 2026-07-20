"use client";

import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { searchViasAction } from "@/actions/registro-solicitud";

interface ViaSearchResult {
  codigo: string;
  codzona: string;
  nomzona: string;
  codurba: string;
  nomurba: string;
  nomvia: string;
}

interface ViasSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (via: ViaSearchResult) => void;
}

export default function ViasSearchModal({ isOpen, onClose, onSelect }: ViasSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ViaSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const res = await searchViasAction(query);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setError(res.error ?? "No se pudieron obtener resultados.");
      }
    } catch (err) {
      setError("Error al realizar la búsqueda.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Búsqueda de Vías / Domicilio
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Busque por nombre de vía, urbanización o zona para autocompletar la dirección.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. Santa Rosa, Los Olivos, Zona 1..."
                className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 font-semibold rounded border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:border-sat-cyan focus:ring-1 focus:ring-sat-cyan"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="px-4 py-1.5 bg-sat-cyan hover:bg-sat-cyan-dark text-white rounded text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              {searching ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                "Buscar"
              )}
            </button>
          </form>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[250px]">
          {error && (
            <div className="p-3 bg-red-50 rounded text-red-600 text-xs text-center border border-red-100">
              {error}
            </div>
          )}

          {!searching && results.length === 0 && !error && (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
              <Search size={28} className="text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium">No hay resultados que mostrar</p>
              <p className="text-[10px] text-slate-400 mt-1">Escriba un término de búsqueda para comenzar.</p>
            </div>
          )}

          {searching && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 size={24} className="animate-spin text-sat-cyan mb-2" />
              <p className="text-xs font-medium">Buscando en catálogo de vías...</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                    <th className="p-2.5 font-bold">Código</th>
                    <th className="p-2.5 font-bold">Zona</th>
                    <th className="p-2.5 font-bold">Urbanización</th>
                    <th className="p-2.5 font-bold">Vía</th>
                    <th className="p-2.5 w-16 text-center font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {results.map((row, index) => (
                    <tr
                      key={`${row.codigo}-${index}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-2.5 text-slate-500 font-mono text-[10px]">{row.codigo}</td>
                      <td className="p-2.5 text-slate-600">{row.nomzona}</td>
                      <td className="p-2.5 text-slate-600">{row.nomurba}</td>
                      <td className="p-2.5 font-medium text-slate-800">{row.nomvia}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(row);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-sat-cyan hover:text-white text-slate-700 font-bold rounded text-[10px] transition"
                        >
                          OK
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-slate-700 text-xs font-bold transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
