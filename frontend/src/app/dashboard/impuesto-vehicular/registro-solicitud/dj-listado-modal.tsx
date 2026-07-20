'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDJListadoAction, getDJDetalleAction, getDjPdfBase64Action } from '@/actions/registro-solicitud';
import DjFormModal from './dj-form-modal';

interface DjRow {
  id_dj: string;
  num_decla: string;
  anio_dj: string;
  fecha_decla: string;
  imp_anual: string;
  id_solicitud: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigo: string;
  idSolicitud: string;
  nombreContribuyente: string;
}

export default function DjListadoModal({ isOpen, onClose, codigo, idSolicitud, nombreContribuyente }: Props) {
  const [rows, setRows] = useState<DjRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [criterio, setCriterio] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDj, setSelectedDj] = useState<string | undefined>(undefined);
  const [printing, setPrinting] = useState<string | null>(null);

  const handlePrint = async (idDj: string) => {
    setPrinting(idDj);
    try {
      const base64 = await getDjPdfBase64Action(idDj);
      if (base64) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        alert('No se pudo generar el PDF de la DJ');
      }
    } finally {
      setPrinting(null);
    }
  };

  const load = useCallback(async () => {
    if (!isOpen || !codigo || !idSolicitud) return;
    setLoading(true);
    try {
      const res = await getDJListadoAction(codigo, idSolicitud, criterio, page, pageSize);
      if (res.success) {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen, codigo, idSolicitud, criterio, page, pageSize]);

  useEffect(() => {
    if (isOpen) { setPage(1); setCriterio(''); load(); }
  }, [isOpen]);

  useEffect(() => { load(); }, [page]);

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Listado de Declaraciones Juradas</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Solicitud: <span className="font-semibold text-slate-700">{idSolicitud}</span>
                {' — '}
                <span className="font-semibold text-slate-700">{nombreContribuyente}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none transition-colors">×</button>
          </div>

          {/* Filter */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <label className="text-xs text-slate-600 whitespace-nowrap font-medium">N° DJ:</label>
            <input
              type="text"
              value={criterio}
              onChange={(e) => setCriterio(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 w-36 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Buscar..."
            />
            <button onClick={() => { setPage(1); load(); }}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Buscar
            </button>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 px-5 py-3">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <th className="p-2.5 font-bold w-8 text-center">#</th>
                  <th className="p-2.5 font-bold">N° Declaración</th>
                  <th className="p-2.5 font-bold">Año</th>
                  <th className="p-2.5 font-bold">Fecha Declaración</th>
                  <th className="p-2.5 font-bold text-right">Impuesto Anual</th>
                  <th className="p-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400">Cargando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400">No se encontró datos</td></tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={`${row.id_dj}-${i}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{row.num_decla}</td>
                      <td className="p-2.5 text-slate-700">{row.anio_dj}</td>
                      <td className="p-2.5 text-slate-600">{row.fecha_decla}</td>
                      <td className="p-2.5 text-right text-slate-700">{row.imp_anual}</td>
                      <td className="p-2.5 flex items-center justify-end gap-1">
                        <button title="Ver/Editar" className="p-1 rounded text-amber-600 bg-amber-50 hover:bg-amber-100 shadow-sm border border-amber-200" onClick={() => {
                          setSelectedDj(row.id_dj);
                          setIsFormOpen(true);
                        }}>
                          ✏️
                        </button>
                        <button title="Imprimir" disabled={printing === row.id_dj}
                          className="p-1 rounded text-blue-600 bg-blue-50 hover:bg-blue-100 shadow-sm border border-blue-200 disabled:opacity-50"
                          onClick={() => handlePrint(row.id_dj)}>
                          🖨️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Página {page} de {totalPages} ({total} registros)</span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100">‹</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100">›</button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between items-center">
            <button
              onClick={() => { setSelectedDj(undefined); setIsFormOpen(true); }}
              className="px-5 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              + Nuevo
            </button>
            <button onClick={onClose}
              className="px-5 py-2 border border-slate-300 text-slate-600 text-xs rounded-lg hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <DjFormModal
        isOpen={isFormOpen}
        onClose={(saved) => { setIsFormOpen(false); if (saved) load(); }}
        codigo={codigo}
        idSolicitud={idSolicitud}
        idDj={selectedDj}
      />
    </>
  );
}
