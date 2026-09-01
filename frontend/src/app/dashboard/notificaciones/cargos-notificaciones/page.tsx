"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  XCircle,
  LogOut,
  Search,
  Loader2,
  AlertCircle,
  FileUp,
  FileText,
} from "lucide-react";
import {
  listarTiposValorAction,
  listarNotificadoresAction,
  validarValorAction,
  grabarCargoAction,
  type TipoValorOption,
  type NotificadorOption,
} from "@/actions/notificaciones/cargos-notificaciones";

// ── Static catalogs (provided by the user, not DB-driven) ──

const VISITAS = [
  { value: "Primera", label: "Primera" },
  { value: "Segunda", label: "Segunda" },
];

const SITUACIONES = [
  { value: "Presente", label: "Sí estuvo Presente" },
  { value: "No Presente", label: "No estuvo Presente" },
  { value: "No Ubicado", label: "No se ubicó la Dirección" },
];

const TABS = ["Datos de Recepción", "Aviso de Visita", "Cedulón", "Acta Registro"];

// ── Helpers ─────────────────────────────────────────────────

/** Case-insensitive column lookup over a dynamic SP row. */
function getField(
  row: Record<string, unknown> | undefined,
  ...names: string[]
): string {
  if (!row) return "";
  const key = Object.keys(row).find((k) => {
    const lower = k.toLowerCase();
    return names.some((n) => lower === n.toLowerCase());
  });
  return key !== undefined ? String(row[key] ?? "") : "";
}

/** Pad a numeric code to 7 chars with leading zeros (SP expects this width). */
function padNumValor(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.padStart(7, "0");
}

const EMPTY_DETALLE = {
  codigo: "",
  doc_identidad: "",
  contribuyente: "",
  direccion: "",
  monto: "",
};

// ── Main Page ───────────────────────────────────────────────

export default function CargosNotificacionesPage() {
  // ── Combos ────────────────────────────────────────────────
  const [tiposValor, setTiposValor] = useState<TipoValorOption[]>([]);
  const [notificadores, setNotificadores] = useState<NotificadorOption[]>([]);
  const [combosLoaded, setCombosLoaded] = useState(false);

  // ── Form: identificación del valor ────────────────────────
  const [idValor, setIdValor] = useState("");
  const [numValor, setNumValor] = useState("");
  const [anoValor, setAnoValor] = useState("");
  const [validando, setValidando] = useState(false);

  // ── Form: cargo ───────────────────────────────────────────
  const [idNotificador, setIdNotificador] = useState("");
  const [numCargo, setNumCargo] = useState("");
  const [anoCargo, setAnoCargo] = useState("");

  // ── Detalle del valor (rellenado por Validar) ─────────────
  const [detalle, setDetalle] = useState(EMPTY_DETALLE);
  const [tributos, setTributos] = useState<Record<string, unknown>[]>([]);

  // ── Situación / Visita ────────────────────────────────────
  const [situacion, setSituacion] = useState("");
  const [nroVisita, setNroVisita] = useState("");

  // ── Datos de Recepción ────────────────────────────────────
  const [fNotifica, setFNotifica] = useState("");
  const [parentesco, setParentesco] = useState("");
  const [nombres, setNombres] = useState("");
  const [docIdentidad, setDocIdentidad] = useState("");
  const [firma, setFirma] = useState("");
  const [direcFiscal, setDirecFiscal] = useState("");
  const [observacion, setObservacion] = useState("");

  // ── UI state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Load combos on mount (setTimeout to satisfy lint rule) ─
  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        const [tv, nf] = await Promise.all([
          listarTiposValorAction(),
          listarNotificadoresAction(),
        ]);
        if (tv.success) setTiposValor(tv.data);
        if (nf.success) setNotificadores(nf.data);
        setCombosLoaded(true);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // ── Validar valor tributario ──────────────────────────────
  const handleValidar = useCallback(async () => {
    setError(null);
    setSuccess(null);
    if (!idValor) {
      setError("Debe seleccionar un Tipo de Valor");
      return;
    }
    setValidando(true);
    try {
      const res = await validarValorAction({
        id_valor: idValor,
        num_valor: numValor,
        ano_valor: anoValor ? Number(anoValor) : undefined,
      });
      if (res.success && res.data.length > 0) {
        const first = res.data[0];
        setDetalle({
          codigo: getField(first, "codigo", "code"),
          doc_identidad: getField(first, "nro_documento", "documento", "num_doc", "doc_identidad"),
          contribuyente: getField(first, "contribuyente", "nombre", "razon_social"),
          direccion: getField(first, "direccion", "direc_fiscal", "dir"),
          monto: getField(first, "total", "monto", "monto_valor"),
        });
        // Las filas de tributos son el mismo recordset; el front renderiza por
        // sus claves dinámicas (coherente con el resto de los reportes).
        setTributos(res.data);
      } else {
        setDetalle(EMPTY_DETALLE);
        setTributos([]);
        setError(res.error ?? "No se encontró el valor");
      }
    } catch {
      setError("Error al validar el valor");
    } finally {
      setValidando(false);
    }
  }, [idValor, numValor, anoValor]);

  // ── Grabar cargo ──────────────────────────────────────────
  const handleGrabar = useCallback(async () => {
    setError(null);
    setSuccess(null);
    if (!idValor || !idNotificador) {
      setError("Debe seleccionar Tipo de Valor y Notificador");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        codigo: detalle.codigo || undefined,
        id_valor: idValor,
        num_valor: numValor,
        ano_valor: anoValor ? Number(anoValor) : undefined,
        num_cargo: numCargo,
        ano_cargo: anoCargo ? Number(anoCargo) : undefined,
        id_notificador: idNotificador ? Number(idNotificador) : undefined,
        monto: detalle.monto ? Number(detalle.monto) : undefined,
        flg_situacion: situacion || undefined,
        nro_visita: nroVisita || undefined,
        f_notifica: fNotifica || undefined,
        id_parentesco: parentesco ? Number(parentesco) : undefined,
        nombre: nombres || undefined,
        nro_documento: docIdentidad || undefined,
        id_firma: firma ? Number(firma) : undefined,
        direc_fiscal: direcFiscal || undefined,
        observacion: observacion || undefined,
      };
      const res = await grabarCargoAction(payload);
      if (res.success) {
        setSuccess(res.message ?? "Cargo registrado correctamente");
        // Limpiar en el caso de éxito
        resetForm();
      } else {
        setError(res.error ?? "Error al grabar el cargo");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setSaving(false);
    }
  }, [detalle, idValor, numValor, anoValor, numCargo, anoCargo, idNotificador,
    situacion, nroVisita, fNotifica, parentesco, nombres, docIdentidad, firma,
    direcFiscal, observacion]);

  const resetForm = () => {
    setIdValor("");
    setNumValor("");
    setAnoValor("");
    setIdNotificador("");
    setNumCargo("");
    setAnoCargo("");
    setDetalle(EMPTY_DETALLE);
    setTributos([]);
    setSituacion("");
    setNroVisita("");
    setFNotifica("");
    setParentesco("");
    setNombres("");
    setDocIdentidad("");
    setFirma("");
    setDirecFiscal("");
    setObservacion("");
  };

  const handleCancelar = () => {
    setError(null);
    setSuccess(null);
    resetForm();
  };

  const tributoHeaders =
    tributos.length > 0 ? Object.keys(tributos[0]) : [];

  // ── Render helpers ────────────────────────────────────────
  const label = (text: string, w = "w-24") => (
    <label className={`${w} text-slate-600 font-bold`}>{text}</label>
  );

  const inputCls =
    "border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">Cargos de Notificación</h1>
            <p className="text-xs text-white/50 font-inter">Registro de cargos de notificación</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Sección Superior: Filtros y Validación */}
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              {label("Tipo Valor")}
              <select
                value={idValor}
                onChange={(e) => setIdValor(e.target.value)}
                className={`${inputCls} flex-1`}
                disabled={!combosLoaded}
              >
                <option value=""></option>
                {tiposValor.map((t) => (
                  <option key={t.id_valor} value={t.id_valor}>{t.nomb_val}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {label("Nro Valor")}
              <input
                type="text"
                value={numValor}
                onChange={(e) => setNumValor(e.target.value.replace(/\D/g, "").slice(0, 7))}
                onBlur={(e) => {
                  if (e.target.value) setNumValor(padNumValor(e.target.value));
                }}
                className={`${inputCls} w-24 text-center font-mono`}
                placeholder="999999"
                maxLength={7}
              />
              <span className="text-slate-600 font-bold ml-2">Año Valor</span>
              <input
                type="text"
                value={anoValor}
                onChange={(e) => setAnoValor(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={`${inputCls} w-16 text-center font-mono`}
                placeholder="9999"
                maxLength={4}
              />
              <button
                type="button"
                onClick={handleValidar}
                disabled={validando}
                className="inline-flex items-center gap-1.5 rounded bg-gray-50 border border-gray-300 px-4 py-1 hover:bg-gray-100 text-gray-700 shadow-sm disabled:opacity-50"
              >
                {validando ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Validar
              </button>
            </div>

            <div className="flex items-center gap-2">
              {label("Notificador")}
              <select
                value={idNotificador}
                onChange={(e) => setIdNotificador(e.target.value)}
                className={`${inputCls} flex-1`}
                disabled={!combosLoaded}
              >
                <option value=""></option>
                {notificadores.map((n) => (
                  <option key={n.codigo_autoridad} value={n.codigo_autoridad}>{n.notificador}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {label("Nro Cargo")}
              <input
                type="text"
                value={numCargo}
                onChange={(e) => setNumCargo(e.target.value.replace(/\D/g, "").slice(0, 7))}
                onBlur={(e) => {
                  if (e.target.value) setNumCargo(padNumValor(e.target.value));
                }}
                className={`${inputCls} w-24 text-center font-mono`}
                placeholder="999999"
                maxLength={7}
              />
              <span className="text-slate-600 font-bold ml-2">Año Cargo</span>
              <input
                type="text"
                value={anoCargo}
                onChange={(e) => setAnoCargo(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={`${inputCls} w-16 text-center font-mono`}
                placeholder="9999"
                maxLength={4}
              />
              <span className="mx-2 text-gray-400">...</span>
              <span className="text-slate-600 font-bold ml-auto">Monto Valor</span>
              <input
                type="text"
                value={detalle.monto}
                readOnly
                className={`${inputCls} w-32 bg-gray-50 text-right`}
                placeholder="999999"
              />
            </div>
          </div>

          {/* Espacio para imagen/código QR opcional */}
          <div className="col-span-4">
            <div className="border border-gray-300 rounded bg-gray-400 h-32 w-full flex items-center justify-center text-white italic">
              Imagen / Adjunto
            </div>
          </div>
        </div>

        {/* Notificación de error / éxito */}
        {(error || success) && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {error ? <AlertCircle size={14} /> : <Save size={14} />}
            <span className="font-medium">{error ?? success}</span>
          </div>
        )}

        {/* Sección: Detalle del Valor Tributario */}
        <div className="border border-gray-300 rounded p-4 relative pt-6 bg-white/50">
          <span className="absolute -top-3 left-4 bg-gray-100 px-2 text-gray-700 font-bold italic">Detalle del Valor Tributario</span>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold">Código</span>
                <input type="text" value={detalle.codigo} readOnly className={`${inputCls} w-32 bg-gray-50`} />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-slate-600 font-bold">Documento Identidad</span>
                <input type="text" value={detalle.doc_identidad} readOnly className={`${inputCls} w-40 bg-gray-50`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-600 font-bold">Contribuyente</span>
              <input type="text" value={detalle.contribuyente} readOnly className={`${inputCls} flex-1 bg-gray-50`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-600 font-bold">Dirección</span>
              <input type="text" value={detalle.direccion} readOnly className={`${inputCls} flex-1 bg-gray-50`} />
            </div>
          </div>

          {/* Tabla de Tributos */}
          <div className="mt-4 border border-gray-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse bg-white">
              <thead className="bg-white border-b border-gray-300 text-gray-600 text-xs uppercase font-bold">
                {tributoHeaders.length > 0 ? (
                  <tr>
                    {tributoHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 border-r border-gray-300">{h}</th>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2 border-r border-gray-300">Tributo</th>
                    <th className="px-3 py-2 border-r border-gray-300">Año</th>
                    <th className="px-3 py-2 border-r border-gray-300">Periodo</th>
                    <th className="px-3 py-2 border-r border-gray-300 text-right">Imp. Insol</th>
                    <th className="px-3 py-2 border-r border-gray-300 text-right">Imp. Reaj</th>
                    <th className="px-3 py-2 border-r border-gray-300 text-right">Costo Emis.</th>
                    <th className="px-3 py-2 border-r border-gray-300 text-right">Interés</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tributos.length > 0 ? (
                  tributos.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      {tributoHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 border-r border-gray-300 text-sm text-slate-600">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-gray-100 last:border-0 h-24">
                    <td colSpan={8} className="px-3 py-2 italic text-gray-400 text-sm">....</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección: Situación y Visita */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">Nro Visita</span>
            <select
              value={nroVisita}
              onChange={(e) => setNroVisita(e.target.value)}
              className={`${inputCls} w-24`}
            >
              <option value=""></option>
              {VISITAS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-slate-600 font-bold">Situación</span>
            <select
              value={situacion}
              onChange={(e) => setSituacion(e.target.value)}
              className={`${inputCls} flex-1`}
            >
              <option value=""></option>
              {SITUACIONES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs de Recepción */}
        <div className="border border-gray-300 rounded bg-white/50">
          <div className="flex border-b border-gray-300 bg-gray-50 overflow-x-auto">
            {TABS.map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-xs font-bold border-r border-gray-300 whitespace-nowrap ${
                  activeTab === idx ? "bg-white text-gray-800" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 0 && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-32 text-slate-600 font-bold">Fecha Notificación</span>
                  <input
                    type="date"
                    value={fNotifica}
                    onChange={(e) => setFNotifica(e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 text-slate-600 font-bold text-right">Parentesco</span>
                  <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={`${inputCls} flex-1`}>
                    <option value=""></option>
                  </select>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <span className="w-32 text-slate-600 font-bold">Nombres</span>
                  <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} className={`${inputCls} flex-1`} />
                  <button type="button" className="px-2 py-1 border border-gray-300 rounded bg-gray-50">...</button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-32 text-slate-600 font-bold">Doc. Identidad</span>
                  <input type="text" value={docIdentidad} onChange={(e) => setDocIdentidad(e.target.value)} className={`${inputCls} flex-1`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 text-slate-600 font-bold text-right">Firmó</span>
                  <select value={firma} onChange={(e) => setFirma(e.target.value)} className={`${inputCls} w-24`}>
                    <option value=""></option>
                  </select>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <span className="w-32 text-slate-600 font-bold">Dirección Fiscal</span>
                  <input type="text" value={direcFiscal} onChange={(e) => setDirecFiscal(e.target.value)} className={`${inputCls} flex-1`} />
                  <button type="button" className="px-2 py-1 border border-gray-300 rounded bg-gray-50">...</button>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <span className="w-32 text-slate-600 font-bold">Observación</span>
                  <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)} className={`${inputCls} flex-1`} />
                </div>
              </div>
            </div>
          )}

          {activeTab > 0 && (
            <div className="p-8 text-center text-sm italic text-gray-400">
              Contenido de &quot;{TABS[activeTab]}&quot; - pendiente
            </div>
          )}
        </div>

        {/* Botón de Acción Especial */}
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            onClick={() => setError(null)}
          >
            <FileUp size={14} />
            Subir Cargo Notificación <span className="text-gray-400">....</span>
          </button>
        </div>
      </div>

      {/* Footer: Acciones Finales */}
      <div className="bg-gray-100 border-t border-gray-300 p-4 flex justify-center gap-8">
        <button
          type="button"
          onClick={handleGrabar}
          disabled={saving}
          className="inline-flex items-center gap-1.5 w-32 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors justify-center disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Grabar
        </button>
        <button
          type="button"
          onClick={handleCancelar}
          className="inline-flex items-center gap-1.5 w-32 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors justify-center"
        >
          <XCircle size={14} />
          Cancelar
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 w-32 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors justify-center"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>
    </div>
  );
}
