"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  fraccionarPapeletaAction,
  verificarCondicionFraccionamientoAction,
  calcularCuotasAction,
} from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  infraccion: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CuotaDetalle {
  numCuota: string | number;
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
  const [showSimuladoModal, setShowSimuladoModal] = useState(false);

  // Obtener datos del conductor o propietario
  const getResponsableData = () => {
    if (!infraccion) return { codigo: "", dni: "", nombre: "" };
    if (tipoResponsable === "Conductor") {
      return {
        codigo: infraccion.codigo || "",
        dni: "",
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

  // Recalcular saldo e inicial cuando cambia la cuota inicial manual
  const handleCuotaInicialChange = (montoIni: number) => {
    setCuotaInicial(montoIni);
    if (montoTotalFracc > 0) {
      const pct = Math.round((montoIni / montoTotalFracc) * 100);
      setPorcentajeInicial(pct);
      setSaldo(montoTotalFracc - montoIni);
    }
  };

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
        totalDeuda: montoTotalFracc,
        totalInicial: cuotaInicial,
        fecGen: fecha,
        fecCuo: vencimientoPrimeraCuota,
      });

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: CuotaDetalle[] = res.data.map((r: any) => {
          const cNum = r.cuota !== undefined && r.cuota !== null ? String(r.cuota).trim() : "0";
          return {
            numCuota: cNum,
            montoCuota: parseFloat(r.montoCuota ?? r.monto_cuota ?? 0) || 0,
            interes: parseFloat(r.intereses ?? 0) || 0,
            montoTotal: parseFloat(r.cuotaTotal ?? r.cuota_total ?? 0) || 0,
            vencimiento: r.fecGen || r.fec_gen || r.vencimiento || "-",
          };
        });
        setDetalleCuotas(mapped);

        // Cuotas normales sin cuota 00 para totales
        const totalSin = mapped.reduce((acc, c) => acc + c.montoCuota, 0);
        const totalCon = mapped.reduce((acc, c) => acc + c.montoTotal, 0);
        const totalIntereses = mapped.reduce((acc, c) => acc + c.interes, 0);

        setInteresesFracc(totalIntereses);
        setTotalSinIntereses(totalSin);
        setTotalConIntereses(totalCon);
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
            numCuota: String(i).padStart(2, "0"),
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
        numCuota: String(i + 1).padStart(2, "0"),
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
    if (detalleCuotas.length === 0) {
      setError("Primero haga clic en 'Calcular Cuotas' para generar el cronograma.");
      return;
    }

    setLoading(true);
    try {
      // Formatear las cuotas como XML o estructura JSON requerida por el backend/SP
      const xmlRows = detalleCuotas.map((c) => ({
        cuota: c.numCuota,
        anno: new Date().getFullYear().toString(),
        total_deuda: montoTotalFracc.toFixed(2),
        cuota_ini: cuotaInicial.toFixed(2),
        saldo_deuda: saldo.toFixed(2),
        monto_cuota: c.montoCuota.toFixed(2),
        intereses: c.interes.toFixed(2),
        cuota_total: c.montoTotal.toFixed(2),
        total_frac: montoTotalFracc.toFixed(2),
        cuotas: numCuotas,
        fec_gen: fecha,
      }));

      const varxmlStr = JSON.stringify(xmlRows);

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
        varxml: varxmlStr,
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

  const handleSimular = () => {
    if (detalleCuotas.length === 0) {
      alert("Primero haga clic en 'Calcular Cuotas' para simular el fraccionamiento.");
      return;
    }
    setShowSimuladoModal(true);
  };

  if (!isOpen || !infraccion) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-xs p-3"
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) onClose();
        }}
        tabIndex={-1}
      >
        <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-300 animate-fade-in overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header Modal */}
          <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
            <span className="text-xs font-bold text-white tracking-wide">Fraccionar Deuda - PIT</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
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
                    <input
                      type="text"
                      value={costoEmision}
                      onChange={(e) => setCostoEmision(e.target.value)}
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-bold text-xs text-slate-900"
                    />
                    <span className="font-semibold text-slate-700 ml-2">Fecha:</span>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Infracción:</span>
                    <input
                      readOnly
                      value={infraccion.codigoInfraccion}
                      className="w-36 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Monto Total a Fracc.:</span>
                    <input
                      readOnly
                      value={montoTotalFracc.toFixed(2)}
                      className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Cuota Inicial:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={cuotaInicial.toFixed(2)}
                        onChange={(e) => handleCuotaInicialChange(parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-right font-bold text-xs text-slate-900"
                      />
                      <span className="text-slate-400">...</span>
                      <input
                        type="text"
                        value={porcentajeInicial}
                        onChange={(e) => handlePorcentajeChange(parseFloat(e.target.value) || 0)}
                        className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-center font-bold text-xs text-slate-900"
                      />
                      <span className="font-semibold text-slate-700">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Saldo:</span>
                    <input
                      readOnly
                      value={saldo.toFixed(2)}
                      className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Interés Aprobado:</span>
                    <input
                      readOnly
                      value={interesAprobado}
                      className="w-24 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-center font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* Bloque Inferior */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Número de Cuotas:</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={numCuotas}
                      onChange={(e) => setNumCuotas(parseInt(e.target.value, 10) || 1)}
                      className="w-16 rounded border border-slate-300 bg-white px-2 py-0.5 text-center font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Intereses del Fracc.:</span>
                    <input
                      readOnly
                      value={interesesFracc.toFixed(2)}
                      className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Total sin Intereses:</span>
                    <input
                      readOnly
                      value={totalSinIntereses.toFixed(2)}
                      className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Total con Intereses:</span>
                    <input
                      readOnly
                      value={totalConIntereses.toFixed(2)}
                      className="w-32 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Vencimiento 1ª Cuota:</span>
                    <input
                      type="date"
                      value={vencimientoPrimeraCuota}
                      onChange={(e) => setVencimientoPrimeraCuota(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Detalle de Cuotas */}
              <div className="md:col-span-7 border border-slate-200 bg-white rounded-lg p-3 shadow-xs flex flex-col h-[340px]">
                <h4 className="font-bold text-sat-navy text-xs mb-2">Detalle de Cuotas</h4>

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
                        detalleCuotas.map((row, idx) => (
                          <tr key={`${row.numCuota}_${idx}`} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-center font-bold text-sat-navy">{row.numCuota}</td>
                            <td className="px-3 py-1.5 text-right font-mono">S/ {row.montoCuota.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                              S/ {row.interes.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">
                              S/ {row.montoTotal.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono text-slate-600">
                              {row.vencimiento}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Botonera Inferior */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCalcularCuotas}
                disabled={loading}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
              >
                Calcular Cuotas
              </button>

              <button
                type="button"
                onClick={handleSimular}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
              >
                Solicitud
              </button>

              <button
                type="button"
                onClick={handleSimular}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
              >
                Simular
              </button>

              <button
                type="button"
                onClick={handleGenerarConvenio}
                disabled={loading}
                className="rounded-md bg-sat-navy px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-2xs disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null}
                Generar Convenio
              </button>

              <div className="flex items-center gap-1">
                <select
                  value={tipoResponsable}
                  onChange={(e) => setTipoResponsable(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 h-[28px]"
                >
                  <option value="Conductor">Conductor</option>
                  <option value="Propietario">Propietario</option>
                </select>

                <input
                  type="text"
                  readOnly
                  value={respData.codigo}
                  className="w-20 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-mono font-bold text-slate-700 h-[28px]"
                />
                <input
                  type="text"
                  readOnly
                  value={respData.dni}
                  className="w-24 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-mono font-bold text-slate-700 h-[28px]"
                />
                <input
                  type="text"
                  readOnly
                  value={respData.nombre}
                  className="w-56 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 truncate h-[28px]"
                />
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 ml-auto"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-modal Simulado de Convenio (Plan de Pagos idéntico al sistema antiguo) ── */}
      {showSimuladoModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSimuladoModal(false);
          }}
        >
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-300 animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 text-white">
              <span className="text-xs font-bold">Simulado de Convenio</span>
              <button
                type="button"
                onClick={() => setShowSimuladoModal(false)}
                className="rounded p-1 hover:bg-white/10 text-white/80"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-sans text-xs space-y-4 bg-white text-black">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1 border border-slate-400 bg-slate-100 hover:bg-slate-200 font-bold rounded mb-2"
                >
                  Imprimir
                </button>
                <h2 className="font-extrabold text-sm tracking-wider">
                  SERVICIO DE ADMINISTRACIÓN TRIBUTARIA - SAT ICA
                </h2>
                <h3 className="font-bold text-xs mt-1 border-b border-black pb-1">
                  SIMULACION DE FRACCIONAMIENTO DE PAPELETA (PIT) Y PLAN DE PAGOS
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-semibold text-[11px]">
                <div>
                  Nombre/Razón Soc.: <span className="font-bold">{respData.nombre}</span>
                </div>
                <div>
                  Domicilio Fiscal/Legal: <span className="font-bold">-</span>
                </div>
                <div>
                  Cod.Contribuyente: <span className="font-bold">{respData.codigo}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  Nro. Doc: <span className="font-bold">{respData.dni}</span>
                </div>
                <div>
                  Monto Deuda: <span className="font-bold">{montoTotalFracc.toFixed(2)}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                  Cuotas: <span className="font-bold">{numCuotas}</span>
                </div>
                <div>
                  Fecha proyección: <span className="font-bold">{fecha}</span> &nbsp;&nbsp;&nbsp;&nbsp; Fecha emisión:{" "}
                  <span className="font-bold">{fecha}</span>
                </div>
                <div>
                  Usuario: <span className="font-bold">JMOZO</span> &nbsp;&nbsp;&nbsp;&nbsp; Infraccion:{" "}
                  <span className="font-bold">{infraccion.codigoInfraccion}</span>
                </div>
              </div>

              <div className="border-t border-black pt-2">
                <h4 className="text-center font-bold text-xs mb-2">Deuda a Fraccionar</h4>
                <table className="w-full text-center text-[11px]">
                  <thead>
                    <tr className="text-blue-900 font-bold">
                      <th>Año</th>
                      <th>Concepto.</th>
                      <th>Detalle</th>
                      <th>Predio/Veh.</th>
                      <th>Periodos</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2026</td>
                      <td className="text-blue-700">Papeleta(PIT)</td>
                      <td>InfraccTrans</td>
                      <td>0002EA</td>
                      <td>01</td>
                      <td className="font-bold text-red-600">S/. {montoTotalFracc.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-right font-bold text-xs mt-1 pr-4">
                  TOTAL : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; S/. {montoTotalFracc.toFixed(2)}
                </div>
              </div>

              <div className="border-t border-black pt-2">
                <h4 className="text-center font-bold text-xs mb-2">Cuotas Fraccionadas</h4>
                <table className="w-full text-center text-[11px]">
                  <thead>
                    <tr className="text-blue-900 font-bold">
                      <th>Cuota</th>
                      <th>Año</th>
                      <th>Fec.Venc.</th>
                      <th>Amort.</th>
                      <th>Int.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalleCuotas.map((c, idx) => (
                      <tr key={`sim_${c.numCuota}_${idx}`} className="font-bold text-blue-900">
                        <td>{String(c.numCuota).padStart(2, "0")}</td>
                        <td>2026</td>
                        <td>{c.vencimiento}</td>
                        <td>{c.montoCuota.toFixed(2)}</td>
                        <td>{c.interes.toFixed(2)}</td>
                        <td className="text-red-600">{c.montoTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right font-bold text-xs mt-2 pr-4">
                  TOTAL : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; S/. {(cuotaInicial + totalConIntereses).toFixed(2)}
                </div>
              </div>

              <p className="text-[10px] text-slate-600 italic border-t border-slate-300 pt-2">
                Los valores de Deuda están calculados a la fecha de emisión de la presente simulación, estos se
                actualizarán a la fecha de la firma del convenio y pago de la cuota inicial (cuota 00) a razon del
                interés Moratorio.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
