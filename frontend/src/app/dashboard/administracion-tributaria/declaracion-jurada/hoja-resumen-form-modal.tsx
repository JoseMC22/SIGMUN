"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, FileText } from "lucide-react";
import {
  getCombosHrAction,
  grabarHrAction,
  type HrComboOption,
  type HojaResumenData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getStoredUser } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import { toNum, fmtMonto } from "@/lib/num";

// ─── Types ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Código del contribuyente (readonly + va en el payload del SP). */
  codigoContribuyente?: string;
  numeroDoc?: string;
  razonSocial?: string;
  direccion?: string;
  annoSeleccionado?: string | null;
  /** Número de la Declaración Jurada (readonly, informativo). */
  numeroDj?: string;
  /** Fecha de la Declaración Jurada (readonly, informativo). */
  fechaDj?: string;
  /** Totales de la DDJJ para el bloque readonly de emisión (informativo, no se graban). */
  totalesDj?: TotalesDj;
  /** Hoja de Resumen existente (Rentas.sp_MHRpred @busc=3). Si viene,
   *  el modal graba en modo actualización. */
  hrExistente?: HojaResumenData | null;
  /** Callback tras guardar correctamente. */
  onSaved?: () => void;
}

interface TotalesDj {
  nroPredios?: string | number;
  totalAutovaluo?: string | number;
  baseImponible?: string | number;
  impAnual?: string | number;
  impTrimestral?: string | number;
  costoEmision?: string | number;
}

interface HojaResumenForm {
  numResol: string;
  fecResol: string;
  nroExpediente: string;
  baseLegal: string;
  regimen: string;
  motivo: string;
  vigDesde: string;
  vigHasta: string;
  observacion: string;
  bloquearEmi: string;
  /** Fecha de la DJ (editable, datepicker en el legado). */
  fecDecla: string;
  /** Fechas de vigencia del registro (txtdesde/txthasta del legado). */
  fecVigDesde: string;
  fecVigHasta: string;
}

const emptyHojaResumen: HojaResumenForm = {
  numResol: "",
  fecResol: "",
  nroExpediente: "",
  baseLegal: "",
  regimen: "0", // default del legado: afecto
  motivo: "01", // default del legado
  vigDesde: "",
  vigHasta: "",
  observacion: "",
  bloquearEmi: "",
  fecDecla: "",
  fecVigDesde: "",
  fecVigHasta: "",
};

// El SP devuelve las fechas como DD/MM/YYYY; los input type="date" requieren YYYY-MM-DD.
const toInputDate = (value: string | undefined): string => {
  if (!value || !value.trim()) return "";
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
};

// Convierte YYYY-MM-DD (input date) → DD/MM/YYYY (lo que espera el SP).
const toDisplayDate = (value: string | undefined): string => {
  if (!value || !value.trim()) return "";
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

// Los totales readonly de la DDJJ llegan por prop; si vienen vacíos o no llegan,
// se muestran como "—" (son solo informativos, no se graban).
const totalValue = (value: string | number | undefined): string =>
  value === undefined || value === null || String(value).trim() === ""
    ? "—"
    : fmtMonto(value);

const totalCount = (value: string | number | undefined): string =>
  value === undefined || value === null || String(value).trim() === ""
    ? "—"
    : toNum(value).toLocaleString("es-PE", { maximumFractionDigits: 0 });

// ─── FieldGroup ────────────────────────────────────────────

function FieldGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
        {icon}
        {title}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

// ─── Component ─────────────────────────────────────────────

export default function HojaResumenFormModal({
  isOpen,
  onClose,
  codigoContribuyente = "",
  numeroDoc = "",
  razonSocial = "",
  direccion = "",
  annoSeleccionado,
  numeroDj = "",
  fechaDj = "",
  totalesDj,
  hrExistente,
  onSaved,
}: Props) {
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  const esEdicion = !!hrExistente;

  // Totales readonly del bloque "Datos para el registro de la DDJJ":
  // en edición vienen del propio SP (hrExistente); en alta se usa la prop totalesDj.
  const totales: TotalesDj | undefined = esEdicion && hrExistente
    ? {
        nroPredios: hrExistente.nroPredios,
        totalAutovaluo: hrExistente.totalAutovaluo,
        baseImponible: hrExistente.baseImponible,
        impAnual: hrExistente.impAnual,
        impTrimestral: hrExistente.impTrimestral,
        costoEmision: hrExistente.costoEmision,
      }
    : totalesDj;

  const [form, setForm] = useState<HojaResumenForm>(emptyHojaResumen);

  // ── Combo state ──
  const [regimen, setRegimen] = useState<HrComboOption[]>([]);
  const [motivos, setMotivos] = useState<HrComboOption[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);

  // ── Save state ──
  const [saveMessage, setSaveMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [operador, setOperador] = useState("");
  const [estacion, setEstacion] = useState("");

  const onChange = (field: keyof HojaResumenForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Foco: al abrirse, este modal toma el foco ──
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  // Cierra con Escape (solo si este modal es el tope de la pila).
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !combosLoading && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, topModal, combosLoading, saving, onClose]);

  // ── Reset + load combos on open ──
  useEffect(() => {
    if (!isOpen) return;

    setForm(esEdicion && hrExistente
      ? {
          numResol: hrExistente.numResol ?? "",
          fecResol: toInputDate(hrExistente.fecResol),
          nroExpediente: hrExistente.nroExpediente ?? "",
          baseLegal: hrExistente.baseLegal ?? "",
          regimen: hrExistente.regimen ?? "",
          motivo: hrExistente.motivo ?? "",
          vigDesde: hrExistente.vigDesde ?? "",
          vigHasta: hrExistente.vigHasta ?? "",
          observacion: hrExistente.observacion ?? "",
          bloquearEmi: hrExistente.bloquearEmi ?? "",
          fecDecla: toInputDate(hrExistente.fecDecla),
          fecVigDesde: toInputDate(hrExistente.fecVigDesde),
          fecVigHasta: toInputDate(hrExistente.fecVigHasta),
        }
      : {
          ...emptyHojaResumen,
          fecDecla: toInputDate(fechaDj),
          vigDesde: annoSeleccionado?.trim() ?? "",
        });
    setSaveMessage(null);
    setSaving(false);

    const user = getStoredUser();
    setOperador(user?.username ?? "");
    checkSessionAction().then((s) => {
      setEstacion(s?.hostname ?? "");
    });

    let cancelled = false;
    setCombosLoading(true);

    getCombosHrAction()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setRegimen(res.data.regimen ?? []);
          setMotivos(res.data.motivos ?? []);
        } else {
          setSaveMessage({ type: "error", text: res.error });
        }
      })
      .finally(() => {
        if (!cancelled) setCombosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, esEdicion, hrExistente, fechaDj, annoSeleccionado]);

  const grabar = async () => {
    if (saving) return;

    // Validaciones del legado (frmhr):
    // - txthrhasta: requerido y numérico
    // - txtnroresol: requerido cuando el régimen != '0' (afecto)
    if (!/^\d{4}$/.test(form.vigHasta.trim())) {
      setSaveMessage({ type: "error", text: "Ingrese el año de vigencia (Hasta), solo números." });
      return;
    }
    if (form.vigDesde.trim() && !/^\d{4}$/.test(form.vigDesde.trim())) {
      setSaveMessage({ type: "error", text: "El año de vigencia (Desde) debe ser numérico." });
      return;
    }
    if (form.regimen !== "0" && !form.numResol.trim()) {
      setSaveMessage({ type: "error", text: "Ingrese el número de resolución." });
      return;
    }
    if (!form.fecDecla.trim()) {
      setSaveMessage({ type: "error", text: "Ingrese la fecha de declaración." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    const payload = {
      action: esEdicion ? "2" : "1",
      codigo: codigoContribuyente?.trim() ?? "",
      anno: annoSeleccionado?.trim() ?? "",
      num_resol: form.numResol ?? "",
      fec_resol: toDisplayDate(form.fecResol),
      nro_expediente: form.nroExpediente ?? "",
      base_legal: form.baseLegal ?? "",
      regimen: form.regimen ?? "",
      motivo: form.motivo ?? "",
      vig_desde: form.vigDesde ?? "",
      vig_hasta: form.vigHasta ?? "",
      observacion: form.observacion ?? "",
      bloquear_emi: form.bloquearEmi ?? "",
      fec_decla: toDisplayDate(form.fecDecla),
      fec_vig_desde: toDisplayDate(form.fecVigDesde),
      fec_vig_hasta: toDisplayDate(form.fecVigHasta),
      operador: operador ?? "",
      estacion: estacion ?? "",
    };

    try {
      const res = await grabarHrAction(payload);
      if (!res.success) {
        setSaveMessage({ type: "error", text: res.error });
        return;
      }
      if (res.data && !res.data.success) {
        setSaveMessage({ type: "error", text: res.data.mensaje || "No se pudo guardar la Hoja de Resumen." });
        return;
      }
      setSaveMessage({ type: "success", text: "Hoja de Resumen guardada correctamente." });
      setTimeout(() => {
        onSaved?.();
        onClose();
        setSaveMessage(null);
      }, 1500);
    } catch {
      setSaveMessage({ type: "error", text: "Error al guardar la Hoja de Resumen. Intente nuevamente." });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";
  const readonlyClass =
    "w-full rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-500 cursor-not-allowed";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !combosLoading && !saving) onClose();
      }}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              {esEdicion ? "Editar Hoja de Resumen" : "Nuevo Hoja de Resumen"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-2.5 space-y-2.5">
          {/* ══ Datos del contribuyente (readonly) ══ */}
          <FieldGroup title="Datos del contribuyente" icon={<FileText size={13} />}>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className={labelClass}>Código</label>
                <input type="text" value={codigoContribuyente} readOnly className={readonlyClass} />
              </div>
              <div>
                <label className={labelClass}>Documento</label>
                <input type="text" value={numeroDoc} readOnly className={readonlyClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className={labelClass}>Contribuyente</label>
                <input type="text" value={razonSocial} readOnly className={readonlyClass} />
              </div>
              <div>
                <label className={labelClass}>Período</label>
                <input type="text" value={annoSeleccionado ?? ""} readOnly className={readonlyClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input type="text" value={direccion} readOnly className={readonlyClass} />
            </div>
          </FieldGroup>

          {/* ══ Vigencia de la declaración (modificatoria) ══ */}
          <FieldGroup
            title="Las modificaciones de esta declaración entra en vigencia a partir del año:"
            icon={<FileText size={13} />}
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="shrink-0">
                <label htmlFor="hr-vig-desde-anio" className={labelClass}>
                  Desde
                </label>
                <input
                  id="hr-vig-desde-anio"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.vigDesde}
                  onChange={(e) => onChange("vigDesde", e.target.value.replace(/\D/g, ""))}
                  placeholder="Año"
                  className="w-14 rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
              <span className="pb-1 text-xs font-bold text-slate-500 select-none">A</span>
              <div className="shrink-0">
                <label htmlFor="hr-vig-hasta-anio" className={labelClass}>
                  Hasta
                </label>
                <input
                  id="hr-vig-hasta-anio"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.vigHasta}
                  onChange={(e) => onChange("vigHasta", e.target.value.replace(/\D/g, ""))}
                  placeholder="Año"
                  className="w-14 rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            </div>
          </FieldGroup>

          {/* ══ Fila: Declaración Jurada | Datos para el registro de la DDJJ ══ */}
          <div className="grid grid-cols-2 gap-2.5">
            <FieldGroup title="Declaración Jurada:" icon={<FileText size={13} />}>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={labelClass}>Número</label>
                  <input
                    type="text"
                    value={(esEdicion && hrExistente ? hrExistente.numDecla : numeroDj) || "—"}
                    readOnly
                    className={readonlyClass}
                  />
                </div>
                <div>
                  <label htmlFor="hr-fec-decla" className={labelClass}>
                    Fecha
                  </label>
                  <input
                    id="hr-fec-decla"
                    type="date"
                    maxLength={10}
                    value={form.fecDecla}
                    onChange={(e) => onChange("fecDecla", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="hr-motivo" className={labelClass}>
                  Motivo
                </label>
                <select
                  id="hr-motivo"
                  value={form.motivo}
                  onChange={(e) => onChange("motivo", e.target.value)}
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
              <div>
                <label htmlFor="hr-observacion" className={labelClass}>
                  Observación
                </label>
                <input
                  id="hr-observacion"
                  type="text"
                  maxLength={400}
                  value={form.observacion}
                  onChange={(e) => onChange("observacion", e.target.value.toUpperCase())}
                  placeholder="Observación"
                  className={inputClass}
                />
              </div>
            </FieldGroup>

            <FieldGroup title="Datos para el registro de la DDJJ" icon={<FileText size={13} />}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hr-bloquear-emi"
                  checked={form.bloquearEmi === "1"}
                  onChange={(e) => onChange("bloquearEmi", e.target.checked ? "1" : "")}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-sat-cyan"
                />
                <label
                  htmlFor="hr-bloquear-emi"
                  className="cursor-pointer text-[11px] font-medium text-slate-600 select-none"
                >
                  Bloquear Emisión
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={labelClass}>Nro. Predios</label>
                  <input type="text" value={totalCount(totales?.nroPredios)} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Total Autovalúo</label>
                  <input type="text" value={totalValue(totales?.totalAutovaluo)} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Base Imponible</label>
                  <input type="text" value={totalValue(totales?.baseImponible)} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Imp. Anual</label>
                  <input type="text" value={totalValue(totales?.impAnual)} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Imp. Trimestral</label>
                  <input type="text" value={totalValue(totales?.impTrimestral)} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Costo Emisión</label>
                  <input type="text" value={totalValue(totales?.costoEmision)} readOnly className={readonlyClass} />
                </div>
              </div>
            </FieldGroup>
          </div>

          {/* ══ Fila: Datos de registro de DDJJ | (Régimen + Datos de Registro de DJ) ══ */}
          <div className="grid grid-cols-2 gap-2.5">
            <FieldGroup title="Datos de registro de DDJJ" icon={<FileText size={13} />}>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label htmlFor="hr-num-resol" className={labelClass}>
                    Nro. Resolución
                  </label>
                  <input
                    id="hr-num-resol"
                    type="text"
                    maxLength={30}
                    value={form.numResol}
                    onChange={(e) => onChange("numResol", e.target.value.toUpperCase())}
                    placeholder="Nro. de resolución"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hr-fec-resol" className={labelClass}>
                    Fecha Resolución
                  </label>
                  <input
                    id="hr-fec-resol"
                    type="date"
                    maxLength={10}
                    value={form.fecResol}
                    onChange={(e) => onChange("fecResol", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label htmlFor="hr-nro-expediente" className={labelClass}>
                    Nro. Expediente
                  </label>
                  <input
                    id="hr-nro-expediente"
                    type="text"
                    maxLength={30}
                    value={form.nroExpediente}
                    onChange={(e) => onChange("nroExpediente", e.target.value.toUpperCase())}
                    placeholder="Nro. de expediente"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hr-base-legal" className={labelClass}>
                    Base Legal
                  </label>
                  <input
                    id="hr-base-legal"
                    type="text"
                    maxLength={100}
                    value={form.baseLegal}
                    onChange={(e) => onChange("baseLegal", e.target.value.toUpperCase())}
                    placeholder="Base legal"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label htmlFor="hr-vig-desde-fecha" className={labelClass}>
                    Vigente desde
                  </label>
                  <input
                    id="hr-vig-desde-fecha"
                    type="date"
                    maxLength={10}
                    value={form.fecVigDesde}
                    onChange={(e) => onChange("fecVigDesde", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hr-vig-hasta-fecha" className={labelClass}>
                    Vigente hasta
                  </label>
                  <input
                    id="hr-vig-hasta-fecha"
                    type="date"
                    maxLength={10}
                    value={form.fecVigHasta}
                    onChange={(e) => onChange("fecVigHasta", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </FieldGroup>

            <div className="space-y-2.5">
              <FieldGroup title="Régimen:" icon={<FileText size={13} />}>
                <div>
                  <label htmlFor="hr-regimen" className={labelClass}>
                    Régimen
                  </label>
                  <select
                    id="hr-regimen"
                    value={form.regimen}
                    onChange={(e) => onChange("regimen", e.target.value)}
                    className={inputClass}
                    disabled={combosLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {regimen.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </FieldGroup>

              <FieldGroup title="Datos de Registro de DJ" icon={<FileText size={13} />}>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className={labelClass}>Usuario</label>
                    <input
                      type="text"
                      value={esEdicion && hrExistente ? hrExistente.usuarioReg || operador : operador}
                      readOnly
                      className={readonlyClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha</label>
                    <input
                      type="text"
                      value={
                        esEdicion && hrExistente
                          ? hrExistente.fechaReg || new Date().toLocaleDateString("es-PE")
                          : new Date().toLocaleDateString("es-PE")
                      }
                      readOnly
                      className={readonlyClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Estación</label>
                    <input
                      type="text"
                      value={esEdicion && hrExistente ? hrExistente.estacionReg || estacion : estacion}
                      readOnly
                      className={readonlyClass}
                    />
                  </div>
                </div>
              </FieldGroup>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50/60 px-4 py-2 shrink-0">
          <div>
            {saveMessage && (
              <span
                className={`text-[11px] font-medium ${
                  saveMessage.type === "error" ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {saveMessage.text}
              </span>
            )}
          </div>
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
              disabled={combosLoading || saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Grabar Datos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
