'use client';

import { useState, useEffect } from 'react';
import { getAllRequisitosAction, saveAssignedRequisitosAction } from '@/actions/registro-solicitud';

interface Requisito {
  id: string;
  nombre: string;
}

interface Props {
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  idSolicitud: string;
}

export default function AgregarRequisitosModal({ isOpen, onClose, idSolicitud }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Requisito[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllRequisitosAction(page, pageSize);
      if (res.success && res.data) {
        setData(res.data as Requisito[]);
        setTotal((res as any).total ?? 0);
      } else {
        setError(res.error ?? 'Error al cargar requisitos');
      }
    } catch (err) {
      setError('Error interno al cargar requisitos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, page]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      setError('Seleccione al menos un requisito');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const selectedRequisitos = Array.from(selectedIds);
      const res = await saveAssignedRequisitosAction(idSolicitud, selectedRequisitos);
      if (res.success) {
        onClose(true);
      } else {
        setError(res.error ?? 'Error al guardar requisitos');
      }
    } catch (err) {
      setError('Error interno al guardar');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white shadow-2xl w-full max-w-2xl flex flex-col rounded-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <h2 className="text-[16px] font-bold text-slate-800">Listado de Requisitos</h2>
          <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-6 h-6 flex items-center justify-center rounded-sm leading-none transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-4 bg-slate-50/50">
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
              <h3 className="text-[13px] font-bold text-slate-700">Requisitos</h3>
            </div>
            
            <div className="h-[250px] overflow-y-auto bg-white relative">
              {loading && data.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">Cargando...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 border-r border-slate-200 w-[40px] text-center"></th>
                      <th className="px-3 py-1.5 font-bold">Nombre</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-slate-700">
                    {data.length > 0 ? (
                      data.map((req, idx) => {
                        const isChecked = selectedIds.has(req.id);
                        return (
                          <tr key={req.id} className={`border-b border-slate-100 hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`} onClick={() => toggleSelect(req.id)}>
                            <td className="px-3 py-1 border-r border-slate-100 text-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => {}} // Controlled by row click
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-1 cursor-pointer select-none">
                              <span className="mr-2 text-slate-400 w-4 inline-block">{idx + 1 + (page - 1) * pageSize}</span> 
                              {req.nombre}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-slate-400 italic">
                          No se encontraron requisitos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[12px] text-slate-600">
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 hover:bg-slate-100 rounded disabled:opacity-30 border border-transparent hover:border-slate-200">|&lt;</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 hover:bg-slate-100 rounded disabled:opacity-30 border border-transparent hover:border-slate-200">&lt;</button>
                <span className="flex items-center gap-2">
                  Page <input type="text" readOnly value={page} className="w-10 text-center border border-slate-300 rounded h-7 bg-white" /> of {totalPages || 1}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="px-2 py-1 hover:bg-slate-100 rounded disabled:opacity-30 border border-transparent hover:border-slate-200">&gt;</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0} className="px-2 py-1 hover:bg-slate-100 rounded disabled:opacity-30 border border-transparent hover:border-slate-200">&gt;|</button>
                <button onClick={loadData} className="px-2 py-1 hover:bg-slate-100 rounded text-blue-600 border border-transparent hover:border-slate-200 ml-2" title="Refrescar">↻</button>
              </div>
              <div className="font-medium">
                {total === 0 ? 'No existen requisitos' : `Total: ${total}`}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-[12px] rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex gap-2">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Requisitos'}
          </button>
          <button 
            onClick={() => onClose(false)} 
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-[12px] rounded hover:bg-slate-50 transition-colors shadow-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
