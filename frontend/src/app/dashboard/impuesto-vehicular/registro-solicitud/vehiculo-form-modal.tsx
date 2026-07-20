'use client';

import { useState, useEffect, useRef } from 'react';
import { getVehiculoCombosAction, saveVehiculoAction, getTipoCambioAction, getVehiculoDetailAction } from '@/actions/registro-solicitud';
import AgregarModeloModal from './agregar-modelo-modal';

interface Props {
  isOpen: boolean;
  onClose: (saved: boolean, data?: {
    id_vehiculo?: string;
    num_placa?: string;
    monto1?: number; monto2?: number; monto3?: number;
    impuesto1?: number; impuesto2?: number; impuesto3?: number;
    anio1?: string; anio2?: string; anio3?: string;
  }) => void;
  codigoContrib: string;
  idVehiculo?: string; // if provided, load existing vehicle for edit
}

// ─── sub-components defined OUTSIDE to prevent focus loss ───────────────────
function InputField({ label, value, onChange, className = '' }: any) {
  return (
    <>
      <div className="font-semibold">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`border border-slate-300 px-1.5 py-0.5 w-full bg-white text-slate-700 ${className}`} />
    </>
  );
}

function SelectField({ label, value, onChange, options = [], className = '' }: any) {
  return (
    <>
      <div className="font-semibold">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`border border-slate-300 px-1.5 py-0.5 w-full bg-white text-slate-700 ${className}`}>
        <option value="">[Seleccione]</option>
        {options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
      </select>
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function VehiculoFormModal({ isOpen, onClose, codigoContrib, idVehiculo: initialIdVehiculo }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const savedDataRef = useRef<Record<string, any> | null>(null);
  
  const [combos, setCombos] = useState<any>({});
  const [isAgregarModeloOpen, setIsAgregarModeloOpen] = useState(false);

  // Form State
  const [idVehiculo, setIdVehiculo] = useState('');
  const [inafecto, setInafecto] = useState(false);
  const [placa, setPlaca] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [motor, setMotor] = useState('');
  const [cbMotor, setCbMotor] = useState('');
  const [cbCarroceria, setCbCarroceria] = useState('');
  const [cbColor, setCbColor] = useState('');
  const [cbAdqui, setCbAdqui] = useState('');
  const [fechaSunarp, setFechaSunarp] = useState(''); // txtAdquisicion
  const [descripModelo, setDescripModelo] = useState(''); // txtdesmodelalt
  
  const [categoriaId, setCategoriaId] = useState('');
  const [categoriaDesc, setCategoriaDesc] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [marcaDesc, setMarcaDesc] = useState('');
  const [modeloId, setModeloId] = useState('');
  const [modeloDesc, setModeloDesc] = useState('');

  const [cbCombustible, setCbCombustible] = useState('');
  const [cbTraccion, setCbTraccion] = useState('');
  const [cbOrigen, setCbOrigen] = useState('');
  
  const [valorDolares, setValorDolares] = useState('');
  const [tipoCambio, setTipoCambio] = useState('');
  const [valorVehiculo, setValorVehiculo] = useState('');

  const [cilindros, setCilindros] = useState('');
  const [ccCilindrada, setCcCilindrada] = useState('');
  const [pesoVehicular, setPesoVehicular] = useState('');

  const [fechaInmatriculacion, setFechaInmatriculacion] = useState('');
  const [clase, setClase] = useState('');
  const [nAsientos, setNAsientos] = useState('');

  const [nRuedas, setNRuedas] = useState('');
  const [nEjes, setNEjes] = useState('');
  const [transmision, setTransmision] = useState('');

  const [nSerie, setNSerie] = useState('');
  const [anioFabrica, setAnioFabrica] = useState('');
  const [fechaBoleta, setFechaBoleta] = useState('');
  const fechaBoletaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getVehiculoCombosAction().then(res => {
      if (res.success && res.data) {
        setCombos(res.data);
      }
    }).then(async () => {
      if (initialIdVehiculo) {
        const detail = await getVehiculoDetailAction(initialIdVehiculo);
        if (detail.success && detail.data) {
          const row = detail.data as any;
          const vals = Object.values(row);

          // Column order from DB:
          // 0:id_vehiculo 1:codigo 2:num_placa 3:num_tarjeta_prop 4:num_motor
          // 5:id_adqui 6:fecha_adqui 7:anio_fabrica 8:cilindro 9:peso_vehicular
          // 10:id_categoria 11:id_marca 12:id_modelo 13:id_carroceria 14:id_motor
          // 15:id_traccion 16:id_origen 17:id_combustible 18:id_color 19:valor_soles
          // 20:valor_ref 21:operador 22:estacion 23:fecha_ingreso 24:estado
          // 25:cilindrada 26:valor_dolares 27:tipocambio 28:clase 29:nseries
          // 30:nrueda 31:neje 32:transmi 33:asientos 34:fecha_inscrip
          // 35:fecha_adqui_ant 36:des_model_alt 37:id 38:inafecto 39:fecha_boleta
          const get = (name: string, idx: number) =>
            String(row[name] !== undefined && row[name] !== null ? row[name] : (vals[idx] ?? '')).trim();

          const toInputDate = (v: any): string => {
            if (!v) return '';
            if (v instanceof Date) {
              return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
            }
            const s = String(v).trim();
            if (!s || s === 'null') return '';
            if (s.includes('T')) {
              const d = new Date(s);
              return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            }
            // M/D/YYYY or DD/MM/YYYY — SQL Server may return as string
            if (s.includes('/')) {
              const parts = s.split(' ')[0].split('/');
              if (parts.length === 3) {
                // Detect: if first part <= 12 AND len(year part) == 4 → M/D/YYYY (US)
                const [a, b, c] = parts;
                if (c.length === 4) return `${c}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`;
                // DD/MM/YYYY
                return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
              }
            }
            return s.slice(0, 10);
          };

          setIdVehiculo(get('id_vehiculo', 0) || initialIdVehiculo);
          setPlaca(get('num_placa', 2));
          setTarjeta(get('num_tarjeta_prop', 3));
          setMotor(get('num_motor', 4));
          setCbAdqui(get('id_adqui', 5));
          setAnioFabrica(get('anio_fabrica', 7));
          setCilindros(get('cilindro', 8));
          setPesoVehicular(get('peso_vehicular', 9));
          setCategoriaId(get('id_categoria', 10));
          setMarcaId(get('id_marca', 11));
          setModeloId(get('id_modelo', 12));
          setCbCarroceria(get('id_carroceria', 13));
          setCbMotor(get('id_motor', 14));
          setCbTraccion(get('id_traccion', 15));
          setCbOrigen(get('id_origen', 16));
          setCbCombustible(get('id_combustible', 17));
          setCbColor(get('id_color', 18));
          setValorVehiculo(get('valor_soles', 19));
          setCcCilindrada(get('cilindrada', 25));
          setValorDolares(get('valor_dolares', 26));
          setTipoCambio(get('tipocambio', 27));
          setClase(get('clase', 28));
          setNSerie(get('nseries', 29));
          setNRuedas(get('nrueda', 30));
          setNEjes(get('neje', 31));
          setTransmision(get('transmi', 32));
          setNAsientos(get('asientos', 33));
          setDescripModelo(get('des_model_alt', 36));
          // inafecto stored as 'Unchecked' | '1' | '0' | 'Checked'
          const inafectoVal = get('inafecto', 38).toLowerCase();
          setInafecto(inafectoVal === '1' || inafectoVal === 'checked');

          // Dates
          setFechaSunarp(toInputDate(row['fecha_adqui'] ?? vals[6]));
          setFechaInmatriculacion(toInputDate(row['fecha_inscrip'] ?? vals[34]));
          setFechaBoleta(toInputDate(row['fecha_boleta'] ?? vals[39]));
        }
      } else {
        // Reset for new vehicle
        setIdVehiculo('');
        setPlaca(''); setTarjeta(''); setMotor('');
        setCbMotor(''); setCbCarroceria(''); setCbColor(''); setCbAdqui('');
        setFechaSunarp(''); setDescripModelo('');
        setCategoriaId(''); setCategoriaDesc(''); setMarcaId(''); setMarcaDesc(''); setModeloId(''); setModeloDesc('');
        setCbCombustible(''); setCbTraccion(''); setCbOrigen('');
        setValorDolares(''); setTipoCambio(''); setValorVehiculo('');
        setCilindros(''); setCcCilindrada(''); setPesoVehicular('');
        setFechaInmatriculacion(''); setClase(''); setNAsientos('');
        setNRuedas(''); setNEjes(''); setTransmision('');
        setNSerie(''); setAnioFabrica(''); setFechaBoleta('');
        setInafecto(false); setError(''); setSuccessMsg('');
      }
    }).finally(() => setLoading(false));
  }, [isOpen, initialIdVehiculo]);

  // Auto-convertir dólares a soles cuando cambie valor o tipo de cambio
  useEffect(() => {
    const dol = parseFloat(valorDolares);
    const tc = parseFloat(tipoCambio);
    if (!isNaN(dol) && !isNaN(tc) && tc > 0) {
      setValorVehiculo((dol * tc).toFixed(2));
    }
  }, [valorDolares, tipoCambio]);

  if (!isOpen) return null;

  const consultarTipoCambio = async () => {
    if (!fechaBoleta) {
      setError('Primero ingrese la Fecha de Boleta');
      fechaBoletaRef.current?.focus();
      return;
    }
    if (!valorDolares || parseFloat(valorDolares) <= 0) {
      setError('Ingrese un Valor en Dólares válido');
      return;
    }
    setError('');
    const res = await getTipoCambioAction(fechaBoleta);
    if (res.success && res.venta) {
      setTipoCambio(res.venta);
    } else {
      setError(res.error || 'Error al obtener tipo de cambio');
    }
  };

  const handleSave = async () => {
    if (!inafecto && !placa) {
      setError('La placa es obligatoria para vehículos afectos');
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMsg('');
    const dto = {
      idcontrib: codigoContrib,
      placa,
      tarjeta_propiedad: tarjeta,
      num_motor: motor,
      id_motor: cbMotor,
      id_carroceria: cbCarroceria,
      id_color: cbColor,
      id_adquisicion: cbAdqui,
      fecha_adqui: fechaSunarp,
      fecha_boleta: fechaBoleta,
      id_categoria: categoriaId,
      id_marca: marcaId,
      id_modelo: modeloId,
      id_combustible: cbCombustible,
      id_traccion: cbTraccion,
      id_origen: cbOrigen,
      anio_fabrica: anioFabrica,
      cilindros: cilindros,
      cilindrada: ccCilindrada,
      peso_vehicular: pesoVehicular,
      valor_vehiculo: valorVehiculo,
      inafecto: inafecto ? '1' : '0',
      desmodelalt: descripModelo,
      valor_dol: valorDolares,
      tipoc: tipoCambio,
      inscrip: fechaInmatriculacion,
      clase: clase,
      nasientos: nAsientos,
      nruedas: nRuedas,
      neje: nEjes,
      transmi: transmision,
      nserie: nSerie
    };
    
    const res = await saveVehiculoAction(dto);
    setSaving(false);
    if (res.success) {
      const msg = res.data?.message ?? '';
      setSuccessMsg(msg === 'vRegistro ingresado' ? 'Vehículo registrado correctamente' : (msg || 'Vehículo registrado correctamente'));
      savedDataRef.current = {
        id_vehiculo: res.data?.id,
        num_placa: placa,
        monto1: res.data?.monto1,
        monto2: res.data?.monto2,
        monto3: res.data?.monto3,
        impuesto1: res.data?.impuesto1,
        impuesto2: res.data?.impuesto2,
        impuesto3: res.data?.impuesto3,
        anio1: res.data?.anio1,
        anio2: res.data?.anio2,
        anio3: res.data?.anio3,
      };
      setTimeout(() => {
        if (savedDataRef.current) {
          const data = savedDataRef.current;
          savedDataRef.current = null;
          onClose(true, data);
        }
      }, 1500);
    } else {
      setError(res.error || 'Error al guardar el vehículo');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <h2 className="text-sm font-bold text-slate-800">Registro del Vehículo</h2>
            <button onClick={() => {
              if (savedDataRef.current) {
                const data = savedDataRef.current;
                savedDataRef.current = null;
                onClose(true, data);
              } else {
                onClose(false);
              }
            }} className="text-slate-400 hover:text-slate-600 text-lg leading-none font-bold">×</button>
          </div>
          
          <div className="p-3 bg-white">
            {loading ? <div className="text-sm text-center py-4">Cargando...</div> : (
              <div className="border border-slate-200 rounded p-4 relative mt-2 mb-2">
                <span className="absolute -top-2.5 left-3 bg-white px-1 text-slate-600 text-xs font-semibold">Datos del Vehículo:</span>

                <div className="grid grid-cols-[120px_1fr_120px_1fr_100px_1fr] gap-x-3 gap-y-3 items-center text-[11px] text-slate-700 mt-2">
                  
                  {/* Row 1 */}
                  <div className="font-semibold text-slate-700">Código Vehicular:</div>
                  <input value={idVehiculo} readOnly className="border border-slate-300 bg-slate-200 text-slate-600 rounded px-2 py-1 w-24" />
                  
                  <div className="col-span-4 flex items-center gap-1 font-semibold text-slate-700">
                    <input type="checkbox" checked={inafecto} onChange={e => setInafecto(e.target.checked)} /> No Afecto
                  </div>

                  {/* Row 2 */}
                  <InputField label="N° Placa:" value={placa} onChange={setPlaca} className="rounded" />
                  <InputField label="Tarjeta de Propiedad:" value={tarjeta} onChange={setTarjeta} className="rounded" />
                  <InputField label="N° Motor:" value={motor} onChange={setMotor} className="rounded" />

                  {/* Row 3 */}
                  <SelectField label="Motor:" value={cbMotor} onChange={setCbMotor} options={combos.motor} className="rounded" />
                  <SelectField label="Carrocería:" value={cbCarroceria} onChange={setCbCarroceria} options={combos.carroceria} className="rounded" />
                  <SelectField label="Color:" value={cbColor} onChange={setCbColor} options={combos.color} className="rounded" />

                  {/* Row 4 */}
                  <SelectField label="Adquisición:" value={cbAdqui} onChange={setCbAdqui} options={combos.adquisicion} className="rounded" />
                  <div className="font-semibold">Fecha SUNARP:</div>
                  <input value={fechaSunarp} onChange={e => setFechaSunarp(e.target.value)} type="date" className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />
                  <InputField label="Descrip. Modelo:" value={descripModelo} onChange={setDescripModelo} className="rounded" />

                  {/* Row 5 */}
                  <div className="font-semibold text-slate-700">Categoria:</div>
                  <input value={categoriaDesc} readOnly className="border border-slate-300 bg-slate-200 text-slate-600 rounded px-2 py-1 w-full" />
                  
                  <div className="font-semibold text-slate-700">Marca:</div>
                  <input value={marcaDesc} readOnly className="border border-slate-300 bg-slate-200 text-slate-600 rounded px-2 py-1 w-full" />
                  
                  <div className="font-semibold text-slate-700">Modelo:</div>
                  <div className="flex gap-2 items-center">
                    <input value={modeloDesc} readOnly className="border border-slate-300 bg-slate-200 text-slate-600 rounded px-2 py-1 w-full cursor-pointer" onClick={() => setIsAgregarModeloOpen(true)} placeholder="[Seleccione]" />
                    <button onClick={() => setIsAgregarModeloOpen(true)} className="px-3 py-1 bg-white text-blue-600 border border-slate-300 rounded font-semibold whitespace-nowrap shadow-sm hover:bg-slate-50">Agregar Modelo</button>
                  </div>

                  {/* Row 6 */}
                  <SelectField label="Combustible:" value={cbCombustible} onChange={setCbCombustible} options={combos.combustible} className="rounded" />
                  <SelectField label="Tracción:" value={cbTraccion} onChange={setCbTraccion} options={combos.traccion} className="rounded" />
                  <SelectField label="Origen:" value={cbOrigen} onChange={setCbOrigen} options={combos.origen} className="rounded" />

                  {/* Row 7 */}
                  <div className="font-semibold text-slate-700 leading-tight">Valor en<br/>Dólares:</div>
                  <div className="flex gap-1">
                    <input
                      value={valorDolares}
                      onChange={e => setValorDolares(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); consultarTipoCambio(); } }}
                      className="border border-slate-300 rounded px-2 py-1 w-full bg-white"
                    />
                    <button title="Consultar TC y convertir" onClick={consultarTipoCambio}
                      className="bg-white border border-slate-300 px-2 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50"
                    >⇄</button>
                  </div>
                  
                  <div className="font-semibold text-slate-700">Tipo Cambio:</div>
                  <input value={tipoCambio} readOnly className="border border-slate-300 bg-slate-200 text-slate-600 rounded px-2 py-1 w-full" />
                  
                  <div className="font-semibold text-slate-700 leading-tight">Valor del<br/>Vehículo:</div>
                  <input value={valorVehiculo} onChange={e => setValorVehiculo(e.target.value)} className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />

                  {/* Row 8 */}
                  <InputField label="N° Cilindro:" value={cilindros} onChange={setCilindros} className="rounded" />
                  <div className="font-semibold text-slate-700 leading-tight">C.C.<br/>Cilindrada:</div>
                  <input value={ccCilindrada} onChange={e => setCcCilindrada(e.target.value)} className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />
                  <div className="font-semibold text-slate-700 leading-tight">Peso<br/>vehicular:</div>
                  <input value={pesoVehicular} onChange={e => setPesoVehicular(e.target.value)} className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />

                  {/* Row 9 */}
                  <div className="font-semibold text-slate-700 leading-tight">Fecha<br/>Inmatriculación</div>
                  <input type="date" value={fechaInmatriculacion} onChange={e => setFechaInmatriculacion(e.target.value)} className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />
                  <InputField label="Clase:" value={clase} onChange={setClase} className="rounded" />
                  <div className="font-semibold text-slate-700 leading-tight">N° de<br/>Asientos:</div>
                  <input value={nAsientos} onChange={e => setNAsientos(e.target.value)} className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />

                  {/* Row 10 */}
                  <InputField label="N° de Ruedas" value={nRuedas} onChange={setNRuedas} className="rounded" />
                  <InputField label="N° de Ejes:" value={nEjes} onChange={setNEjes} className="rounded" />
                  <InputField label="Transmision:" value={transmision} onChange={setTransmision} className="rounded" />

                  {/* Row 11 */}
                  <InputField label="N° de Serie" value={nSerie} onChange={setNSerie} className="rounded" />
                  <div className="font-semibold text-slate-700 leading-tight">Año de<br/>Fábrica:</div>
                  <input value={anioFabrica} onChange={e => setAnioFabrica(e.target.value)} className="border border-slate-300 rounded px-2 py-1 w-16 bg-white text-slate-700" />
                  <div className="font-semibold text-slate-700 leading-tight">Fecha de<br/>Boleta:</div>
                  <input ref={fechaBoletaRef} value={fechaBoleta} onChange={e => setFechaBoleta(e.target.value)} type="date" className="border border-slate-300 rounded px-2 py-1 w-full bg-white text-slate-700" />

                </div>
                
                {successMsg && <p className="text-green-600 text-xs mt-2 font-semibold">{successMsg}</p>}
                {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => onClose(false)} className="px-4 py-1.5 bg-white text-slate-600 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || loading} className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-semibold shadow-sm disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {isAgregarModeloOpen && (
        <AgregarModeloModal 
          isOpen={isAgregarModeloOpen} 
          categorias={combos.categoria || []}
          onClose={(saved: boolean, data?: any) => {
            setIsAgregarModeloOpen(false);
            if (saved && data) {
              setModeloId(String(data.id ?? ''));
              setModeloDesc(data.nombre ?? '');
              setCategoriaId(String(data.id_categoria ?? ''));
              setCategoriaDesc(data.categoria ?? '');
              setMarcaId(String(data.id_marca ?? ''));
              setMarcaDesc(data.marca ?? '');
            }
          }}
        />
      )}

    </>
  );
}
