'use client';

import { useState, useEffect } from 'react';
import { getDJCombosAction, saveDJAction, getDJDetalleAction } from '@/actions/registro-solicitud';
import VehiculoFormModal from './vehiculo-form-modal';
import DescargoVehicularModal from './descargo-vehicular-modal';

// Funciones para convertir fechas
const formatDateToInput = (dateStr: string): string => {
  // Converts dd/mm/yyyy or dd/mm/yyyy hh:mm:ss → yyyy-mm-dd
  if (!dateStr) return '';
  // Strip time part if present
  const datePart = dateStr.split(' ')[0];
  const parts = datePart.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return '';
};

const formatDateToBackend = (dateStr: string): string => {
  // Convierte aaaa-mm-dd → dd/mm/aaaa
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return '';
};

interface Props {
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  codigo: string;
  idSolicitud: string;
  idDj?: string;
}

// ─── sub-components defined OUTSIDE to prevent focus loss ───────────────────
function NInput({ label, id, value, onChange, readOnly, type = 'text', small }: {
  label: string; id: string; value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean; type?: string; small?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${small ? 'w-28' : 'flex-1'}`}>
      <label htmlFor={id} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          readOnly
            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-default'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      />
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DjFormModal({ isOpen, onClose, codigo, idSolicitud, idDj }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [isVehiculoOpen, setIsVehiculoOpen] = useState(false);
  const [isDescargoOpen, setIsDescargoOpen] = useState(false);

  const [idVehiculo, setIdVehiculo] = useState('');
  const [numPlacaVehiculo, setNumPlacaVehiculo] = useState('');

  // combos
  const [propiedades, setPropiedades] = useState<{ id: string; nombre: string }[]>([]);
  const [idTasa, setIdTasa] = useState('');
  const [anioActual] = useState(String(new Date().getFullYear()));

  // fecha actual
  const getCurrentDateForInput = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // form fields
  const [numDecla, setNumDecla] = useState('Proceso');
  const [fechaDecla, setFechaDecla] = useState(getCurrentDateForInput());
  const [idPropiedad, setIdPropiedad] = useState('');
  const [tasa, setTasa] = useState('');
  const [imprimir, setImprimir] = useState(false);

  const [anioDecla, setAnioDecla] = useState(String(new Date().getFullYear()));

  // bases / impuestos
  const [base1, setBase1] = useState('');
  const [imp1, setImp1] = useState('');
  const [anio1, setAnio1] = useState('');
  const [base2, setBase2] = useState('');
  const [imp2, setImp2] = useState('');
  const [anio2, setAnio2] = useState('');
  const [base3, setBase3] = useState('');
  const [imp3, setImp3] = useState('');
  const [anio3, setAnio3] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setLoading(true);
    
    // Si tenemos un idDj, estamos en modo "Ver/Editar"
    if (idDj) {
      getDJDetalleAction(idDj).then(res => {
        if (res.success && res.data) {
          const d = res.data;
          setIdVehiculo(d.id_vehiculo || '');
          setNumPlacaVehiculo(d.num_placa || '');
          setNumDecla(d.num_decla || 'Proceso');
          setFechaDecla(formatDateToInput(d.fecha_decla) || getCurrentDateForInput());
          setIdPropiedad(d.id_propiedad || '');
          setTasa(d.tasa || '');
          setIdTasa(d.id_tasa || '');
          setImprimir(d.imprimir === '1');
          setAnioDecla(d.anio_dj || String(new Date().getFullYear()));
          
          setBase1(d.base_imponible1 || '');
          setImp1(d.imp_anual1 || '');
          setAnio1(d.anio1 || '');
          
          setBase2(d.base_imponible2 || '');
          setImp2(d.imp_anual2 || '');
          setAnio2(d.anio2 || '');
          
          setBase3(d.base_imponible3 || '');
          setImp3(d.imp_anual3 || '');
          setAnio3(d.anio3 || '');

          // También necesitamos cargar los combos para los selects
          getDJCombosAction().then(combosRes => {
            if (combosRes.success) {
              setPropiedades((combosRes as any).propiedades ?? []);
            }
            setLoading(false);
          });
        } else {
          setError('Error al cargar detalle de DJ');
          setLoading(false);
        }
      });
    } else {
      // Modo Nuevo
      getDJCombosAction().then(combosRes => {
        if (combosRes.success) {
          setPropiedades((combosRes as any).propiedades ?? []);
          setIdTasa((combosRes as any).idTasa ?? '');
          setTasa(String((combosRes as any).tasa ?? ''));
          setNumDecla((combosRes as any).numDecla ?? 'Proceso');
          setAnioDecla(anioActual);
          setAnio1(anioActual);
          
          setIdVehiculo('');
          setNumPlacaVehiculo('');
          setFechaDecla(getCurrentDateForInput());
          setIdPropiedad('');
          setImprimir(false);
          setBase1(''); setImp1('');
          setBase2(''); setImp2(''); setAnio2('');
          setBase3(''); setImp3(''); setAnio3('');
        }
      }).finally(() => setLoading(false));
    }
  }, [isOpen, codigo, idDj]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!fechaDecla) { setError('Debe Ingresar la fecha de Declaracion'); return; }
    if (!idVehiculo) { setError('Registrar el vehiculo para calcular el impuesto'); return; }
    if (!idPropiedad) { setError('Seleccione Condición de Propiedad'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await saveDJAction({
        id_dj: idDj,
        num_decla: numDecla,
        anio_dj: anioActual,
        id_solicitud: idSolicitud,
        idcontrib: codigo,
        id_propiedad: idPropiedad,
        id_vehiculo: idVehiculo,
        base_imponible1: parseFloat(base1) || 0,
        imp_anual1: parseFloat(imp1) || 0,
        anio1: anio1 || anioActual,
        base_imponible2: parseFloat(base2) || 0,
        imp_anual2: parseFloat(imp2) || 0,
        anio2,
        base_imponible3: parseFloat(base3) || 0,
        imp_anual3: parseFloat(imp3) || 0,
        anio3,
        id_tasa: idTasa,
        fecha_decla: formatDateToBackend(fechaDecla),
        imprimir: imprimir ? '1' : '0',
      });
      if (res.success) {
        onClose(true);
      } else {
        setError((res as any).error ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '95vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-sm font-bold text-slate-800">{idDj ? 'Editar Declaración Jurada' : 'Nueva Declaración Jurada'}</h2>
          <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Cargando...</div>
        ) : (
          <div className="overflow-auto flex-1 px-5 py-4 space-y-4">
            {/* Section: Datos */}
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">Datos de la Declaración Jurada</p>

              {/* Row 1 */}
              <div className="flex gap-3 mb-3">
                <NInput label="Código" id="dj-codigo" value={codigo} readOnly />
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer mb-1.5">
                    <input type="checkbox" checked={imprimir} onChange={(e) => setImprimir(e.target.checked)} className="rounded" />
                    Imprimir 1era Inscripción
                  </label>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex gap-3 mb-3">
                <NInput label="N° Declaración" id="dj-numdecla" value={numDecla} readOnly small />
                <NInput label="Año" id="dj-anio" value={anioDecla} readOnly small />
                <NInput label="Fecha Declaración" id="dj-fechadecla" value={fechaDecla} onChange={setFechaDecla} type="date" />
              </div>

              {/* Row 3 */}
              <div className="flex gap-3 mb-3">
                <div className="flex flex-col gap-0.5 flex-1">
                  <label htmlFor="dj-propiedad" className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    Condición Propiedad
                  </label>
                  <select
                    id="dj-propiedad"
                    value={idPropiedad}
                    onChange={(e) => setIdPropiedad(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">[Seleccione]</option>
                    {propiedades.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <NInput label="Tasa" id="dj-tasa" value={`${parseFloat(tasa) * 100 || 0.01} %`} readOnly small />
                </div>


            </div>

            {/* Section: Bases e Impuestos */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-[1fr_1fr_80px] gap-x-3 gap-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Base Imponible</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Impuesto Anual</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Año</div>

                {/* Row 1 */}
                <div className="flex gap-1">
                  <span className="text-xs text-slate-500 self-center">1:</span>
                  <input value={base1} onChange={(e) => setBase1(e.target.value)} type="number" step="0.01"
                    className="flex-1 border border-slate-300 bg-white text-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex gap-1">
                  <input value={imp1} onChange={(e) => setImp1(e.target.value)} type="number" step="0.01"
                    className="flex-1 border border-slate-300 bg-white text-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <input value={anio1} readOnly
                  className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2 py-1.5 text-xs cursor-not-allowed" />

                {/* Row 2 */}
                <div className="flex gap-1">
                  <span className="text-xs text-slate-500 self-center">2:</span>
                  <input value={base2} onChange={(e) => setBase2(e.target.value)} type="number" step="0.01"
                    className="flex-1 border border-slate-300 bg-white text-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <input value={imp2} onChange={(e) => setImp2(e.target.value)} type="number" step="0.01"
                  className="border border-slate-300 bg-white text-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={anio2} readOnly
                  className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2 py-1.5 text-xs cursor-not-allowed" />

                {/* Row 3 */}
                <div className="flex gap-1">
                  <span className="text-xs text-slate-500 self-center">3:</span>
                  <input value={base3} onChange={(e) => setBase3(e.target.value)} type="number" step="0.01"
                    className="flex-1 border border-slate-300 bg-white text-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <input value={imp3} onChange={(e) => setImp3(e.target.value)} type="number" step="0.01"
                  className="border border-slate-300 bg-white text-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={anio3} readOnly
                  className="border border-slate-200 bg-slate-50 text-slate-600 rounded px-2 py-1.5 text-xs cursor-not-allowed" />
              </div>
            </div>

            {error && <p className="text-red-600 text-xs px-1">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => onClose(false)}
              className="px-4 py-2 border border-slate-300 text-slate-600 text-xs rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsVehiculoOpen(true)}
              className="px-4 py-2 bg-slate-500 text-white text-xs rounded-lg hover:bg-slate-600 transition-colors"
            >
              Registrar Vehículo
            </button>
            <button
              onClick={() => {
                if (!idVehiculo) {
                  setError('Debe registrar un vehículo primero para realizar el descargo');
                  return;
                }
                setIsDescargoOpen(true);
              }}
              className="px-4 py-2 bg-slate-500 text-white text-xs rounded-lg hover:bg-slate-600 transition-colors"
            >
              Descargo Vehicular
            </button>
          </div>
        </div>
      </div>

      {isVehiculoOpen && (
        <VehiculoFormModal
          isOpen={isVehiculoOpen}
          onClose={(saved, data) => {
            setIsVehiculoOpen(false);
            if (saved && data?.id_vehiculo) {
              setIdVehiculo(data.id_vehiculo);
              if (data.num_placa) setNumPlacaVehiculo(data.num_placa);
              // Auto-populate bases and impuestos from server calculation (mirrors PHP legacy)
              if (data.monto1 !== undefined) setBase1(String(data.monto1 ?? 0));
              if (data.impuesto1 !== undefined) setImp1(String(data.impuesto1 ?? 0));
              if (data.anio1) setAnio1(data.anio1);
              if (data.monto2 !== undefined) setBase2(String(data.monto2 ?? 0));
              if (data.impuesto2 !== undefined) setImp2(String(data.impuesto2 ?? 0));
              if (data.anio2) setAnio2(data.anio2);
              if (data.monto3 !== undefined) setBase3(String(data.monto3 ?? 0));
              if (data.impuesto3 !== undefined) setImp3(String(data.impuesto3 ?? 0));
              if (data.anio3) setAnio3(data.anio3);
            }
          }}
          codigoContrib={codigo}
          idVehiculo={idVehiculo || undefined}
        />
      )}

      {isDescargoOpen && (
        <DescargoVehicularModal
          isOpen={isDescargoOpen}
          onClose={() => setIsDescargoOpen(false)}
          codigoContrib={codigo}
          idVehiculo={idVehiculo}
          numPlaca={numPlacaVehiculo}
        />
      )}
    </div>
  );
}
