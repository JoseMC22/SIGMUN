'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSolicitudesAction, deleteSolicitudAction, getSolicitudPdfBase64Action } from '@/actions/registro-solicitud';
import SolicitudFormModal from './solicitud-form-modal';
import DjListadoModal from './dj-listado-modal';
import { Printer } from 'lucide-react';

interface SolicitudRow {
  id_solicitud: string;
  anio: string;
  fecha: string;
  placa: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigo: string;
  nombreContribuyente: string;
}

export default function SolicitudesListModal({ isOpen, onClose, codigo, nombreContribuyente }: Props) {
  const [rows, setRows] = useState<SolicitudRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterSolicitud, setFilterSolicitud] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIdSolicitud, setSelectedIdSolicitud] = useState<string | undefined>(undefined);

  const [isDjOpen, setIsDjOpen] = useState(false);
  const [djIdSolicitud, setDjIdSolicitud] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOpen || !codigo) return;
    setLoading(true);
    try {
      const res = await getSolicitudesAction(codigo, filterSolicitud, page, pageSize);
      if (res.success) {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen, codigo, filterSolicitud, page, pageSize]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setFilterSolicitud('');
      load();
    }
  }, [isOpen]);

  useEffect(() => {
    load();
  }, [page]);

  const handleNew = () => {
    setSelectedIdSolicitud(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (idSolicitud: string) => {
    setSelectedIdSolicitud(idSolicitud);
    setIsFormOpen(true);
  };

  const handleOpenDj = (idSolicitud: string) => {
    setDjIdSolicitud(idSolicitud);
    setIsDjOpen(true);
  };

  const handleDelete = async (idSolicitud: string) => {
    if (!window.confirm(`¿Eliminar la solicitud N° ${idSolicitud}?`)) return;
    setDeletingId(idSolicitud);
    try {
      const res = await deleteSolicitudAction(idSolicitud);
      if (res.success) load();
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = async (row: SolicitudRow) => {
    const base64 = await getSolicitudPdfBase64Action(codigo, row.id_solicitud);
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
      alert('No se pudo generar el PDF de la solicitud');
    }
  };

  const handleFormClose = (saved: boolean) => {
    setIsFormOpen(false);
    if (saved) load();
  };

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <div>
              <h2 className="text-base font-bold text-slate-800">Listado de Solicitudes</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Código: <span className="font-semibold text-slate-700">{codigo}</span>
                {' — '}
                <span className="font-semibold text-slate-700">{nombreContribuyente}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
              title="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Filter bar */}
          <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-slate-600 whitespace-nowrap font-medium">N° Solicitud:</label>
              <input
                type="text"
                value={filterSolicitud}
                onChange={(e) => setFilterSolicitud(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 w-36 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Buscar..."
              />
            </div>
            <button
              onClick={() => { setPage(1); load(); }}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Buscar
            </button>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 px-5 py-3">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <th className="p-2.5 font-bold">Año</th>
                  <th className="p-2.5 font-bold">N° Solicitud</th>
                  <th className="p-2.5 font-bold">Fecha de Ingreso</th>
                  <th className="p-2.5 font-bold">Placa</th>
                  <th className="p-2.5 w-16 text-center font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">Cargando...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">No se encontraron registros de Solicitud</td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={`${row.id_solicitud}-${i}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-slate-700">{row.anio}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{row.id_solicitud}</td>
                      <td className="p-2.5 text-slate-600">{row.fecha}</td>
                      <td className="p-2.5 text-slate-600">{row.placa || '—'}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(row.id_solicitud)}
                            title="Editar solicitud"
                            className="px-2.5 py-1 bg-amber-500 text-white text-[10px] rounded hover:bg-amber-600 transition-colors font-semibold"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => handleDelete(row.id_solicitud)}
                            disabled={deletingId === row.id_solicitud}
                            title="Eliminar solicitud"
                            className="px-2.5 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600 disabled:opacity-50 transition-colors font-semibold"
                          >
                            {deletingId === row.id_solicitud ? '...' : 'Elim.'}
                          </button>
                          <button
                            onClick={() => handlePrint(row)}
                            title="Imprimir solicitud"
                            className="p-1.5 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenDj(row.id_solicitud)}
                            title="Declaraciones Juradas"
                            className="px-2.5 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 transition-colors font-semibold"
                          >
                            DJ
                          </button>
                        </div>
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
              <span>Mostrando página {page} de {totalPages} ({total} registros)</span>
              <div className="flex gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  ‹
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between items-center">
            <button
              onClick={handleNew}
              className="px-5 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              + Nuevo
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-300 text-slate-600 text-xs rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <SolicitudFormModal
        isOpen={isFormOpen}
        onClose={handleFormClose}
        codigo={codigo}
        idSolicitud={selectedIdSolicitud}
      />

      <DjListadoModal
        isOpen={isDjOpen}
        onClose={() => setIsDjOpen(false)}
        codigo={codigo}
        idSolicitud={djIdSolicitud}
        nombreContribuyente={nombreContribuyente}
      />
    </>
  );
}
