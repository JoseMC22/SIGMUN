"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, FileText, Search } from "lucide-react";
import {
  getMotivoDescargoComboAction,
  getNotariaComboAction,
  guardarBajaPredioAction,
  type BajaPredioComboOption,
  type AdquirienteGridItem,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import AdquirienteBusquedaModal from "./adquiriente-busqueda-modal";
import { getStoredUser, getPcName } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

// ─── Props ──────────────────────────────────────────────────

interface PredioContext {
  codigoContribuyente: string;
  nombreContribuyente: string;
  codPred: string;
  anexo: string; // may be "anexo-sub_anexo" or plain anexo
  direccion: string;
  anno: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  predio: PredioContext | null;
  onSaved?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Convert YYYY-MM-DD (input date) to DD/MM/YYYY for SP, or pass through if already DD/MM/YYYY
function toSPDate(value: string): string {
  const v = value.trim();
  if (!v) return "";
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return v;
}

// ─── Component ──────────────────────────────────────────────

export default function BajaPredioModal({ isOpen, onClose, predio, onSaved }: Props) {
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);
  const rootRef = useRef<HTMLDivElement>(null);

  // Combos
  const [motivos, setMotivos] = useState<BajaPredioComboOption[]>([]);
  const [notarias, setNotarias] = useState<BajaPredioComboOption[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);

  // Form
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(""); // YYYY-MM-DD for input date, converted on save
  const [porc, setPorc] = useState("");
  const [glosa, setGlosa] = useState("");
  const [codigoAdquiriente, setCodigoAdquiriente] = useState("");
  // Legacy muestraDatosBajaPred fields populated from the selected grid row:
  // txtPersona<-tipopersona, txtSub<-subpersona, txtTipoDocumento<-tipodoc,
  // txtNro<-documento, txtRazon<-nombres
  const [tipoPersona, setTipoPersona] = useState("");
  const [subTipoPersona, setSubTipoPersona] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [nroDocumento, setNroDocumento] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [showBuscador, setShowBuscador] = useState(false);
  const [notaria, setNotaria] = useState("");

  // Status
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [operador, setOperador] = useState("");
  const [estacion, setEstacion] = useState("");

  const isMotivo17 = motivo === "17";

  // Split anexo into anexo / sub_anexo on demand
  const splitAnexo = (raw: string): { anexo: string; subAnexo: string } => {
    const v = (raw ?? "").trim();
    if (!v) return { anexo: "", subAnexo: "" };
    const dash = v.indexOf("-");
    if (dash === -1) return { anexo: v, subAnexo: "" };
    return { anexo: v.substring(0, dash).trim(), subAnexo: v.substring(dash + 1).trim() };
  };

  // Focus on open
  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  // Escape
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, topModal, saving, onClose]);

  // Load combos + reset form on open
  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    setSaving(false);
    setMotivo("");
    setFecha("");
    setPorc("");
    setGlosa("");
    setCodigoAdquiriente("");
    setTipoPersona("");
    setSubTipoPersona("");
    setTipoDocumento("");
    setNroDocumento("");
    setRazonSocial("");
    setShowBuscador(false);
    setNotaria("");

    const user = getStoredUser();
    setOperador(user?.username ?? "");
    // estacion from PC name / session hostname
    const pcFromStorage = getPcName?.() ?? "";
    if (pcFromStorage) setEstacion(pcFromStorage);
    checkSessionAction().then((s) => {
      if (s?.hostname) setEstacion(s.hostname);
    });

    let cancelled = false;
    setCombosLoading(true);
    Promise.all([getMotivoDescargoComboAction(), getNotariaComboAction()])
      .then(([m, n]) => {
        if (cancelled) return;
        if (m.success) setMotivos(m.data);
        else setMessage({ type: "error", text: m.error });
        if (n.success) setNotarias(n.data);
        else if (m.success) setMessage({ type: "error", text: n.error });
      })
      .finally(() => {
        if (!cancelled) setCombosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Motivo 17 behaviour: disable/clear fields + autofill today
  useEffect(() => {
    if (!isOpen) return;
    if (isMotivo17) {
      setPorc("");
      setCodigoAdquiriente("");
      setTipoPersona("");
      setSubTipoPersona("");
      setTipoDocumento("");
      setNroDocumento("");
      setRazonSocial("");
      setShowBuscador(false);
      setNotaria("");
      setGlosa("");
      setFecha(todayDDMMYYYY());
    } else {
      // when switching back from 17 to other, clear the auto-filled DD/MM/YYYY so user picks again via date input
      // keep fecha as typed DD/MM/YYYY would not match input date; reset to empty
      if (fecha && fecha.includes("/")) setFecha("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivo]);

  // Legacy muestraDatosBajaPred: populate the adquiriente fields from the
  // selected buscador grid row, then close the buscador.
  const handleSelectAdquiriente = (record: AdquirienteGridItem) => {
    setCodigoAdquiriente(record.codigo);
    setTipoPersona(record.tipopersona);
    setSubTipoPersona(record.subpersona);
    setTipoDocumento(record.tipodoc);
    setNroDocumento(record.documento);
    setRazonSocial(record.nombres);
    setMessage(null);
  };

  const grabar = async () => {
    if (saving || combosLoading) return;
    if (!predio) {
      setMessage({ type: "error", text: "No se seleccionó ningún predio." });
      return;
    }
    if (!motivo) {
      setMessage({ type: "error", text: "Seleccione el motivo de descargo." });
      return;
    }
    if (!isMotivo17) {
      if (!codigoAdquiriente.trim()) {
        setMessage({ type: "error", text: "Ingrese el código del adquiriente." });
        return;
      }
      if (!fecha.trim()) {
        setMessage({ type: "error", text: "Ingrese la fecha de transferencia." });
        return;
      }
    }

    setSaving(true);
    setMessage(null);

    const { anexo, subAnexo } = splitAnexo(predio.anexo);
    // fecha for SP is DD/MM/YYYY
    let fechTrans = "";
    if (isMotivo17) {
      fechTrans = todayDDMMYYYY();
    } else {
      fechTrans = toSPDate(fecha);
    }

    const payload = {
      codigo: predio.codigoContribuyente.trim(),
      anno: predio.anno.trim(),
      cod_pred: predio.codPred.trim(),
      anexo,
      sub_anexo: subAnexo,
      direccion_predio: predio.direccion ?? "",
      id_motivo_descargo: motivo,
      porc_propiedad: isMotivo17 ? "" : porc.trim() || "100", // legacy: empty % defaults to 100
      observacion: isMotivo17 ? "" : glosa.trim().toUpperCase(),
      fech_transparencia: isMotivo17 ? "" : fechTrans,
      id_notaria: isMotivo17 ? "" : notaria,
      codigo_adquiriente: isMotivo17 ? "" : codigoAdquiriente.trim(),
      operador: operador || getStoredUser()?.username?.toUpperCase() || "",
      estacion: estacion || "",
      tipo_pred: "1",
    };

    try {
      const res = await guardarBajaPredioAction(payload);
      if (!res.success) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      // res.data is {success, mensaje}
      const innerSuccess = (res.data as { success?: boolean })?.success ?? true;
      const innerMsg = (res.data as { mensaje?: string })?.mensaje ?? "Baja registrada correctamente.";
      if (!innerSuccess) {
        setMessage({ type: "error", text: innerMsg });
        return;
      }
      setMessage({ type: "success", text: innerMsg });
      setTimeout(() => {
        onSaved?.();
        onClose();
        setMessage(null);
      }, 1200);
    } catch {
      setMessage({ type: "error", text: "Error al registrar la baja del predio." });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";
  const readonlyClass = "w-full rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-500 cursor-not-allowed";
  const fieldsetClass = "rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5";
  const legendClass = "flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy";

  const disabledMotivo17 = isMotivo17;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" tabIndex={-1}>
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">Baja de Predio</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 py-2.5 space-y-2.5">
          {/* Datos Generales del Predio */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              <FileText size={13} />
              Datos Generales del Predio
            </legend>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={labelClass}>Código Contribuyente</label>
                  <input type="text" value={predio?.codigoContribuyente ?? ""} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Año</label>
                  <input type="text" value={predio?.anno ?? ""} readOnly className={readonlyClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contribuyente</label>
                <input type="text" value={predio?.nombreContribuyente ?? ""} readOnly className={readonlyClass} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={labelClass}>Código Predio</label>
                  <input type="text" value={predio?.codPred ?? ""} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Anexo</label>
                  <input type="text" value={predio?.anexo ?? ""} readOnly className={readonlyClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Dirección del Predio</label>
                <input type="text" value={predio?.direccion ?? ""} readOnly className={readonlyClass} />
              </div>
            </div>
          </fieldset>

          {/* Datos del Descargo */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              <FileText size={13} />
              Datos del Descargo
            </legend>
            <div className="space-y-1.5">
              <div>
                <label htmlFor="baja-motivo" className={labelClass}>
                  Motivo de Descargo
                </label>
                <select
                  id="baja-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={inputClass}
                  disabled={combosLoading}
                >
                  <option value="">Seleccionar...</option>
                  {motivos.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label htmlFor="baja-fecha" className={labelClass}>
                    Fecha de Transferencia
                  </label>
                  {disabledMotivo17 ? (
                    <input id="baja-fecha" type="text" value={fecha} readOnly className={readonlyClass} />
                  ) : (
                    <input
                      id="baja-fecha"
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className={inputClass}
                      disabled={disabledMotivo17}
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="baja-porc" className={labelClass}>
                    % Propiedad
                  </label>
                  <input
                    id="baja-porc"
                    type="text"
                    inputMode="decimal"
                    value={porc}
                    onChange={(e) => setPorc(e.target.value)}
                    placeholder="Ej: 100"
                    className={inputClass}
                    disabled={disabledMotivo17}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="baja-glosa" className={labelClass}>
                  Glosa / Observación
                </label>
                <input
                  id="baja-glosa"
                  type="text"
                  value={glosa}
                  onChange={(e) => setGlosa(e.target.value.toUpperCase())}
                  placeholder="Observación"
                  className={inputClass}
                  disabled={disabledMotivo17}
                />
              </div>
            </div>
          </fieldset>

          {/* Datos del(los) Adquiriente(s) */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              <FileText size={13} />
              Datos del(los) Adquiriente(s)
            </legend>
            <div className="space-y-1.5">
              <div>
                <label htmlFor="baja-adq" className={labelClass}>
                  Código Adquiriente
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="baja-adq"
                    type="text"
                    value={codigoAdquiriente}
                    onChange={(e) => setCodigoAdquiriente(e.target.value)}
                    placeholder="Código del adquiriente"
                    className={inputClass}
                    disabled={disabledMotivo17}
                  />
                  <button
                    type="button"
                    onClick={() => setShowBuscador(true)}
                    disabled={disabledMotivo17}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    title="Buscar adquiriente"
                  >
                    <Search size={12} />
                    Buscar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={labelClass}>Tipo Persona</label>
                  <input type="text" value={tipoPersona} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Sub Tipo Persona</label>
                  <input type="text" value={subTipoPersona} readOnly className={readonlyClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={labelClass}>Tipo Documento</label>
                  <input type="text" value={tipoDocumento} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Nro Documento</label>
                  <input type="text" value={nroDocumento} readOnly className={readonlyClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Razón Social</label>
                <input type="text" value={razonSocial} readOnly className={readonlyClass} />
              </div>
              <div>
                <label htmlFor="baja-notaria" className={labelClass}>
                  Notaría
                </label>
                <select
                  id="baja-notaria"
                  value={notaria}
                  onChange={(e) => setNotaria(e.target.value)}
                  className={inputClass}
                  disabled={combosLoading || disabledMotivo17}
                >
                  <option value="">Seleccionar...</option>
                  {notarias.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {message && (
            <div className={`rounded-md border px-3 py-2 text-[11px] font-medium ${message.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`}>{message.text}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50/60 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={grabar}
              disabled={combosLoading || saving || !predio}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Grabar
            </button>
          </div>
        </div>
      </div>

      {/* Buscador de adquirientes (frmbusbajapre legacy) */}
      <AdquirienteBusquedaModal
        isOpen={showBuscador}
        onClose={() => setShowBuscador(false)}
        onSelect={handleSelectAdquiriente}
      />
    </div>
  );
}
