'use client';

import { useState, useEffect } from 'react';
import { getAssignedRequisitosAction, deleteAssignedRequisitoAction } from '@/actions/registro-solicitud';
import AgregarRequisitosModal from './agregar-requisitos-modal';

interface Requisito {
  id_solicitud: string;
  id_requisito: string;
  nombre: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idSolicitud: string;
}

export default function RequisitosAsignadosModal({ isOpen, onClose, idSolicitud }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Requisito[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!idSolicitud) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAssignedRequisitosAction(idSolicitud, page, pageSize);
      if (res.success && res.data) {
        setData(res.data as Requisito[]);
        setTotal((res as any).total ?? 0);
      } else {
        setError(res.error ?? 'Error al cargar requisitos asignados');
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
  }, [isOpen, idSolicitud, page]);

  const handleDelete = async (idRequisito: string) => {
    if (!confirm('¿Está seguro de eliminar este requisito?')) return;
    setLoading(true);
    try {
      const res = await deleteAssignedRequisitoAction(idSolicitud, idRequisito);
      if (res.success) {
        loadData();
      } else {
        setError(res.error ?? 'Error al eliminar requisito');
        setLoading(false);
      }
    } catch (err) {
      setError('Error interno al eliminar requisito');
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
        <div className="bg-white shadow-2xl w-full max-w-2xl flex flex-col rounded-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <h2 className="text-[16px] font-bold text-slate-800">Listado de Requisitos Asignados</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-6 h-6 flex items-center justify-center rounded-sm leading-none transition-colors">✕</button>
          </div>

          {/* Body */}
          <div className="p-4 bg-slate-50/50">
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                <h3 className="text-[13px] font-bold text-slate-700">Requisitos Asignados</h3>
              </div>
              
              <div className="h-[250px] overflow-y-auto bg-white relative">
                {loading && data.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">Cargando...</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 border-r border-slate-200 font-bold w-[40px]"></th>
                        <th className="px-3 py-1.5 font-bold">Nombre</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] text-slate-700">
                      {data.length > 0 ? (
                        data.map((req, idx) => (
                          <tr key={req.id_requisito} className={`border-b border-slate-100 hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="px-3 py-1 border-r border-slate-100 text-center">
                              <button 
                                onClick={() => handleDelete(req.id_requisito)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-1 py-0.5 rounded leading-none transition-colors"
                                title="Eliminar"
                              >
                                ✕
                              </button>
                            </td>
                            <td className="px-3 py-1">{req.nombre}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-center text-slate-400 italic">
                            No existen requisitos asignados
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
              onClick={() => setIsAgregarOpen(true)} 
              className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Agregar Requisitos
            </button>
            <button 
              onClick={onClose} 
              className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-[12px] rounded hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {isAgregarOpen && (
        <AgregarRequisitosModal
          isOpen={isAgregarOpen}
          onClose={(saved: boolean) => {
            setIsAgregarOpen(false);
            if (saved) loadData();
          }}
          idSolicitud={idSolicitud}
        />
      )}
    </>
  );
}
