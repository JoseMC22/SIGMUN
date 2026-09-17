"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import {
  getCuotasConvenioAction,
  getApoderadoConvenioAction,
  getSimuladoConvenioAction,
  generarConvenioAction,
  getReporteConvenioAction,
  type FraccionarCuotasRow,
  type SimuladoDeudaReciboPayload,
  type SimuladoConvenioData,
  type ConvenioReporteData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { obtenerPlantillaReporteConvenioSimuladoAction } from "@/actions/administracion-tributaria/reporte-convenio-simulado";
import {
  construirHtmlReporteConvenioSimulado,
  construirConfigPdfConvenioSimulado,
} from "./reportes/ConvenioSimulado/reporte-convenio-simulado";
import { obtenerPlantillaReporteConvenioAction } from "@/actions/administracion-tributaria/reporte-convenio";
import {
  construirHtmlReporteConvenio,
  construirConfigPdfConvenio,
} from "./reportes/Convenio/reporte-convenio";
import { getPcName } from "@/lib/api";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import ConfirmDialog from "@/components/confirm-dialog";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

// El técnica de teclado nativa del DOM es globalThis.KeyboardEvent.

// ─── Types ────────────────────────────────────────────────────────────────
type Seed = {
  fecha: string;
  vencimiento: string;
  interes: string;
  porcenInicial: number;
  montoInicial: number;
  saldo: number;
  maxCuotas: number;
  porcIni: number;
  condicionId: string;
  estado: string;
  flag: string;
  codigo: string;
  tipoDeuda: string;
  totalpagar: number;
  emision: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  seed: Seed | null;
  codigoContribuyente?: string;
  nombreContribuyente?: string;
  /** Usuario logueado (operador) para el simulado. */
  operador?: string;
  /** Recibos seleccionados en la grilla del Estado de Cuenta. */
  deuda?: SimuladoDeudaReciboPayload[];
  /** Se llama tras generar el convenio (el padre refresca la grilla). */
  onGenerated?: () => void;
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-700 text-right focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500";
const labelClass = "mb-0.5 block text-[10px] font-medium text-slate-600";

export default function FraccionarDeudaModal({
  isOpen,
  onClose,
  seed,
  codigoContribuyente,
  nombreContribuyente,
  operador = "",
  deuda = [],
  onGenerated,
}: Props) {
  // Campo local: lo que el usuario PUEDE editar en el modal
  const [txtInicial, setTxtInicial] = useState("");
  const [txtNumero, setTxtNumero] = useState("4");
  // Derivados readonly
  const [txtPorcentaje, setTxtPorcentaje] = useState("0.00");
  const [txtSaldo, setTxtSaldo] = useState("0.00");
  const [txtFact, setTxtFact] = useState("0.00");
  const [txtSininteres, setTxtSininteres] = useState("0.00");
  const [txtConinteres, setTxtConinteres] = useState("0.00");
  // Grilla
  const [cuotas, setCuotas] = useState<FraccionarCuotasRow[]>([]);
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Responsable (legacy: divResponsable / divDatResp)
  const [representante, setRepresentante] = useState("0");
  const [txtCodResp, setTxtCodResp] = useState("");
  const [txtDocResp, setTxtDocResp] = useState("");
  const [txtNombResp, setTxtNombResp] = useState("");
  const [loadingApoderado, setLoadingApoderado] = useState(false);
  // Simulado (reporte hijo)
  const [loadingSimulado, setLoadingSimulado] = useState(false);
  const [confirmSimularOpen, setConfirmSimularOpen] = useState(false);
  // Generar Convenio (grabación real + reporte)
  const [loadingConvenio, setLoadingConvenio] = useState(false);
  const [convenioGenerado, setConvenioGenerado] = useState<string | null>(null);
  const [confirmConvenioOpen, setConfirmConvenioOpen] = useState(false);
  const [simuladoHtml, setSimuladoHtml] = useState<string | null>(null);
  const [simuladoPdf, setSimuladoPdf] = useState<ReturnType<
    typeof construirConfigPdfConvenioSimulado
  > | null>(null);
  // Mirror del atributo `tag` del legado: guarda cod/doc/nomb del Apoderado
  // al alternar de vuelta a Propietario/Conductor para restaurarlos luego.
  const tagSavedRef = useRef({ cod: "", doc: "", nomb: "" });
  // Guard contra llamadas duplicadas (Enter + blur disparando al mismo código).
  const lastLookupRef = useRef("");

  // Cambios al abrir (o si seed cambia vía props).
  useEffect(() => {
    if (!isOpen || !seed) {
      // Reset al cerrar → la próxima apertura arranca limpio.
      setCuotas([]);
      setTxtFact("0.00");
      setTxtSininteres("0.00");
      setTxtConinteres("0.00");
      setError(null);
      setSuccess(null);
      setRepresentante("0");
      setTxtCodResp("");
      setTxtDocResp("");
      setTxtNombResp("");
      setConvenioGenerado(null);
      setConfirmConvenioOpen(false);
      setConfirmSimularOpen(false);
      tagSavedRef.current = { cod: "", doc: "", nomb: "" };
      lastLookupRef.current = "";
      return;
    }
    setTxtInicial(seed.montoInicial.toFixed(2));
    setTxtNumero("4");
    setTxtPorcentaje(seed.porcenInicial.toFixed(2));
    setTxtSaldo(seed.saldo.toFixed(2));
  }, [isOpen, seed]);

  // Modal-foco: solo el modal que esté en la cima de la pila global
  // responde al Escape. Los demás quedan en segundo plano.
  const modalId = useModalStack(isOpen);

  // ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  if (!isOpen || !seed) return null;

  const totalpagar = seed.totalpagar;

  // ─── Mirror de getporcentaje() del legado: onBlur de txtInicial ───
  const handleInicialBlur = () => {
    const txtInicialN = Number(String(txtInicial).replace(",", "")) || 0;
    const pct = totalpagar > 0 ? (txtInicialN / totalpagar) * 100 : 0;
    const saldo = totalpagar - txtInicialN;

    // Validación del % mínimo (si vino de condicion: solo cuando hay excepción).
    if (seed.estado === "1" && seed.porcIni > 0 && pct < seed.porcIni) {
      setError(`El porcentaje no puede ser menor al ${seed.porcIni}%.`);
      setTxtInicial("0.00");
      setTxtPorcentaje("0.00");
      setTxtSaldo("0.00");
      setTxtFact("0.00");
      setTxtSininteres("0.00");
      setTxtConinteres("0.00");
      setCuotas([]);
      return;
    }
    setError(null);
    setTxtPorcentaje(pct.toFixed(2));
    setTxtSaldo(Math.max(0, saldo).toFixed(2));
  };

  // ─── Mirror de mostrarcuotas(max_cuotas) ───
  const handleCalcularCuotas = async () => {
    setError(null);
    setSuccess(null);
    const cuotasN = Number(txtNumero) || 0;
    const totalInicialN = Number(String(txtInicial).replace(",", "")) || 0;
    const totalDeudaN = totalpagar;

    if (totalInicialN > totalDeudaN) {
      setError("El monto de la cuota inicial no puede ser mayor al monto total.");
      setTxtInicial("0.00");
      setCuotas([]);
      return;
    }
    if (cuotasN <= 0 || cuotasN > seed.maxCuotas) {
      setError("La cantidad de cuotas no está permitida.");
      return;
    }
    if (totalInicialN === 0) {
      setError("Ingrese el monto de la cuota inicial.");
      return;
    }

    setLoadingCuotas(true);
    try {
      const result = await getCuotasConvenioAction({
        cuotas: cuotasN,
        total_deuda: totalDeudaN,
        total_inici: totalInicialN,
        fec_gen: seed.fecha,
        fec_cuo: seed.vencimiento,
      });
      if (!result.success) {
        setError(result.error || "Error al calcular las cuotas.");
        return;
      }
      const rows = result.data;
      setCuotas(rows);
      setSuccess("Cuotas calculadas correctamente.");
      // Totales del legado
      let sinInteres = 0;
      let conInteres = 0;
      let fact = 0;
      for (const r of rows) {
        sinInteres += Number(r.montoCuota) || 0;
        conInteres += Number(r.cuotas) || 0;
        if (r.cuota === "01") fact = Number(r.intereses) || 0;
      }
      setTxtSininteres(sinInteres.toFixed(2));
      setTxtConinteres(conInteres.toFixed(2));
      setTxtFact(fact.toFixed(2));
    } catch {
      setError("Error al calcular las cuotas.");
    } finally {
      setLoadingCuotas(false);
    }
  };

  // ─── Responsable: alternar Apoderado (legacy cmbResponsable) ────────
  const handleRepresentanteChange = (value: string) => {
    setRepresentante(value);
    setError(null);
    if (value === "1") {
      // Apoderado: habilita el código y restaura lo guardado (tag del legado).
      setTxtCodResp(tagSavedRef.current.cod);
      setTxtDocResp(tagSavedRef.current.doc);
      setTxtNombResp(tagSavedRef.current.nomb);
      lastLookupRef.current = tagSavedRef.current.cod.padStart(7, "0");
    } else {
      // Propietario/Conductor: guarda valores actuales y limpia.
      tagSavedRef.current = {
        cod: txtCodResp,
        doc: txtDocResp,
        nomb: txtNombResp,
      };
      setTxtCodResp("");
      setTxtDocResp("");
      setTxtNombResp("");
      lastLookupRef.current = "";
    }
  };

  // ─── Lookup de Apoderado (legacy fraccionar/contribuyente) ──────────
  const lookupApoderado = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;
    const padded = trimmed.padStart(7, "0").slice(-7);
    // Guard: mismo código ya consultado (Enter + blur duplicados).
    if (loadingApoderado || padded === lastLookupRef.current) return;
    lastLookupRef.current = padded;
    setTxtCodResp(padded);
    setLoadingApoderado(true);
    try {
      const result = await getApoderadoConvenioAction(padded);
      if (!result.success) {
        setError(result.error || "No se encontró el Apoderado.");
        setTxtDocResp("");
        setTxtNombResp("");
        return;
      }
      const { doc, paterno, materno, nombre, tipoPersona } = result.data;
      // Bug del legado corregido: `if (Datos[4] = '01')` era asignación.
      if (tipoPersona !== "01") {
        setError("El Apoderado debe ser una Persona Natural");
        setTxtDocResp("");
        setTxtNombResp("");
        return;
      }
      setError(null);
      setTxtDocResp(doc);
      setTxtNombResp(
        `${paterno} ${materno} ${nombre}`.replace(/\s+/g, " ").trim(),
      );
    } catch {
      setError("Error al consultar el apoderado.");
      setTxtDocResp("");
      setTxtNombResp("");
    } finally {
      setLoadingApoderado(false);
    }
  };

  // ─── Simular Convenio (legacy generasimulado, TpoDoc=0) ─────────────
  // 1) Validaciones (equiv. al JS legacy) → si pasa, abre ConfirmDialog.
  const handleSimular = () => {
    setError(null);

    // 1) Debe haber cuotas calculadas.
    if (cuotas.length === 0) {
      setError("Calcule las cuotas del convenio antes de generar la simulación.");
      return;
    }
    // 2) Debe haber recibos seleccionados (vienen del Estado de Cuenta).
    if (deuda.length === 0) {
      setError("Seleccione al menos un registro.");
      return;
    }
    // 3) Porcentaje mínimo (legacy: txtPorcentaje < porc_ini).
    const pct = Number(String(txtPorcentaje).replace(",", "")) || 0;
    if (seed.porcIni > 0 && pct < seed.porcIni) {
      setError(`El porcentaje no puede ser menor al ${seed.porcIni}%.`);
      return;
    }

    setConfirmSimularOpen(true);
  };

  // 2) Confirmado → llama al backend y arma el reporte.
  const ejecutarSimulado = async () => {
    if (loadingSimulado) return;
    setLoadingSimulado(true);
    setError(null);
    try {
      const totalInicialN = Number(String(txtInicial).replace(",", "")) || 0;
      const result = await getSimuladoConvenioAction({
        deuda,
        codigo: codigoContribuyente ?? seed.codigo,
        numeroCuotas: Number(txtNumero) || 0,
        totalDeuda: totalpagar,
        totalInicial: totalInicialN,
        fecGen: seed.fecha,
        fecCuo: seed.vencimiento,
        codResp: representante === "1" ? txtCodResp : "",
        operador,
        estacion: "",
      });
      if (!result.success) {
        setError(result.error || "Error al generar el simulado del convenio.");
        return;
      }

      const plantilla = await obtenerPlantillaReporteConvenioSimuladoAction();
      if (!plantilla.success) {
        setError(plantilla.error);
        return;
      }

      const data: SimuladoConvenioData = result.data;
      setSimuladoHtml(construirHtmlReporteConvenioSimulado(data, plantilla.data));
      setSimuladoPdf(construirConfigPdfConvenioSimulado(data));
    } catch {
      setError("Error al generar el simulado del convenio.");
    } finally {
      setLoadingSimulado(false);
    }
  };

  // ─── Generar Convenio (legacy generaconvenio → Rentas.GeneraConvenio) ──
  // 1) Validaciones (mismas del simulado + no regenerar).
  const handleGenerarConvenio = () => {
    setError(null);
    setSuccess(null);

    if (convenioGenerado) {
      setError(`Ya se generó el convenio N° ${convenioGenerado}.`);
      return;
    }
    if (cuotas.length === 0) {
      setError("Calcule las cuotas del convenio antes de generar.");
      return;
    }
    if (deuda.length === 0) {
      setError("Seleccione al menos un registro.");
      return;
    }
    const pct = Number(String(txtPorcentaje).replace(",", "")) || 0;
    if (seed.porcIni > 0 && pct < seed.porcIni) {
      setError(`El porcentaje no puede ser menor al ${seed.porcIni}%.`);
      return;
    }

    setConfirmConvenioOpen(true);
  };

  // 2) Confirmado → graba el convenio, bloquea campos, refresca la grilla
  //    del padre y muestra el reporte del convenio (ReporteViewerModal).
  const ejecutarGenerarConvenio = async () => {
    if (loadingConvenio) return;
    setLoadingConvenio(true);
    setError(null);
    setSuccess(null);
    try {
      const totalInicialN = Number(String(txtInicial).replace(",", "")) || 0;
      const gen = await generarConvenioAction({
        deuda,
        codigo: codigoContribuyente ?? seed.codigo,
        numeroCuotas: Number(txtNumero) || 0,
        totalDeuda: totalpagar,
        totalInicial: totalInicialN,
        fecGen: seed.fecha,
        fecCuo: seed.vencimiento,
        codResp: representante === "1" ? txtCodResp : "",
        operador,
        estacion: getPcName(),
        condicionId: seed.condicionId,
        tipoDeuda: seed.tipoDeuda,
      });
      if (!gen.success) {
        setError(gen.error || "Error al intentar generar el convenio.");
        return;
      }

      const convenio = gen.data.convenio;
      setConvenioGenerado(convenio);
      setSuccess(`Se generó el convenio N° ${convenio} correctamente.`);
      // Refresca la grilla de recibos del Estado de Cuenta (mostrarRecContri).
      onGenerated?.();

      // Reporte del convenio generado (legacy: JasperReport ReporteConvenio).
      const [reporte, plantilla] = await Promise.all([
        getReporteConvenioAction(codigoContribuyente ?? seed.codigo, convenio),
        obtenerPlantillaReporteConvenioAction(),
      ]);
      if (reporte.success && plantilla.success) {
        const data: ConvenioReporteData = reporte.data;
        setSimuladoHtml(construirHtmlReporteConvenio(data, plantilla.data));
        setSimuladoPdf(construirConfigPdfConvenio(data));
      } else {
        // El convenio YA quedó grabado; solo falló el reporte.
        const msg = !reporte.success
          ? reporte.error
          : !plantilla.success
            ? plantilla.error
            : null;
        setError(
          msg ?? "El convenio se generó, pero no se pudo cargar el reporte.",
        );
      }
    } catch {
      setError("Error al intentar generar el convenio.");
    } finally {
      setLoadingConvenio(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
      >
      <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <div>
            <h2 className="text-[12px] font-semibold text-slate-800">
              Fraccionar Deuda
            </h2>
            {(codigoContribuyente || seed.tipoDeuda) && (
              <p className="mt-0.5 text-[10px] text-slate-500">
                {nombreContribuyente ? `${nombreContribuyente} · ` : ""}
                {codigoContribuyente ? `Cód. ${codigoContribuyente}` : ""}
                {seed.tipoDeuda ? ` (${seed.tipoDeuda})` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Responsable (legacy: divResponsable / divDatResp) */}
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <label className={labelClass}>Responsable</label>
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-sat-cyan focus:outline-none"
              value={representante}
              onChange={(e) => handleRepresentanteChange(e.target.value)}
            >
              {seed.tipoDeuda === "PIT" ? (
                <>
                  <option value="0">Conductor</option>
                  <option value="2">Propietario</option>
                </>
              ) : (
                <option value="0">Propietario</option>
              )}
              <option value="1">Apoderado</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Código</label>
            <div className="relative">
              <input
                className={`${inputClass} w-20 text-left ${
                  representante === "1" ? "bg-white" : ""
                }`}
                value={txtCodResp}
                readOnly={representante !== "1"}
                tabIndex={representante === "1" ? 0 : -1}
                maxLength={7}
                onChange={(e) => {
                  // Solo dígitos (el código se rellena con ceros al consultar).
                  setTxtCodResp(e.target.value.replace(/\D/g, ""));
                  lastLookupRef.current = "";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void lookupApoderado(txtCodResp);
                  }
                }}
                onBlur={() => {
                  if (representante === "1") void lookupApoderado(txtCodResp);
                }}
              />
              {loadingApoderado && (
                <Loader2
                  size={12}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                />
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Documento</label>
            <input
              className={`${inputClass} w-28 text-left`}
              value={txtDocResp}
              readOnly
              tabIndex={-1}
              maxLength={11}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className={labelClass}>Nombre</label>
            <input
              className={`${inputClass} text-left`}
              value={txtNombResp}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4 md:flex-row">
          {/* Left column — fields */}
          <div className="w-full shrink-0 space-y-3 md:w-72">
            <fieldset className="rounded border border-slate-200 bg-slate-50/50 p-3">
              <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Fraccionamiento
              </legend>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Costo Emisión</label>
                    <input
                      className={inputClass}
                      value={seed.emision}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha</label>
                    <input
                      className={inputClass}
                      value={seed.fecha}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Monto Total a Fracc.</label>
                  <input
                    className={inputClass}
                    value={seed.totalpagar.toFixed(2)}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Cuota Inicial (S/.)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      value={txtInicial}
                      onChange={(e) => setTxtInicial(e.target.value)}
                      onBlur={handleInicialBlur}
                      disabled={!!convenioGenerado}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>%</label>
                    <input
                      className={inputClass}
                      value={txtPorcentaje}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Saldo (S/.)</label>
                  <input
                    className={inputClass}
                    value={txtSaldo}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div>
                  <label className={labelClass}>Interés Aprobado (S/.)</label>
                  <input
                    className={inputClass}
                    value={seed.interes}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded border border-slate-200 bg-slate-50/50 p-3">
              <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Cuotas e Intereses
              </legend>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>N° de Cuotas</label>
                  <input
                    type="number"
                    min={1}
                    max={seed.maxCuotas}
                    className={inputClass}
                    value={txtNumero}
                    onChange={(e) => setTxtNumero(e.target.value)}
                    disabled={!!convenioGenerado}
                  />
                </div>

                <div>
                  <label className={labelClass}>Intereses del Fracc. (S/.)</label>
                  <input
                    className={inputClass}
                    value={txtFact}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div>
                  <label className={labelClass}>Total sin Intereses (S/.)</label>
                  <input
                    className={inputClass}
                    value={txtSininteres}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div>
                  <label className={labelClass}>Total con Intereses (S/.)</label>
                  <input
                    className={inputClass}
                    value={txtConinteres}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Vencimiento de la 1ª Cuota
                  </label>
                  <input
                    className={inputClass}
                    value={seed.vencimiento}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Right column — grid */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Detalle de Cuotas
                </p>
                <p className="text-[10px] text-slate-500">
                  Máximo {seed.maxCuotas} cuotas
                </p>
              </div>
              <div className="max-h-[380px] overflow-auto rounded bg-white">
                {cuotas.length === 0 ? (
                  <p className="p-3 text-[11px] text-slate-500">
                    Presione &quot;Calcular Cuotas&quot; para generar el
                    detalle.
                  </p>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr className="text-slate-700">
                        <th className="px-2 py-1.5 text-left font-semibold">
                          Cuota
                        </th>
                        <th className="px-2 py-1.5 text-right font-semibold">
                          Monto (S/.)
                        </th>
                        <th className="px-2 py-1.5 text-right font-semibold">
                          Intereses (S/.)
                        </th>
                        <th className="px-2 py-1.5 text-left font-semibold">
                          Vencimiento
                        </th>
                        <th className="px-2 py-1.5 text-right font-semibold">
                          Total (S/.)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotas.map((r, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-2 py-1 text-slate-800">
                            {r.cuota}
                          </td>
                          <td className="px-2 py-1 text-right text-slate-800">
                            {r.montoCuota}
                          </td>
                          <td className="px-2 py-1 text-right text-slate-800">
                            {r.intereses}
                          </td>
                          <td className="px-2 py-1 text-slate-800">
                            {r.fecGen}
                          </td>
                          <td className="px-2 py-1 text-right text-slate-800">
                            {r.cuotas}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
          <div className="min-w-0 flex-1">
            {error && (
              <p className="text-[10px] text-red-600">{error}</p>
            )}
            {success && (
              <p className="text-[10px] text-emerald-700">{success}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCalcularCuotas}
              disabled={loadingCuotas || !!convenioGenerado}
              className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-3 py-1 text-[11px] font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCuotas && (
                <Loader2 size={12} className="animate-spin" />
              )}
              Calcular Cuotas
            </button>
            <button
              type="button"
              onClick={handleSimular}
              disabled={loadingSimulado || !!convenioGenerado}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSimulado && (
                <Loader2 size={12} className="animate-spin" />
              )}
              Simular
            </button>
            <button
              type="button"
              onClick={handleGenerarConvenio}
              disabled={loadingConvenio || !!convenioGenerado}
              className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-3 py-1 text-[11px] font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingConvenio && (
                <Loader2 size={12} className="animate-spin" />
              )}
              Generar Convenio
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ══ Confirmación: Generar Simulación de Convenio ══ */}
      <ConfirmDialog
        isOpen={confirmSimularOpen}
        title="Fraccionamiento"
        message="¿Seguro de Generar la Simulación del Convenio?"
        confirmLabel="Sí"
        cancelLabel="No"
        loading={loadingSimulado}
        onConfirm={() => {
          setConfirmSimularOpen(false);
          void ejecutarSimulado();
        }}
        onCancel={() => setConfirmSimularOpen(false)}
      />

      {/* ══ Confirmación: Generar el Convenio (grabación real) ══ */}
      <ConfirmDialog
        isOpen={confirmConvenioOpen}
        title="Fraccionamiento"
        message="¿Seguro de Generar el Convenio?"
        confirmLabel="Sí"
        cancelLabel="No"
        loading={loadingConvenio}
        onConfirm={() => {
          setConfirmConvenioOpen(false);
          void ejecutarGenerarConvenio();
        }}
        onCancel={() => setConfirmConvenioOpen(false)}
      />

      {/* ══ Reporte Simulación de Convenio (vista previa + PDF) ══ */}
      <ReporteViewerModal
        isOpen={simuladoHtml !== null}
        onClose={() => {
          setSimuladoHtml(null);
          setSimuladoPdf(null);
        }}
        html={simuladoHtml ?? ""}
        pdfConfig={simuladoPdf}
      />
    </>
  );
}
