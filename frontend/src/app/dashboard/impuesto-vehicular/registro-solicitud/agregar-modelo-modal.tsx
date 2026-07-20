'use client';

import { useState, useCallback } from 'react';
import { searchModelosAction } from '@/actions/registro-solicitud';

interface Props {
  isOpen: boolean;
  onClose: (saved: boolean, data?: { id: any; nombre: string; id_categoria: any; categoria: string; id_marca: any; marca: string }) => void;
  categorias?: {id: string, nombre: string}[];
}

export default function AgregarModeloModal({ isOpen, onClose, categorias = [] }: Props) {
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [opcion, setOpcion] = useState<'MA' | 'MO'>('MA');
  const [criterio, setCriterio] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 10;

  const handleSearch = useCallback(async (pg = 1) => {
    setLoading(true);
    const res = await searchModelosAction(opcion, criterio, categoriaFiltro, pg, PAGE_SIZE);
    if (res.success) {
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setPage(pg);
    }
    setLoading(false);
  }, [opcion, criterio, categoriaFiltro]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!isOpen) return null;

  const handleSelect = (row: any) => {
    onClose(true, {
      id: row.id,
      nombre: row.nombre,
      id_categoria: row.id_categoria,
      categoria: row.categoria,
      id_marca: row.id_marca,
      marca: row.marca,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-sm font-bold text-slate-800">Listado de Vehículos</h2>
          <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-700 text-xl leading-none font-bold">×</button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="border border-slate-300 rounded bg-white p-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Búsqueda del Modelo del Vehículo</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <label className="text-[11px] text-slate-600 font-semibold">Categoría:</label>
                <select
                  value={categoriaFiltro}
                  onChange={e => setCategoriaFiltro(e.target.value)}
                  className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 bg-white w-24"
                >
                  <option value="">Todos</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input type="radio" name="opcion" value="MA" checked={opcion === 'MA'} onChange={() => setOpcion('MA')} className="accent-blue-600" />
                  Marca
                </label>
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input type="radio" name="opcion" value="MO" checked={opcion === 'MO'} onChange={() => setOpcion('MO')} className="accent-blue-600" />
                  Modelo
                </label>
              </div>
              <input
                value={criterio}
                onChange={e => setCriterio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch(1)}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 bg-white flex-1 min-w-[120px]"
                placeholder="Buscar..."
              />
              <button
                onClick={() => handleSearch(1)}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white text-[11px] rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto px-4 py-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Marcas y Modelos</p>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border border-slate-200">
                <th className="px-2 py-1 text-left font-semibold text-slate-600 border-r border-slate-200 w-8">#</th>
                <th className="px-2 py-1 text-left font-semibold text-slate-600 border-r border-slate-200 w-16">Categoría</th>
                <th className="px-2 py-1 text-left font-semibold text-slate-600 border-r border-slate-200">Marca</th>
                <th className="px-2 py-1 text-left font-semibold text-slate-600 border-r border-slate-200">Modelo</th>
                <th className="px-2 py-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    {loading ? 'Cargando...' : 'Realice una búsqueda para ver resultados'}
                  </td>
                </tr>
              ) : rows.map((row, idx) => (
                <tr
                  key={`${row.id}-${idx}`}
                  className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer"
                  onDoubleClick={() => handleSelect(row)}
                >
                  <td className="px-2 py-1 text-slate-500">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-2 py-1 font-semibold text-slate-700">{row.categoria}</td>
                  <td className="px-2 py-1 text-slate-700">{row.marca}</td>
                  <td className="px-2 py-1 text-slate-700">{row.nombre}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => handleSelect(row)}
                      className="w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-500 text-white text-[10px] flex items-center justify-center mx-auto"
                      title="Seleccionar"
                    >
                      ▶
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => handleSearch(1)} disabled={page === 1} className="px-1.5 py-0.5 border border-slate-300 rounded text-[10px] text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40">⏮</button>
            <button onClick={() => handleSearch(page - 1)} disabled={page === 1} className="px-1.5 py-0.5 border border-slate-300 rounded text-[10px] text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40">◀</button>
            <span className="text-[10px] text-slate-600 mx-1">Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
            <button onClick={() => handleSearch(page + 1)} disabled={page >= totalPages} className="px-1.5 py-0.5 border border-slate-300 rounded text-[10px] text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40">▶</button>
            <button onClick={() => handleSearch(totalPages)} disabled={page >= totalPages} className="px-1.5 py-0.5 border border-slate-300 rounded text-[10px] text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40">⏭</button>
          </div>
          <span className="text-[10px] text-slate-500">
            Mostrando {rows.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} - {(page - 1) * PAGE_SIZE + rows.length} de {total}
          </span>
        </div>
      </div>
    </div>
  );
}
