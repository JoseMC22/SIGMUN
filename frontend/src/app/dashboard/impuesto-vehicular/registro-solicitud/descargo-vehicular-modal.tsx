'use client';

import { useState, useEffect } from 'react';
import { getFormDescargoAction, descargarVehiculoAction } from '@/actions/registro-solicitud';

interface Props {
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  codigoContrib: string;
  idVehiculo: string;
  numPlaca?: string;
}

export default function DescargoVehicularModal({ isOpen, onClose, codigoContrib, idVehiculo, numPlaca: initialNumPlaca }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<any>({});
  const [numPlaca, setNumPlaca] = useState(initialNumPlaca || '');
  const [fechaDescargo, setFechaDescargo] = useState('');
  const [observacion, setObservacion] = useState('DESCARGO VEHICULAR DEL ');

  const formatFecha = (d: string) => {
    if (!d) return '';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) {
      const parts = d.split(' ')[0].split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
    return d;
  };

  useEffect(() => {
    if (!isOpen || !idVehiculo) return;
    setLoading(true);
    getFormDescargoAction(codigoContrib, idVehiculo).then(res => {
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.num_placa) setNumPlaca(res.data.num_placa);
        setFechaDescargo(formatFecha(res.data.fechadescargo) || '');
        setObservacion(res.data.observacion || 'DESCARGO VEHICULAR DEL ');
      }
    }).finally(() => setLoading(false));
  }, [isOpen, idVehiculo, codigoContrib]);

  useEffect(() => {
    if (initialNumPlaca && !numPlaca) {
      setNumPlaca(initialNumPlaca);
    }
  }, [initialNumPlaca]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!numPlaca) {
      setError('La placa es obligatoria');
      return;
    }
    setSaving(true);
    const dto = {
      codigo: codigoContrib,
      id_vehiculo: idVehiculo,
      num_placa: numPlaca,
      fecha_descargo: fechaDescargo,
      observacion
    };
    
    const res = await descargarVehiculoAction(dto);
    setSaving(false);
    if (res.success) {
      onClose(true);
    } else {
      setError(res.error || 'Error al guardar');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded shadow-2xl w-full max-w-3xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">Descargo Vehiculo</h2>
          <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none font-bold">×</button>
        </div>
        
        <div className="p-4 bg-white">
          {loading ? <div className="text-center text-sm py-4">Cargando...</div> : (
            <div className="border border-slate-200 rounded p-4 relative mb-2">
              <span className="absolute -top-2.5 left-3 bg-white px-1 text-slate-600 text-xs font-bold">Descargo Vehicular:</span>
              
              <div className="grid grid-cols-[110px_1fr_100px_1fr] gap-x-3 gap-y-3 items-center text-xs text-slate-700 font-medium mt-2">
                
                {/* Row 1 */}
                <div className="font-semibold">Código Vehicular:</div>
                <div className="col-span-3">
                  <input value={idVehiculo} readOnly className="w-32 border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5" />
                </div>

                {/* Row 2 */}
                <div className="font-semibold">Código:</div>
                <div>
                  <input value={codigoContrib} readOnly className="w-32 border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5" />
                </div>
                <div className="font-semibold">Contribuyente:</div>
                <div>
                  <input value={data.nombredes || ''} readOnly className="w-full border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5" />
                </div>

                {/* Row 3 */}
                <div className="font-semibold">Num. Placa:</div>
                <div className="col-span-3">
                  <input value={numPlaca} readOnly className="w-32 border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5 outline-none" />
                </div>

                {/* Row 4 */}
                <div className="font-semibold">Fecha Descargo:</div>
                <div>
                  <input value={fechaDescargo} onChange={(e) => setFechaDescargo(e.target.value)} type="date" className="w-32 border border-slate-300 bg-white rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-400 outline-none" />
                </div>
                <div className="font-semibold">Observación:</div>
                <div>
                  <input value={observacion} onChange={(e) => setObservacion(e.target.value)} className="w-full border border-slate-300 bg-white rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-400 outline-none" />
                </div>

                {/* Row 5 */}
                <div className="font-semibold">Operador:</div>
                <div className="col-span-3">
                  <input value={data.operador || ''} readOnly className="w-32 border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5" />
                </div>

                {/* Row 6 */}
                <div className="font-semibold">Estación:</div>
                <div className="col-span-3">
                  <input value={data.estacion || ''} readOnly className="w-32 border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5" />
                </div>

                {/* Row 7 */}
                <div className="font-semibold">Ultimo acceso:</div>
                <div className="col-span-3">
                  <input value={data.fech_ing || ''} readOnly className="w-48 border border-slate-300 bg-slate-200 text-slate-700 rounded px-2 py-1.5" />
                </div>

              </div>

              {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => onClose(false)} className="px-4 py-1.5 bg-white text-slate-600 font-bold text-xs rounded border border-slate-300 hover:bg-slate-50 shadow-sm">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || loading} className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-700 shadow-sm disabled:opacity-50">
              {saving ? 'Descargando...' : 'Descargar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
