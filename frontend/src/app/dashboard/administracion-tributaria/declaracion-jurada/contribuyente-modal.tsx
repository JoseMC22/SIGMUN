"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, User, UserPlus, MapPin, Monitor, Home } from "lucide-react";
import {
  getTiposDocumentoAction,
  getTiposContribuyenteAction,
  getSubTiposContribuyenteAction,
  getDistritosAction,
  getTiposInteriorAction,
  getTiposEdificacionAction,
  getTiposIngresoAction,
  getTiposAgrupamientoAction,
  buscarContribuyentePorDocAction,
  validarRepresentanteAction,
  validarRepresentantePorCodigoAction,
  guardarContribuyenteAction,
  type TipoDocumentoOption,
  type TipoContribuyenteOption,
  type SubTipoContribuyenteOption,
  type DistritoOption,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getStoredUser } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import ViaBusquedaModal from "./via-busqueda-modal";
import type { MviaItem } from "@/actions/administracion-tributaria/declaracion-jurada";

// ─── Types ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = "contribuyente" | "domicilio-fiscal";

interface RepresentanteForm {
  nombreRazon: string;
  paterno: string;
  materno: string;
  documento: string;
  numero: string;
  codigoRepresentante: string;
  tipoRepresentante: string;
  // Domicilio fiscal
  distrito: string;
  zonaCod: string;
  zonaNom: string;
  urbCod: string;
  urbNom: string;
  viaCod: string;
  viaNom: string;
  mz: string;
  lote: string;
  subLote: string;
  numDomicilio: string;
  dpto: string;
  letra1: string;
  numero2: string;
  letra2: string;
  piso: string;
  tipoInterior: string;
  numInterior: string;
  letraInterior: string;
  tipoEdificacion: string;
  nombreEdificacion: string;
  tipoIngreso: string;
  nombreIngreso: string;
  tipoAgrupamiento: string;
  nombreAgrupamiento: string;
  referencia: string;
}

const emptyRepresentante: RepresentanteForm = {
  nombreRazon: "",
  paterno: "",
  materno: "",
  documento: "",
  numero: "",
  codigoRepresentante: "",
  tipoRepresentante: "",
  distrito: "",
  zonaCod: "",
  zonaNom: "",
  urbCod: "",
  urbNom: "",
  viaCod: "",
  viaNom: "",
  mz: "",
  lote: "",
  subLote: "",
  numDomicilio: "",
  dpto: "",
  letra1: "",
  numero2: "",
  letra2: "",
  piso: "",
  tipoInterior: "",
  numInterior: "",
  letraInterior: "",
  tipoEdificacion: "",
  nombreEdificacion: "",
  tipoIngreso: "",
  nombreIngreso: "",
  tipoAgrupamiento: "",
  nombreAgrupamiento: "",
  referencia: "",
};

interface FormData {
  // ── Datos personales ──
  codigo: string;
  nombreRazon: string;
  paterno: string;
  materno: string;
  documento: string;
  numero: string;
  tipoContri: string;
  subTipoContri: string;
  partidaDefuncion: string;
  fechaDefuncion: string;
  correo: string;
  telefono: string;
  anexo: string;
  // ── Domicilio fiscal (tab 1) ──
  distrito: string;
  zonaCod: string;
  zonaNom: string;
  urbCod: string;
  urbNom: string;
  viaCod: string;
  viaNom: string;
  // ── Datos domicilio fiscal (tab 2) ──
  mz: string;
  lote: string;
  subLote: string;
  numDomicilio: string;
  dpto: string;
  letra1: string;
  numero2: string;
  letra2: string;
  piso: string;
  tipoInterior: string;
  numInterior: string;
  letraInterior: string;
  tipoEdificacion: string;
  nombreEdificacion: string;
  tipoIngreso: string;
  nombreIngreso: string;
  tipoAgrupamiento: string;
  nombreAgrupamiento: string;
  referencia: string;
  // ── Datos de la operación ──
  operador: string;
  estacion: string;
  fechaOperacion: string;
}

const emptyForm: FormData = {
  codigo: "",
  nombreRazon: "",
  paterno: "",
  materno: "",
  documento: "",
  numero: "",
  tipoContri: "",
  subTipoContri: "",
  partidaDefuncion: "",
  fechaDefuncion: "",
  correo: "",
  telefono: "",
  anexo: "",
  distrito: "",
  zonaCod: "",
  zonaNom: "",
  urbCod: "",
  urbNom: "",
  viaCod: "",
  viaNom: "",
  mz: "",
  lote: "",
  subLote: "",
  numDomicilio: "",
  dpto: "",
  letra1: "",
  numero2: "",
  letra2: "",
  piso: "",
  tipoInterior: "",
  numInterior: "",
  letraInterior: "",
  tipoEdificacion: "",
  nombreEdificacion: "",
  tipoIngreso: "",
  nombreIngreso: "",
  tipoAgrupamiento: "",
  nombreAgrupamiento: "",
  referencia: "",
  operador: "",
  estacion: "",
  fechaOperacion: "",
};

// ─── Style tokens ──────────────────────────────────────────

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

const labelClass =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";

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

// ─── Representante Modal ───────────────────────────────────

function RepresentanteModal({
  isOpen,
  onClose,
  form,
  onChange,
  tiposDoc,
  tiposContri,
  distritos,
  tiposInterior,
  tiposEdificacion,
  tiposIngreso,
  tiposAgrupamiento,
  combosLoading,
  onGrabar,
  saveMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: RepresentanteForm;
  onChange: (field: keyof RepresentanteForm, value: string) => void;
  tiposDoc: TipoDocumentoOption[];
  tiposContri: TipoContribuyenteOption[];
  distritos: DistritoOption[];
  tiposInterior: { value: string; label: string }[];
  tiposEdificacion: { value: string; label: string }[];
  tiposIngreso: { value: string; label: string }[];
  tiposAgrupamiento: { value: string; label: string }[];
  combosLoading: boolean;
  onGrabar: () => void;
  saveMessage: { type: "error" | "success"; text: string } | null;
}) {
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [viaModalOpen, setViaModalOpen] = useState(false);

  const handleViaSelect = (via: MviaItem) => {
    onChange("viaCod", via.codVia);
    onChange("viaNom", via.via);
    onChange("zonaCod", via.idZona);
    onChange("zonaNom", via.zona);
    onChange("urbCod", via.idUrba);
    onChange("urbNom", via.urbanizacion);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const buscarContribuyente = async () => {
    const numero = form.numero.trim();
    if (!numero) {
      setSearchMessage({ type: "error", text: "Ingrese un número de documento." });
      return;
    }

    setSearchLoading(true);
    setSearchMessage(null);

    try {
      const res = await buscarContribuyentePorDocAction(numero);
      if (!res.success) {
        setSearchMessage({ type: "error", text: res.error });
        return;
      }
      if (res.data.encontrado) {
        onChange("codigoRepresentante", res.data.codigo);
        onChange("nombreRazon", res.data.nombres.toUpperCase());
        onChange("paterno", res.data.paterno.toUpperCase());
        onChange("materno", res.data.materno.toUpperCase());
        if (res.data.codigo) onChange("numero", res.data.num_doc);
        setSearchMessage({ type: "success", text: "Contribuyente encontrado correctamente." });
      } else {
        setSearchMessage({ type: "error", text: "El Dni no se encuentra registrado en nuestra base de datos." });
      }
    } catch {
      setSearchMessage({ type: "error", text: "Error al consultar el servicio. Intente nuevamente." });
    } finally {
      setSearchLoading(false);
    }
  };

  if (!isOpen) return null;

  const repInputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";
  const repLabelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Agregar Representante
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
          {/* ══ Datos personales ══ */}
          <FieldGroup title="Datos personales" icon={<User size={13} />}>
              {/* Tipo de Representante */}
              <div>
                <label htmlFor="r-tipo" className={repLabelClass}>
                  Tipo de Representante
                </label>
                <select
                  id="r-tipo"
                  value={form.tipoRepresentante}
                  onChange={(e) => onChange("tipoRepresentante", e.target.value)}
                  className={repInputClass}
                  disabled={combosLoading}
                >
                  <option value="">Seleccionar...</option>
                  {tiposContri.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Código del representante (hidden) — se llena con la lupa "Buscar Contribuyente" */}
              <input
                type="hidden"
                name="txtcodrepre"
                id="txtcodrepre"
                value={form.codigoRepresentante}
              />
          </FieldGroup>

          {/* ══ Domicilio fiscal ══ */}
          <FieldGroup title="Domicilio fiscal" icon={<MapPin size={13} />}>
              {/* Distrito */}
              <div>
                <label htmlFor="r-distrito" className={repLabelClass}>
                  Distrito
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    id="r-distrito"
                    value={form.distrito}
                    onChange={(e) => onChange("distrito", e.target.value)}
                    className={repInputClass}
                    disabled={combosLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {distritos.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setViaModalOpen(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-sat-amber bg-white px-3 py-1.5 text-xs font-medium text-sat-amber transition hover:bg-sat-amber/5 focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98]"
                  >
                    <Search size={13} />
                    Búsqueda
                  </button>
                </div>
              </div>

              {/* Zona */}
              <div>
                <label className={repLabelClass}>Zona</label>
                <div className="grid grid-cols-[110px_1fr] gap-1.5">
                  <input
                    type="text"
                    value={form.zonaCod}
                    readOnly
                    placeholder="Código"
                    className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                  />
                  <input
                    type="text"
                    value={form.zonaNom}
                    readOnly
                    placeholder="Nombre"
                    className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Urbanización */}
              <div>
                <label className={repLabelClass}>Urbanización</label>
                <div className="grid grid-cols-[110px_1fr] gap-1.5">
                  <input
                    type="text"
                    value={form.urbCod}
                    readOnly
                    placeholder="Código"
                    className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                  />
                  <input
                    type="text"
                    value={form.urbNom}
                    readOnly
                    placeholder="Nombre"
                    className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Vía */}
              <div>
                <label className={repLabelClass}>Vía</label>
                <div className="grid grid-cols-[110px_1fr] gap-1.5">
                  <input
                    type="text"
                    value={form.viaCod}
                    readOnly
                    placeholder="Código"
                    className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                  />
                  <input
                    type="text"
                    value={form.viaNom}
                    readOnly
                    placeholder="Nombre"
                    className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Mz + Lote + Sub Lote + Número + Dpto */}
              <div className="grid grid-cols-5 gap-1.5">
                <div>
                  <label className={repLabelClass}>Mz</label>
                  <input type="text" value={form.mz} onChange={(e) => onChange("mz", e.target.value.toUpperCase())} maxLength={12} placeholder="Mz" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Lote</label>
                  <input type="text" value={form.lote} onChange={(e) => onChange("lote", e.target.value.toUpperCase())} maxLength={12} placeholder="Lote" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Sub Lote</label>
                  <input type="text" value={form.subLote} onChange={(e) => onChange("subLote", e.target.value.toUpperCase())} maxLength={12} placeholder="Sub Lote" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Número</label>
                  <input type="text" value={form.numDomicilio} onChange={(e) => onChange("numDomicilio", e.target.value.toUpperCase())} maxLength={12} placeholder="Número" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Dpto</label>
                  <input type="text" value={form.dpto} onChange={(e) => onChange("dpto", e.target.value.toUpperCase())} maxLength={12} placeholder="Dpto" className={repInputClass} />
                </div>
              </div>

              {/* Letra 1 + Num 2 + Letra 2 + Piso */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className={repLabelClass}>Letra 1</label>
                  <input type="text" value={form.letra1} onChange={(e) => onChange("letra1", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra 1" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Num 2</label>
                  <input type="text" value={form.numero2} onChange={(e) => onChange("numero2", e.target.value.toUpperCase())} maxLength={10} placeholder="Num 2" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Letra 2</label>
                  <input type="text" value={form.letra2} onChange={(e) => onChange("letra2", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra 2" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Piso</label>
                  <input type="text" value={form.piso} onChange={(e) => onChange("piso", e.target.value.toUpperCase())} maxLength={10} placeholder="Piso" className={repInputClass} />
                </div>
              </div>

              {/* Tipo Interior + Num + Letra */}
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-1.5">
                <div>
                  <label className={repLabelClass}>Tipo de Interior</label>
                  <select value={form.tipoInterior} onChange={(e) => onChange("tipoInterior", e.target.value)} className={repInputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposInterior.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={repLabelClass}>Num Interior</label>
                  <input type="text" value={form.numInterior} onChange={(e) => onChange("numInterior", e.target.value.toUpperCase())} maxLength={10} placeholder="Num" className={repInputClass} />
                </div>
                <div>
                  <label className={repLabelClass}>Letra Interior</label>
                  <input type="text" value={form.letraInterior} onChange={(e) => onChange("letraInterior", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra" className={repInputClass} />
                </div>
              </div>

              {/* Tipo Edificación + Nombre Edificación */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label className={repLabelClass}>Tipo de Edificación</label>
                  <select value={form.tipoEdificacion} onChange={(e) => onChange("tipoEdificacion", e.target.value)} className={repInputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposEdificacion.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={repLabelClass}>Nombre de Edificación</label>
                  <input type="text" value={form.nombreEdificacion} onChange={(e) => onChange("nombreEdificacion", e.target.value.toUpperCase())} placeholder="Nombre de edificación" className={repInputClass} />
                </div>
              </div>

              {/* Tipo Ingreso + Nombre Ingreso */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label className={repLabelClass}>Tipo de Ingreso</label>
                  <select value={form.tipoIngreso} onChange={(e) => onChange("tipoIngreso", e.target.value)} className={repInputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposIngreso.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={repLabelClass}>Nombre de Ingreso</label>
                  <input type="text" value={form.nombreIngreso} onChange={(e) => onChange("nombreIngreso", e.target.value.toUpperCase())} placeholder="Nombre de ingreso" className={repInputClass} />
                </div>
              </div>

              {/* Tipo Agrupamiento + Nombre Agrupamiento */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label className={repLabelClass}>Tipo de Agrupamiento</label>
                  <select value={form.tipoAgrupamiento} onChange={(e) => onChange("tipoAgrupamiento", e.target.value)} className={repInputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposAgrupamiento.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={repLabelClass}>Nombre de Agrupamiento</label>
                  <input type="text" value={form.nombreAgrupamiento} onChange={(e) => onChange("nombreAgrupamiento", e.target.value.toUpperCase())} placeholder="Nombre de agrupamiento" className={repInputClass} />
                </div>
              </div>

              {/* Referencia */}
              <div>
                <label className={repLabelClass}>Referencia</label>
                <input type="text" value={form.referencia} onChange={(e) => onChange("referencia", e.target.value.toUpperCase())} maxLength={400} placeholder="Referencia" className={repInputClass} />
              </div>
          </FieldGroup>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-4 py-2 shrink-0 space-y-2">
          {saveMessage && (
            <div
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${
                saveMessage.type === "error"
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
              }`}
            >
              {saveMessage.text}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
            >
              Cerrar Formulario
            </button>
            <button
              type="button"
              onClick={onGrabar}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              Grabar Datos
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de búsqueda de vías (Representante) ── */}
      <ViaBusquedaModal
        isOpen={viaModalOpen}
        onClose={() => setViaModalOpen(false)}
        onSelect={handleViaSelect}
      />
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────

export default function ContribuyenteModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>("contribuyente");
  const [form, setForm] = useState<FormData>(emptyForm);

  // ── Combo state ──
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoOption[]>([]);
  const [tiposContri, setTiposContri] = useState<TipoContribuyenteOption[]>([]);
  const [subTipos, setSubTipos] = useState<SubTipoContribuyenteOption[]>([]);
  const [distritos, setDistritos] = useState<DistritoOption[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [subTiposLoading, setSubTiposLoading] = useState(false);

  // ── Combo Domicilio Fiscal state ──
  const [tiposInterior, setTiposInterior] = useState<{ value: string; label: string }[]>([]);
  const [tiposEdificacion, setTiposEdificacion] = useState<{ value: string; label: string }[]>([]);
  const [tiposIngreso, setTiposIngreso] = useState<{ value: string; label: string }[]>([]);
  const [tiposAgrupamiento, setTiposAgrupamiento] = useState<{ value: string; label: string }[]>([]);

  // ── DNI search state ──
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // ── Via search modal state ──
  const [viaModalOpen, setViaModalOpen] = useState(false);

  // ── Representante modal state ──
  const [representanteModalOpen, setRepresentanteModalOpen] = useState(false);
  const [representante, setRepresentante] = useState<RepresentanteForm>(emptyRepresentante);
  const [representanteMessage, setRepresentanteMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // ── Guardar contribuyente state ──
  const [guardando, setGuardando] = useState(false);
  const [guardarError, setGuardarError] = useState<string | null>(null);
  const [camposInvalidos, setCamposInvalidos] = useState<Set<keyof FormData>>(new Set());

  // ── Reset + load combos on open ──
  useEffect(() => {
    if (!isOpen) return;

    setTab("contribuyente");
    setForm(emptyForm);
    setSubTipos([]);
    setSearchMessage(null);
    setSearchLoading(false);
    setRepresentanteModalOpen(false);
    setRepresentante(emptyRepresentante);
    setRepresentanteMessage(null);

    let cancelled = false;
    setCombosLoading(true);

    Promise.all([
      getTiposDocumentoAction(),
      getTiposContribuyenteAction(),
      getDistritosAction(),
      getTiposInteriorAction(),
      getTiposEdificacionAction(),
      getTiposIngresoAction(),
      getTiposAgrupamientoAction(),
    ]).then(([docRes, contriRes, distRes, interiorRes, edifRes, ingRes, agrupRes]) => {
      if (cancelled) return;
      if (docRes.success) setTiposDoc(docRes.data);
      if (contriRes.success) setTiposContri(contriRes.data);
      if (distRes.success) {
        setDistritos(distRes.data);
        // Seleccionar ICA por defecto
        const icaOption = distRes.data.find((d) => d.label.toUpperCase() === "ICA");
        if (icaOption) setForm((prev) => ({ ...prev, distrito: icaOption.value }));
      }
      if (interiorRes.success) setTiposInterior(interiorRes.data);
      if (edifRes.success) setTiposEdificacion(edifRes.data);
      if (ingRes.success) setTiposIngreso(ingRes.data);
      if (agrupRes.success) setTiposAgrupamiento(agrupRes.data);
      setCombosLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // ── Load operador + estación + fecha on open ──
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const fechaStr = now.toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");

    const user = getStoredUser();
    const operador = user?.username ?? "";

    setForm((prev) => ({ ...prev, operador, fechaOperacion: fechaStr }));

    // Obtener hostname de la sesión (guardado en cache durante login)
    checkSessionAction().then((session) => {
      setForm((prev) => ({ ...prev, estacion: session.hostname ?? "" }));
    });
  }, [isOpen]);

  // ── Load subtipos when tipo contribuyente changes ──
  useEffect(() => {
    if (!isOpen) return;
    if (!form.tipoContri) {
      setSubTipos([]);
      return;
    }

    let cancelled = false;
    setSubTiposLoading(true);
    getSubTiposContribuyenteAction(form.tipoContri).then((res) => {
      if (cancelled) return;
      if (res.success) setSubTipos(res.data);
      else setSubTipos([]);
      setSubTiposLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, form.tipoContri]);

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Limpiar mensaje de búsqueda al editar el número
    if (field === "numero") setSearchMessage(null);
    // Quitar resaltado de error al corregir el campo
    if (camposInvalidos.has(field)) {
      setCamposInvalidos((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  // Clase para inputs inválidos (borde + anillo rojo)
  const invalidClass = (field: keyof FormData) =>
    camposInvalidos.has(field)
      ? "border-red-400 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200/40"
      : "";

  // ── Buscar DNI por número ──
  const buscarDni = async () => {
    const numero = form.numero.trim();
    if (!numero) {
      setSearchMessage({ type: "error", text: "Ingrese un número de documento." });
      return;
    }

    setSearchLoading(true);
    setSearchMessage(null);

    try {
      const res = await fetch(`/api/dni?numero=${numero}`);
      const data = await res.json();

      if (data && data.nombres) {
        setForm((prev) => ({
          ...prev,
          nombreRazon: `${data.nombres}`.toUpperCase(),
          paterno: `${data.apellidoPaterno ?? ""}`.toUpperCase(),
          materno: `${data.apellidoMaterno ?? ""}`.toUpperCase(),
        }));
        setSearchMessage({ type: "success", text: "DNI encontrado correctamente." });
      } else {
        setSearchMessage({ type: "error", text: "No se encontró información para el DNI ingresado." });
      }
    } catch {
      setSearchMessage({ type: "error", text: "Error al consultar el servicio. Intente nuevamente." });
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Documento seleccionado (para maxLength del número) ──
  const selectedDoc = tiposDoc.find((d) => d.value === form.documento);
  const numeroMaxLength = selectedDoc?.maxDigits && selectedDoc.maxDigits > 0 ? selectedDoc.maxDigits : undefined;

  // ── Cuando se selecciona una vía desde el modal de búsqueda ──
  const handleViaSelect = (via: MviaItem) => {
    setForm((prev) => ({
      ...prev,
      viaCod: via.codVia,
      viaNom: via.via,
      zonaCod: via.idZona,
      zonaNom: via.zona,
      urbCod: via.idUrba,
      urbNom: via.urbanizacion,
    }));
  };

  // ── Mostrar campos de defunción: tipo=01 y subtipo=02 ──
  const showDefuncion = form.tipoContri === "01" && form.subTipoContri === "02";

  // ── Handlers del representante ──
  const handleRepresentanteChange = (field: keyof RepresentanteForm, value: string) => {
    setRepresentante((prev) => ({ ...prev, [field]: value }));
  };

  const grabarRepresentante = async () => {
    const r = representante;
    const esEdicion = !!r.codigoRepresentante && r.codigoRepresentante.trim().length > 0;
    const motivo = `Acción - ${esEdicion ? "Actualización" : "Ingreso"} Representante - Operador ${form.operador} - Estación : ${form.estacion}`;

    const esICA = r.distrito === "012";
    const cvia = esICA ? r.viaCod : "";
    const nvia = r.viaNom;
    const tvia = esICA ? "" : r.viaCod;
    const curba = esICA ? r.urbCod : "";
    const nurba = r.urbNom;
    const turba = esICA ? "" : r.urbCod;

    const payload = {
      codigo: r.codigoRepresentante ?? "",
      id_docu: r.documento ?? "",
      num_doc: r.numero ?? "",
      nombres: r.nombreRazon ?? "",
      paterno: r.paterno ?? "",
      materno: r.materno ?? "",
      id_dist: r.distrito ?? "",
      tipourb: turba,
      des_urb: nurba,
      tipovia: tvia,
      des_via: nvia,
      id_zona: r.zonaCod ?? "",
      id_urba: curba,
      id_via: cvia,
      referencia: r.referencia ?? "",
      manzana: r.mz ?? "",
      lote: r.lote ?? "",
      sub_lote: r.subLote ?? "",
      numero: r.numDomicilio ?? "",
      departam: r.dpto ?? "",
      nestado: "",
      motivo,
      operador: form.operador ?? "",
      estacion: form.estacion ?? "",
      id_tipocontri: r.tipoRepresentante ?? "",
      id_subtipocontri: "",
      id_motivo_actualizacion: "",
      tipo_interior_id: r.tipoInterior ?? "",
      tipo_edificio_id: r.tipoEdificacion ?? "",
      tipo_ingreso_id: r.tipoIngreso ?? "",
      tipo_agrupamiento_id: r.tipoAgrupamiento ?? "",
      letra1: r.letra1 ?? "",
      letra2: r.letra2 ?? "",
      numero2: r.numero2 ?? "",
      nombre_ingreso: r.nombreIngreso ?? "",
      nombre_agrupamiento: r.nombreAgrupamiento ?? "",
      nombre_edificio: r.nombreEdificacion ?? "",
      piso: r.piso ?? "",
      numero_interno: r.numInterior ?? "",
      letra_interno: r.letraInterior ?? "",
      correo_e: "",
      partida_defuncion: "",
      fecha_defuncion: "",
      telefono1: "",
      anexo1: "",
      telefono2: "",
      anexo2: "",
      flag_notificar: "",
      idperfil: "",
    };

    try {
      const res = await guardarContribuyenteAction(payload);
      if (!res.success) {
        setRepresentanteMessage({ type: "error", text: res.error });
        return;
      }
      setRepresentanteMessage({ type: "success", text: res.data.mensaje || "Representante guardado correctamente." });
      setTimeout(() => {
        setRepresentanteModalOpen(false);
        setRepresentanteMessage(null);
      }, 1500);
    } catch {
      setRepresentanteMessage({ type: "error", text: "Error al guardar el representante. Intente nuevamente." });
    }
  };

  // ── Guardar contribuyente (botón Grabar) ──
  const handleGrabar = async () => {
    setGuardarError(null);

    // 1) Validación de campos obligatorios
    const camposObligatorios: { key: keyof FormData; label: string; value: string }[] = [
      { key: "nombreRazon", label: "Nombre y/o Razón Social", value: form.nombreRazon },
      { key: "paterno", label: "Apellido Paterno", value: form.paterno },
      { key: "materno", label: "Apellido Materno", value: form.materno },
      { key: "documento", label: "Documento", value: form.documento },
      { key: "numero", label: "Número", value: form.numero },
      { key: "correo", label: "Correo", value: form.correo },
      { key: "telefono", label: "Teléfono", value: form.telefono },
    ];

    const faltantes = camposObligatorios.filter((c) => !c.value || !c.value.trim());

    if (faltantes.length > 0) {
      setCamposInvalidos(new Set(faltantes.map((c) => c.key)));
      setGuardarError(`Campos obligatorios: ${faltantes.map((c) => c.label).join(", ")}.`);
      return;
    }

    setCamposInvalidos(new Set());

    // 2) Validar si requiere representante — exec @busc=25
    setGuardando(true);
    try {
      const validacion = await validarRepresentanteAction(form.numero.trim());
      if (!validacion.success) {
        setGuardarError(validacion.error);
        return;
      }
      if (validacion.data.debeAgregarRepresentante) {
        setGuardarError("Debe Agregar un Representate");
        return;
      }

      // 2b) Validar representante por código (tipo !== "01") — exec @busc=25, @codigo
      if (form.tipoContri !== "01" && form.codigo && form.codigo.trim()) {
        const valCodigo = await validarRepresentantePorCodigoAction(form.codigo.trim());
        if (!valCodigo.success) {
          setGuardarError(valCodigo.error);
          return;
        }
        if (valCodigo.data.debeAgregarRepresentante) {
          setGuardarError("El contribuyente no tiene representante. Debe agregar un representante antes de guardar.");
          return;
        }
      }

      // 3) Guardar — exec @busc=1 (nuevo => tip=1)
      const esEdicion = !!form.codigo && form.codigo.trim().length > 0;
      const motivo = esEdicion
        ? `Acción - Actualización - Operador ${form.operador} - Estación : ${form.estacion}`
        : `Acción - Ingreso - Operador ${form.operador} - Estación : ${form.estacion}`;

      // Lógica distrito 012 (ICA) vs otros, según el legacy.
      // Si es ICA (012) usa los códigos de la búsqueda de vías; si no, usa los
      // tipos de vía/urb manuales (en este formulario representados por viaCod/urbCod).
      const esICA = form.distrito === "012";
      const cvia = esICA ? form.viaCod : "";
      const nvia = form.viaNom;
      const tvia = esICA ? "" : form.viaCod;
      const curba = esICA ? form.urbCod : "";
      const nurba = form.urbNom;
      const turba = esICA ? "" : form.urbCod;

      const payload = {
        codigo: form.codigo ?? "",
        id_docu: form.documento ?? "",
        num_doc: form.numero ?? "",
        nombres: form.nombreRazon ?? "",
        paterno: form.paterno ?? "",
        materno: form.materno ?? "",
        id_dist: form.distrito ?? "",
        tipourb: turba,
        des_urb: nurba,
        tipovia: tvia,
        des_via: nvia,
        id_zona: form.zonaCod ?? "",
        id_urba: curba,
        id_via: cvia,
        referencia: form.referencia ?? "",
        manzana: form.mz ?? "",
        lote: form.lote ?? "",
        sub_lote: form.subLote ?? "",
        numero: form.numDomicilio ?? "",
        departam: form.dpto ?? "",
        nestado: "1",
        motivo,
        operador: form.operador ?? "",
        estacion: form.estacion ?? "",
        id_tipocontri: form.tipoContri ?? "",
        id_subtipocontri: form.subTipoContri ?? "",
        id_motivo_actualizacion: "",
        tipo_interior_id: form.tipoInterior ?? "",
        tipo_edificio_id: form.tipoEdificacion ?? "",
        tipo_ingreso_id: form.tipoIngreso ?? "",
        tipo_agrupamiento_id: form.tipoAgrupamiento ?? "",
        letra1: form.letra1 ?? "",
        letra2: form.letra2 ?? "",
        numero2: form.numero2 ?? "",
        nombre_ingreso: form.nombreIngreso ?? "",
        nombre_agrupamiento: form.nombreAgrupamiento ?? "",
        nombre_edificio: form.nombreEdificacion ?? "",
        piso: form.piso ?? "",
        numero_interno: form.numInterior ?? "",
        letra_interno: form.letraInterior ?? "",
        correo_e: form.correo ?? "",
        partida_defuncion: form.partidaDefuncion ?? "",
        fecha_defuncion: form.fechaDefuncion ?? "",
        telefono1: form.telefono ?? "",
        anexo1: form.anexo ?? "",
        telefono2: "",
        anexo2: "",
        flag_notificar: "",
        idperfil: "",
      };

      const res = await guardarContribuyenteAction(payload);
      if (!res.success) {
        setGuardarError(res.error);
        return;
      }
      alert(res.data.mensaje || "Contribuyente guardado correctamente.");
      onClose();
    } catch {
      setGuardarError("Error al guardar el contribuyente. Intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl"
        data-testid="contribuyente-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Nuevo Contribuyente
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

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 pt-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setTab("contribuyente")}
            className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition ${
              tab === "contribuyente"
                ? "border border-b-0 border-slate-200 bg-white text-sat-navy"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <User size={13} />
            Datos de Contribuyente
          </button>
          <button
            type="button"
            onClick={() => setTab("domicilio-fiscal")}
            className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition ${
              tab === "domicilio-fiscal"
                ? "border border-b-0 border-slate-200 bg-white text-sat-navy"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Home size={13} />
            Datos Domicilio Fiscal
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-2.5 space-y-2.5">
          {/* ══ Contenido por tab ══ */}
          {tab === "contribuyente" && (
            <div className="space-y-2.5">
              {/* ══ Datos Personales ══ */}
              <FieldGroup title="Datos Personales" icon={<User size={13} />}>
                {/* Codigo + Nombre / Razon */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div>
                    <label htmlFor="c-codigo" className={labelClass}>
                      Código
                    </label>
                    <input
                      id="c-codigo"
                      type="text"
                      value={form.codigo}
                      onChange={(e) => handleChange("codigo", e.target.value)}
                      placeholder="Código"
                      readOnly
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="c-nombre"
                      className={`${labelClass} ${camposInvalidos.has("nombreRazon") ? "text-red-500" : ""}`}
                    >
                      Nombre y/o Razón Social
                    </label>
                    <input
                      id="c-nombre"
                      type="text"
                      value={form.nombreRazon}
                      onChange={(e) => handleChange("nombreRazon", e.target.value.toUpperCase())}
                      placeholder="Nombre y/o razón social"
                      className={`${inputClass} ${invalidClass("nombreRazon")}`}
                    />
                  </div>
                </div>

                {/* Apellidos */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="c-paterno"
                      className={`${labelClass} ${camposInvalidos.has("paterno") ? "text-red-500" : ""}`}
                    >
                      Apellido Paterno
                    </label>
                    <input
                      id="c-paterno"
                      type="text"
                      value={form.paterno}
                      onChange={(e) => handleChange("paterno", e.target.value.toUpperCase())}
                      placeholder="Apellido paterno"
                      className={`${inputClass} ${invalidClass("paterno")}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="c-materno"
                      className={`${labelClass} ${camposInvalidos.has("materno") ? "text-red-500" : ""}`}
                    >
                      Apellido Materno
                    </label>
                    <input
                      id="c-materno"
                      type="text"
                      value={form.materno}
                      onChange={(e) => handleChange("materno", e.target.value.toUpperCase())}
                      placeholder="Apellido materno"
                      className={`${inputClass} ${invalidClass("materno")}`}
                    />
                  </div>
                </div>

                {/* Documento + Numero + Buscar */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="c-documento"
                      className={`${labelClass} ${camposInvalidos.has("documento") ? "text-red-500" : ""}`}
                    >
                      Documento
                    </label>
                    <select
                      id="c-documento"
                      value={form.documento}
                      onChange={(e) => {
                        handleChange("documento", e.target.value);
                        handleChange("numero", "");
                      }}
                      className={`${inputClass} ${invalidClass("documento")}`}
                      disabled={combosLoading}
                    >
                      <option value="">Seleccionar...</option>
                      {tiposDoc.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="c-numero"
                      className={`${labelClass} ${camposInvalidos.has("numero") ? "text-red-500" : ""}`}
                    >
                      Número
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="c-numero"
                        type="text"
                        inputMode="numeric"
                        value={form.numero}
                        maxLength={numeroMaxLength}
                        onChange={(e) => handleChange("numero", e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            buscarDni();
                          }
                        }}
                        placeholder={
                          numeroMaxLength
                            ? `Máx. ${numeroMaxLength} dígitos`
                            : "Número de documento"
                        }
                        className={`${inputClass} ${invalidClass("numero")}`}
                      />
                      <button
                        type="button"
                        onClick={buscarDni}
                        disabled={searchLoading || !form.numero.trim()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sat-amber px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#d98707] focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {searchLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Search size={13} />
                        )}
                        Buscar
                      </button>
                    </div>
                    {searchMessage && (
                      <p
                        className={`mt-1.5 text-[11px] font-medium ${
                          searchMessage.type === "error" ? "text-red-500" : "text-emerald-600"
                        }`}
                      >
                        {searchMessage.text}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tipo + SubTipo Contribuyente */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label htmlFor="c-tipo" className={labelClass}>
                      Tipo de Contribuyente
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        id="c-tipo"
                        value={form.tipoContri}
                        onChange={(e) => {
                          handleChange("tipoContri", e.target.value);
                          handleChange("subTipoContri", "");
                        }}
                        className={inputClass}
                        disabled={combosLoading}
                      >
                        <option value="">Seleccionar...</option>
                        {tiposContri.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {form.tipoContri && form.tipoContri !== "01" && (
                        <button
                          type="button"
                          onClick={() => setRepresentanteModalOpen(true)}
                          title="Agregar Representante"
                          aria-label="Agregar Representante"
                          className="inline-flex shrink-0 items-center justify-center rounded-md border border-sat-cyan bg-white p-1.5 text-sat-cyan transition hover:bg-sat-cyan/5 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
                        >
                          <UserPlus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="c-subtipo" className={labelClass}>
                      SubTipo Contribuyente
                    </label>
                    <select
                      id="c-subtipo"
                      value={form.subTipoContri}
                      onChange={(e) => handleChange("subTipoContri", e.target.value)}
                      className={inputClass}
                      disabled={!form.tipoContri || subTiposLoading}
                    >
                      <option value="">
                        {subTiposLoading ? "Cargando..." : "Seleccionar..."}
                      </option>
                      {subTipos.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Defuncion (condicional: tipo=01, subtipo=02) */}
                {showDefuncion && (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <label htmlFor="c-partida" className={labelClass}>
                        Partida de Defunción
                      </label>
                      <input
                        id="c-partida"
                        type="text"
                        value={form.partidaDefuncion}
                        onChange={(e) => handleChange("partidaDefuncion", e.target.value)}
                        placeholder="Partida de defunción"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="c-fecha-def" className={labelClass}>
                        Fecha de Defunción
                      </label>
                      <input
                        id="c-fecha-def"
                        type="date"
                        value={form.fechaDefuncion}
                        onChange={(e) => handleChange("fechaDefuncion", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {/* Correo */}
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label
                      htmlFor="c-correo"
                      className={`${labelClass} ${camposInvalidos.has("correo") ? "text-red-500" : ""}`}
                    >
                      Correo Electrónico
                    </label>
                    <input
                      id="c-correo"
                      type="email"
                      value={form.correo}
                      onChange={(e) => handleChange("correo", e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className={`${inputClass} ${invalidClass("correo")}`}
                    />
                  </div>
                </div>

                {/* Telefono + Anexo */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="c-telefono"
                      className={`${labelClass} ${camposInvalidos.has("telefono") ? "text-red-500" : ""}`}
                    >
                      Teléfono
                    </label>
                    <input
                      id="c-telefono"
                      type="text"
                      value={form.telefono}
                      onChange={(e) => handleChange("telefono", e.target.value)}
                      placeholder="Teléfono"
                      className={`${inputClass} ${invalidClass("telefono")}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="c-anexo" className={labelClass}>
                      Anexo
                    </label>
                    <input
                      id="c-anexo"
                      type="text"
                      value={form.anexo}
                      onChange={(e) => handleChange("anexo", e.target.value)}
                      placeholder="Anexo"
                      className={inputClass}
                    />
                  </div>
                </div>
              </FieldGroup>

              {/* ══ Domicilio Fiscal ══ */}
              <FieldGroup title="Domicilio Fiscal" icon={<MapPin size={13} />}>
                {/* Distrito + Busqueda */}
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label htmlFor="c-distrito" className={labelClass}>
                      Distrito
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        id="c-distrito"
                        value={form.distrito}
                        onChange={(e) => handleChange("distrito", e.target.value)}
                        className={inputClass}
                        disabled={combosLoading}
                      >
                        <option value="">Seleccionar...</option>
                        {distritos.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setViaModalOpen(true)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-sat-amber bg-white px-3 py-1.5 text-xs font-medium text-sat-amber transition hover:bg-sat-amber/5 focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98]"
                      >
                        <Search size={13} />
                        Búsqueda
                      </button>
                    </div>
                  </div>
                </div>

                {/* Zona */}
                <div>
                  <label className={labelClass}>Zona</label>
                  <div className="grid grid-cols-[110px_1fr] gap-1.5">
                    <input
                      type="text"
                      value={form.zonaCod}
                      onChange={(e) => handleChange("zonaCod", e.target.value)}
                      readOnly
                      placeholder="Código"
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                    <input
                      type="text"
                      value={form.zonaNom}
                      readOnly
                      placeholder="Nombre"
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                  </div>
                </div>

                {/* Urbanizacion */}
                <div>
                  <label className={labelClass}>Urbanización</label>
                  <div className="grid grid-cols-[110px_1fr] gap-1.5">
                    <input
                      type="text"
                      value={form.urbCod}
                      onChange={(e) => handleChange("urbCod", e.target.value)}
                      readOnly
                      placeholder="Código"
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                    <input
                      type="text"
                      value={form.urbNom}
                      readOnly
                      placeholder="Nombre"
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                  </div>
                </div>

                {/* Via */}
                <div>
                  <label className={labelClass}>Vía</label>
                  <div className="grid grid-cols-[110px_1fr] gap-1.5">
                    <input
                      type="text"
                      value={form.viaCod}
                      onChange={(e) => handleChange("viaCod", e.target.value)}
                      readOnly
                      placeholder="Código"
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                    <input
                      type="text"
                      value={form.viaNom}
                      readOnly
                      placeholder="Nombre"
                      className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                    />
                  </div>
                </div>
              </FieldGroup>
            </div>
          )}

          {/* ══ Tab: Datos Domicilio Fiscal ══ */}
          {tab === "domicilio-fiscal" && (
            <FieldGroup title="Datos Domicilio Fiscal" icon={<Home size={13} />}>
              {/* Mz + Lote + Sub Lote + Número + Dpto */}
              <div className="grid grid-cols-5 gap-1.5">
                <div>
                  <label className={labelClass}>Mz</label>
                  <input type="text" value={form.mz} onChange={(e) => handleChange("mz", e.target.value.toUpperCase())} maxLength={12} placeholder="Mz" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Lote</label>
                  <input type="text" value={form.lote} onChange={(e) => handleChange("lote", e.target.value.toUpperCase())} maxLength={12} placeholder="Lote" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sub Lote</label>
                  <input type="text" value={form.subLote} onChange={(e) => handleChange("subLote", e.target.value.toUpperCase())} maxLength={12} placeholder="Sub Lote" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Número</label>
                  <input type="text" value={form.numDomicilio} onChange={(e) => handleChange("numDomicilio", e.target.value.toUpperCase())} maxLength={12} placeholder="Número" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dpto</label>
                  <input type="text" value={form.dpto} onChange={(e) => handleChange("dpto", e.target.value.toUpperCase())} maxLength={12} placeholder="Dpto" className={inputClass} />
                </div>
              </div>

              {/* Letra 1 + Num 2 + Letra 2 + Piso */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className={labelClass}>Letra 1</label>
                  <input type="text" value={form.letra1} onChange={(e) => handleChange("letra1", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra 1" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Num 2</label>
                  <input type="text" value={form.numero2} onChange={(e) => handleChange("numero2", e.target.value.toUpperCase())} maxLength={10} placeholder="Num 2" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Letra 2</label>
                  <input type="text" value={form.letra2} onChange={(e) => handleChange("letra2", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra 2" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Piso</label>
                  <input type="text" value={form.piso} onChange={(e) => handleChange("piso", e.target.value.toUpperCase())} maxLength={10} placeholder="Piso" className={inputClass} />
                </div>
              </div>

              {/* Tipo Interior + Num + Letra */}
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-1.5">
                <div>
                  <label className={labelClass}>Tipo de Interior</label>
                  <select value={form.tipoInterior} onChange={(e) => handleChange("tipoInterior", e.target.value)} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposInterior.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Num Interior</label>
                  <input type="text" value={form.numInterior} onChange={(e) => handleChange("numInterior", e.target.value.toUpperCase())} maxLength={10} placeholder="Num" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Letra Interior</label>
                  <input type="text" value={form.letraInterior} onChange={(e) => handleChange("letraInterior", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra" className={inputClass} />
                </div>
              </div>

              {/* Tipo Edificación + Nombre Edificación */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label className={labelClass}>Tipo de Edificación</label>
                  <select value={form.tipoEdificacion} onChange={(e) => handleChange("tipoEdificacion", e.target.value)} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposEdificacion.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nombre de Edificación</label>
                  <input type="text" value={form.nombreEdificacion} onChange={(e) => handleChange("nombreEdificacion", e.target.value.toUpperCase())} placeholder="Nombre de edificación" className={inputClass} />
                </div>
              </div>

              {/* Tipo Ingreso + Nombre Ingreso */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label className={labelClass}>Tipo de Ingreso</label>
                  <select value={form.tipoIngreso} onChange={(e) => handleChange("tipoIngreso", e.target.value)} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposIngreso.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nombre de Ingreso</label>
                  <input type="text" value={form.nombreIngreso} onChange={(e) => handleChange("nombreIngreso", e.target.value.toUpperCase())} placeholder="Nombre de ingreso" className={inputClass} />
                </div>
              </div>

              {/* Tipo Agrupamiento + Nombre Agrupamiento */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label className={labelClass}>Tipo de Agrupamiento</label>
                  <select value={form.tipoAgrupamiento} onChange={(e) => handleChange("tipoAgrupamiento", e.target.value)} className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {tiposAgrupamiento.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nombre de Agrupamiento</label>
                  <input type="text" value={form.nombreAgrupamiento} onChange={(e) => handleChange("nombreAgrupamiento", e.target.value.toUpperCase())} placeholder="Nombre de agrupamiento" className={inputClass} />
                </div>
              </div>

              {/* Referencia */}
              <div>
                <label className={labelClass}>Referencia</label>
                <input type="text" value={form.referencia} onChange={(e) => handleChange("referencia", e.target.value.toUpperCase())} maxLength={400} placeholder="Referencia" className={inputClass} />
              </div>
            </FieldGroup>
          )}

          {/* ══ Datos de la Operación (siempre visible) ══ */}
          <FieldGroup title="Datos de la Operación" icon={<Monitor size={13} />}>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <label htmlFor="c-operador" className={labelClass}>
                  Operador
                </label>
                <input
                  id="c-operador"
                  type="text"
                  value={form.operador}
                  readOnly
                  className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                />
              </div>
              <div>
                <label htmlFor="c-estacion" className={labelClass}>
                  Estación
                </label>
                <input
                  id="c-estacion"
                  type="text"
                  value={form.estacion}
                  readOnly
                  className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                />
              </div>
              <div>
                <label htmlFor="c-fecha" className={labelClass}>
                  Fecha
                </label>
                <input
                  id="c-fecha"
                  type="text"
                  value={form.fechaOperacion}
                  readOnly
                  className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                />
              </div>
            </div>
          </FieldGroup>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGrabar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {guardando ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Guardando...
              </>
            ) : (
              "Grabar"
            )}
          </button>
        </div>

        {guardarError && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-[11px] font-medium text-red-600">
            {guardarError}
          </div>
        )}

        {combosLoading && (
          <div className="pointer-events-none absolute inset-0 top-[92px] flex items-start justify-center pt-4">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <Loader2 size={14} className="animate-spin text-sat-cyan" />
              <span className="text-xs font-medium text-slate-500">Cargando datos...</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de búsqueda de vías ── */}
      <ViaBusquedaModal
        isOpen={viaModalOpen}
        onClose={() => setViaModalOpen(false)}
        onSelect={handleViaSelect}
      />

      {/* ── Modal de representante ── */}
      <RepresentanteModal
        isOpen={representanteModalOpen}
        onClose={() => { setRepresentanteModalOpen(false); setRepresentanteMessage(null); }}
        form={representante}
        onChange={handleRepresentanteChange}
        tiposDoc={tiposDoc}
        tiposContri={tiposContri}
        distritos={distritos}
        tiposInterior={tiposInterior}
        tiposEdificacion={tiposEdificacion}
        tiposIngreso={tiposIngreso}
        tiposAgrupamiento={tiposAgrupamiento}
        combosLoading={combosLoading}
        onGrabar={grabarRepresentante}
        saveMessage={representanteMessage}
      />
    </div>
  );
}
