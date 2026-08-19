"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { fraccionarPapeletaAction, verificarCondicionFraccionamientoAction, calcularCuotasAction } from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  infraccion: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CuotaDetalle {
  numCuota: number;
  montoCuota: number;
  interes: number;
  montoTotal: number;
  vencimiento: string;
}

export default function FraccionarPapeletaModal({ isOpen, infraccion, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeUITAlert, setMensajeUITAlert] = useState<string | null>(null);

  // Form State - Identico a "Fraccionar Deuda - PIT"
  const [costoEmision, setCostoEmision] = useState("0.00");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [montoTotalFracc, setMontoTotalFracc] = useState(0);
  const [porcentajeInicial, setPorcentajeInicial] = useState(30);
  const [cuotaInicial, setCuotaInicial] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [interesAprobado, setInteresAprobado] = useState(0.72);
  const [numCuotas, setNumCuotas] = useState(4);
  const [interesesFracc, setInteresesFracc] = useState(0);
  const [totalSinIntereses, setTotalSinIntereses] = useState(0);
  const [totalConIntereses, setTotalConIntereses] = useState(0);
  const [vencimientoPrimeraCuota, setVencimientoPrimeraCuota] = useState(new Date().toISOString().split("T")[0]);

  // Detalle de Cuotas (DGV derecho)
  const [detalleCuotas, setDetalleCuotas] = useState<CuotaDetalle[]>([]);
  const [tipoResponsable, setTipoResponsable] = useState("Conductor");

  // Obtener datos del conductor o propietario
  const getResponsableData = () => {
    if (!infraccion) return { codigo: "", dni: "", nombre: "" };
    if (tipoResponsable === "Conductor") {
      return {
        codigo: infraccion.codigo || "",
        dni: "", // Se puede dejar vacío o mapear si hubiese datos
        nombre: infraccion.conductor || "",
      };
    } else {
      return {
        codigo: infraccion.codigoPropietario || "",
        dni: "", 
        nombre: infraccion.propietario || "",
      };
    }
  };

  const respData = getResponsableData();

  // Al abrir el modal, validar la regla del 5% de la UIT
  useEffect(() => {
    if (isOpen && infraccion) {
      setError(null);
      setMensajeUITAlert(null);
      const monto = parseFloat(infraccion.monto) || 0;
      setMontoTotalFracc(monto);

      // Calculo inicial del 30%
      const inicial = monto * 0.3;
      setCuotaInicial(inicial);
      setSaldo(monto - inicial);

      // UIT actual de referencia (ej: S/ 5,150. El 5% de la UIT es S/ 257.50)
      const uit5porc = 5150 * 0.05;
      if (monto < uit5porc) {
        setMensajeUITAlert("La Deuda a Fraccionar no puede ser menor al 5.00% de la UIT actual");
      }

      // Verificar condición convenio si aplica
      if (infraccion.codigo) {
        verificarCondicionFraccionamientoAction(infraccion.codigo, "1").catch(() => {});
      }
    }
  }, [isOpen, infraccion]);

  // Recalcular saldo e inicial cuando cambia el porcentaje
  const handlePorcentajeChange = (pct: number) => {
    setPorcentajeInicial(pct);
    const inicial = (montoTotalFracc * pct) / 100;
    setCuotaInicial(inicial);
    setSaldo(montoTotalFracc - inicial);
  };

  // Calcular Cuotas (Simulación)
  const handleCalcularCuotas = async () => {
    if (numCuotas < 1) return;
    setLoading(true);
    try {
      const res = await calcularCuotasAction({
        cuotas: numCuotas,
        totalDeuda: saldo,
        totalInicial: cuotaInicial,
        fecGen: fecha,
        fecCuo: vencimientoPrimeraCuota,
      });

      if (res.success && res.cuotas) {
        setDetalleCuotas(res.cuotas);
      } else {
        // Cálculo fallback de cuotas si no responde el backend
        const cuotaBase = saldo / numCuotas;
        const filas: CuotaDetalle[] = [];
        const baseDate = new Date(vencimientoPrimeraCuota);

        for (let i = 1; i <= numCuotas; i++) {
          const fec = new Date(baseDate);
          fec.setMonth(fec.getMonth() + (i - 1));
          const fecStr = fec.toLocaleDateString("es-PE");
          filas.push({
            numCuota: i,
            montoCuota: cuotaBase,
            interes: 0,
            montoTotal: cuotaBase,
            vencimiento: fecStr,
          });
        }
        setDetalleCuotas(filas);
        setTotalSinIntereses(saldo);
        setTotalConIntereses(saldo);
      }
    } catch {
      // fallback local
      const cuotaBase = saldo / numCuotas;
      const filas: CuotaDetalle[] = Array.from({ length: numCuotas }, (_, i) => ({
        numCuota: i + 1,
        montoCuota: cuotaBase,
        interes: 0,
        montoTotal: cuotaBase,
        vencimiento: new Date(new Date(vencimientoPrimeraCuota).setMonth(new Date(vencimientoPrimeraCuota).getMonth() + i)).toLocaleDateString("es-PE"),
      }));
      setDetalleCuotas(filas);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarConvenio = async () => {
    if (mensajeUITAlert) {
      alert(mensajeUITAlert);
      return;
    }
    if (!respData.codigo) {
      setError("No existe el código del responsable.");
      return;
    }
    setLoading(true);
    try {
      const result = await fraccionarPapeletaAction({
        codigo: respData.codigo,
        cuotas: numCuotas,
        totalDeuda: montoTotalFracc,
        totalInicial: cuotaInicial,
        fechaGeneracion: fecha,
        fechaCuota: vencimientoPrimeraCuota,
        tipoDeuda: "PIT",
        codPropVeh: infraccion.codigoPropietario || "",
        codResp: respData.codigo,
      });
      if (result.success) {
        alert("✅ Fraccionamiento generado correctamente.");
        onSuccess();
        onClose();
      } else {
        setError(result.error ?? result.message);
      }
    } catch {
      setError("Error al generar convenio.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !infraccion) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-xs p-3"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      tabIndex={-1}
    >
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-300 animate-fade-in overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <span className="text-xs font-bold text-white tracking-wide">Fraccionar Deuda - PIT</span>
          <button type="button" onClick={onClose} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">

          {/* Si salta el mensaje de validación del 5% de la UIT */}
          {mensajeUITAlert && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-300 p-3 shadow-xs">
              <div className="rounded-full bg-blue-500 p-1 text-white shrink-0">
                <AlertCircle size={16} />
              </div>
              <span className="text-xs font-semibold text-blue-900">{mensajeUITAlert}</span>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Grid Principal de 2 Columnas */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            
            {/* Columna Izquierda: Parámetros del Fraccionamiento */}
            <div className="md:col-span-5 space-y-3">
              
              {/* Bloque Superior */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Costo Emisión:</span>
                  <input type="text" value={costoEmision} onChange={(e) => setCostoEmision(e.target.value)}
                    className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-bold text-xs text-slate-900" />
                  <span className="font-semibold text-slate-700 ml-2">Fecha:</span>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Infracción:</span>
                  <input readOnly value={infraccion.codigoInfraccion}
                    className="w-36 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono font-bold text-xs text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Monto Total a Fracc.:</span>
                  <input readOnly value={montoTotalFracc.toFixed(2)}
                    className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Cuota Inicial:</span>
                  <input readOnly value={cuotaInicial.toFixed(2)}
                    className="w-24 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                  <span className="text-slate-500 font-bold">…</span>
                  <input type="number" value={porcentajeInicial} onChange={(e) => handlePorcentajeChange(parseFloat(e.target.value) || 0)}
                    className="w-14 rounded border border-slate-300 bg-white px-1 py-0.5 text-right font-bold text-xs text-slate-900" />
                  <span className="text-slate-700 font-bold">%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Saldo:</span>
                  <input readOnly value={saldo.toFixed(2)}
                    className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Interés Aprobado:</span>
                  <input type="number" step="0.01" value={interesAprobado} onChange={(e) => setInteresAprobado(parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-bold text-xs text-slate-900" />
                </div>
              </div>

              {/* Bloque Inferior */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Número de Cuotas:</span>
                  <input type="number" min="1" max="60" value={numCuotas} onChange={(e) => setNumCuotas(parseInt(e.target.value, 10) || 1)}
                    className="w-16 rounded border border-slate-300 bg-white px-2 py-0.5 font-bold text-xs text-center text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Intereses del Fracc.:</span>
                  <input readOnly value={interesesFracc.toFixed(2)}
                    className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total sin Intereses:</span>
                  <input readOnly value={totalSinIntereses.toFixed(2)}
                    className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total con Intereses:</span>
                  <input readOnly value={totalConIntereses.toFixed(2)}
                    className="w-28 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Vencimiento 1ª Cuota:</span>
                  <input type="date" value={vencimientoPrimeraCuota} onChange={(e) => setVencimientoPrimeraCuota(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-900" />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tabla DGV "Detalle de Cuotas" */}
            <div className="md:col-span-7 rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-full min-h-[340px]">
              <div className="bg-slate-100/90 px-3 py-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">Detalle de Cuotas</span>
              </div>

              <div className="overflow-x-auto flex-1 p-0">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="px-3 py-2 text-center">Cuotas</th>
                      <th className="px-3 py-2 text-right">Monto Cuota</th>
                      <th className="px-3 py-2 text-right">Intereses</th>
                      <th className="px-3 py-2 text-right">Monto Total</th>
                      <th className="px-3 py-2 text-center">Vencimientos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalleCuotas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          Haga clic en &quot;Calcular Cuotas&quot; para simular la tabla.
                        </td>
                      </tr>
                    ) : (
                      detalleCuotas.map((row) => (
                        <tr key={row.numCuota} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center font-bold text-sat-navy">{row.numCuota}</td>
                          <td className="px-3 py-1.5 text-right font-mono">S/ {row.montoCuota.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-500">S/ {row.interes.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">S/ {row.montoTotal.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-center font-mono text-slate-600">{row.vencimiento}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Botonera Inferior: Calcular Cuotas | Solicitud | Simular | Generar Convenio | Conductor dropdown | Salir */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={handleCalcularCuotas} disabled={loading}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
            >
              Calcular Cuotas
            </button>

            <button type="button" onClick={() => alert("Función de Solicitud")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
            >
              Solicitud
            </button>

            <button type="button" onClick={handleCalcularCuotas}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
            >
              Simular
            </button>

            <button type="button" onClick={handleGenerarConvenio} disabled={loading}
              className="rounded-md bg-sat-navy px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-2xs disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null}
              Generar Convenio
            </button>

            <div className="flex items-center gap-1">
              <select value={tipoResponsable} onChange={(e) => setTipoResponsable(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 h-[28px]"
              >
                <option value="Conductor">Conductor</option>
                <option value="Propietario">Propietario</option>
              </select>

              <input
                type="text"
                readOnly
                placeholder="Código"
                value={respData.codigo}
                className="w-20 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-mono font-bold text-slate-700 h-[28px]"
                title="Código Responsable"
              />

              <input
                type="text"
                readOnly
                placeholder="DNI/RUC"
                value={respData.dni}
                className="w-24 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-mono font-bold text-slate-700 h-[28px]"
                title="DNI/RUC"
              />

              <input
                type="text"
                readOnly
                placeholder="Nombre"
                value={respData.nombre}
                className="w-56 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 truncate h-[28px]"
                title="Nombre"
              />
            </div>

            <button type="button" onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 ml-auto"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
