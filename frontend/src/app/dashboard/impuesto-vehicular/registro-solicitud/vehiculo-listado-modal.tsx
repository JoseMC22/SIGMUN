'use client';

import { useState, useEffect } from 'react';
import { getVehiculosByContribAction } from '@/actions/registro-solicitud';

interface Vehiculo {
  id_vehiculo: string;
  num_placa: string;
  modelo: string;
}

interface Props {
  isOpen: boolean;
  onClose: (vehiculoId?: string) => void;
  codigoContrib: string;
}

export default function VehiculoListadoModal({ isOpen, onClose, codigoContrib }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getVehiculosByContribAction(codigoContrib)
      .then(res => {
        if (res.success) {
          setVehiculos(res.data);
        } else {
          setError(res.error || 'Error al cargar vehículos');
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, codigoContrib]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-sm font-bold text-slate-800">Listado de Vehículos Registrados</h2>
          <button onClick={() => onClose()} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-auto">
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          
          {loading ? (
            <p className="text-xs text-slate-500 text-center py-4">Cargando...</p>
          ) : vehiculos.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No se encontraron vehículos registrados.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="py-2 px-3 text-slate-600 font-semibold w-24">Placa</th>
                  <th className="py-2 px-3 text-slate-600 font-semibold">Modelo/Marca</th>
                  <th className="py-2 px-3 text-slate-600 font-semibold w-24 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.map((v) => (
                  <tr key={v.id_vehiculo} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono">{v.num_placa}</td>
                    <td className="py-2 px-3 text-slate-700">{v.modelo}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onClose(v.id_vehiculo)}
                        className="px-3 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 font-semibold transition-colors"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={() => onClose()}
            className="px-4 py-2 border border-slate-300 text-slate-600 text-xs rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
