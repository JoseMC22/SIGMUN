"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, User, MapPin, FileText } from "lucide-react";
import {
  getTiposDocumentoAction,
  getTiposContribuyenteAction,
  getSubTiposContribuyenteAction,
  getDistritosAction,
  type TipoDocumentoOption,
  type TipoContribuyenteOption,
  type SubTipoContribuyenteOption,
  type DistritoOption,
} from "@/actions/administracion-tributaria/declaracion-jurada";

// ─── Types ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = "contribuyente" | "adicional";

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
  // ── Domicilio fiscal ──
  distrito: string;
  zonaCod: string;
  zonaNom: string;
  urbCod: string;
  urbNom: string;
  viaCod: string;
  viaNom: string;
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
};

// ─── Style tokens ──────────────────────────────────────────

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

const labelClass =
  "block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

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
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 pb-3 pt-1">
      <legend className="flex items-center gap-1.5 px-1.5 text-[11px] font-semibold text-sat-navy">
        {icon}
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
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

  // ── Reset + load combos on open ──
  useEffect(() => {
    if (!isOpen) return;

    setTab("contribuyente");
    setForm(emptyForm);
    setSubTipos([]);

    let cancelled = false;
    setCombosLoading(true);

    Promise.all([
      getTiposDocumentoAction(),
      getTiposContribuyenteAction(),
      getDistritosAction(),
    ]).then(([docRes, contriRes, distRes]) => {
      if (cancelled) return;
      if (docRes.success) setTiposDoc(docRes.data);
      if (contriRes.success) setTiposContri(contriRes.data);
      if (distRes.success) setDistritos(distRes.data);
      setCombosLoading(false);
    });

    return () => {
      cancelled = true;
    };
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
  };

  // ── Documento seleccionado (para maxLength del número) ──
  const selectedDoc = tiposDoc.find((d) => d.value === form.documento);
  const numeroMaxLength = selectedDoc?.maxDigits && selectedDoc.maxDigits > 0 ? selectedDoc.maxDigits : undefined;

  // ── Mostrar campos de defunción: tipo=01 y subtipo=02 ──
  const showDefuncion = form.tipoContri === "01" && form.subTipoContri === "02";

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
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl"
        data-testid="contribuyente-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
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
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 pt-2 shrink-0">
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
            onClick={() => setTab("adicional")}
            className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition ${
              tab === "adicional"
                ? "border border-b-0 border-slate-200 bg-white text-sat-navy"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText size={13} />
            Datos Adicionales
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto p-4">
          {tab === "contribuyente" ? (
            <div className="space-y-4">
              {/* ══ Datos Personales ══ */}
              <FieldGroup title="Datos Personales" icon={<User size={13} />}>
                {/* Codigo + Nombre / Razon */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="c-nombre" className={labelClass}>
                      Nombre y/o Razón Social
                    </label>
                    <input
                      id="c-nombre"
                      type="text"
                      value={form.nombreRazon}
                      onChange={(e) => handleChange("nombreRazon", e.target.value.toUpperCase())}
                      placeholder="Nombre y/o razón social"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Apellidos */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="c-paterno" className={labelClass}>
                      Apellido Paterno
                    </label>
                    <input
                      id="c-paterno"
                      type="text"
                      value={form.paterno}
                      onChange={(e) => handleChange("paterno", e.target.value.toUpperCase())}
                      placeholder="Apellido paterno"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="c-materno" className={labelClass}>
                      Apellido Materno
                    </label>
                    <input
                      id="c-materno"
                      type="text"
                      value={form.materno}
                      onChange={(e) => handleChange("materno", e.target.value.toUpperCase())}
                      placeholder="Apellido materno"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Documento + Numero + Buscar */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label htmlFor="c-documento" className={labelClass}>
                      Documento
                    </label>
                    <select
                      id="c-documento"
                      value={form.documento}
                      onChange={(e) => {
                        handleChange("documento", e.target.value);
                        handleChange("numero", "");
                      }}
                      className={inputClass}
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
                    <label htmlFor="c-numero" className={labelClass}>
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
                        placeholder={
                          numeroMaxLength
                            ? `Máx. ${numeroMaxLength} dígitos`
                            : "Número de documento"
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => alert("Por desarrollar")}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
                      >
                        <Search size={13} />
                        Buscar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tipo + SubTipo Contribuyente */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="c-tipo" className={labelClass}>
                      Tipo de Contribuyente
                    </label>
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
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label htmlFor="c-correo" className={labelClass}>
                      Correo Electrónico
                    </label>
                    <input
                      id="c-correo"
                      type="email"
                      value={form.correo}
                      onChange={(e) => handleChange("correo", e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Telefono + Anexo */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="c-telefono" className={labelClass}>
                      Teléfono
                    </label>
                    <input
                      id="c-telefono"
                      type="text"
                      value={form.telefono}
                      onChange={(e) => handleChange("telefono", e.target.value)}
                      placeholder="Teléfono"
                      className={inputClass}
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
                <div className="grid grid-cols-1 gap-3">
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
                        onClick={() => alert("Por desarrollar")}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-sat-cyan bg-white px-3 py-1.5 text-xs font-medium text-sat-cyan transition hover:bg-sat-cyan/5 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
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
                      placeholder="Código"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={form.zonaNom}
                      onChange={(e) => handleChange("zonaNom", e.target.value.toUpperCase())}
                      placeholder="Nombre"
                      className={inputClass}
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
                      placeholder="Código"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={form.urbNom}
                      onChange={(e) => handleChange("urbNom", e.target.value.toUpperCase())}
                      placeholder="Nombre"
                      className={inputClass}
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
                      placeholder="Código"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={form.viaNom}
                      onChange={(e) => handleChange("viaNom", e.target.value.toUpperCase())}
                      placeholder="Nombre"
                      className={inputClass}
                    />
                  </div>
                </div>
              </FieldGroup>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-3">
                <FileText size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Datos Adicionales</p>
              <p className="mt-1 text-xs text-slate-400">Por desarrollar</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => alert("Por desarrollar")}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            Grabar
          </button>
        </div>

        {combosLoading && (
          <div className="pointer-events-none absolute inset-0 top-[92px] flex items-start justify-center pt-4">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <Loader2 size={14} className="animate-spin text-sat-cyan" />
              <span className="text-xs font-medium text-slate-500">Cargando datos...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
