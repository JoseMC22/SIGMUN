"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Save, AlertCircle, Search,
} from "lucide-react";
import ViasSearchModal from "./vias-search-modal";
import RepresentanteModal from "./representante-modal";
import {
  getContribuyenteAction,
  saveContribuyenteAction,
  validateDniAction,
  fetchTiposContribuyenteAction,
  fetchSubtiposContribuyenteAction,
  fetchDistritosAction,
  fetchViasAction,
  fetchMotivosActualizacionAction,
  fetchDocumentosAction,
  fetchTiposInteriorAction,
  fetchTiposEdificacionAction,
  fetchTiposIngresoAction,
  fetchTiposAgrupamientoAction,
  getRepresentantesByContribuyenteAction,
  verificarRepresentanteAction,
} from "@/actions/registro-solicitud";

interface CatalogoItem { id: string; nombre: string }
interface DistritoItem { id_post: string; codpos: string }
interface ViaItem { id_tipo: string; nombre: string }

interface TipoContribuyenteItem { id_tipocontri: string; tipo_detalle: string }
interface SubtipoContribuyenteItem { id_subtipocontri: string; subtipo_detalle: string }
interface MotivoActualizacionItem { motivo_actualizacion_id: string; descripcion: string }
interface TipoInteriorItem { tipo_interior_id: string; descripcion: string }
interface TipoEdificacionItem { tipo_edificacion_id: string; descripcion: string }
interface TipoIngresoItem { tipo_ingreso_id: string; descripcion: string }
interface TipoAgrupamientoItem { tipo_agrupamiento_id: string; descripcion: string }

interface FormData {
  codigo: string;
  id_pers: string;
  id_docu: string;
  num_doc: string;
  nombres: string;
  paterno: string;
  materno: string;
  id_dist: string;
  tipourb: string;
  des_urb: string;
  tipovia: string;
  des_via: string;
  id_zona: string;
  id_urba: string;
  id_via: string;
  referencia: string;
  manzana: string;
  lote: string;
  sub_lote: string;
  numero: string;
  departam: string;
  id_tipocontri: string;
  id_subtipocontri: string;
  id_motivo_actualizacion: string;
  telefono1: string;
  anexo1: string;
  telefono2: string;
  anexo2: string;
  letra1: string;
  numero2: string;
  letra2: string;
  tipo_interior_id: string;
  tipo_agrupamiento_id: string;
  tipo_ingreso_id: string;
  tipo_edificacion_id: string;
  nombre_edificio: string;
  nombre_ingreso: string;
  nombre_agrupamiento: string;
  piso: string;
  letra_interno: string;
  numero_interno: string;
  correo_e: string;
  partida_defuncion: string;
  fecha_defuncion: string;
  flag_notificar: string;
  zona_nombre: string;
  urbanizacion_nombre: string;
  via_nombre: string;
}

const EMPTY_FORM: FormData = {
  codigo: "", id_pers: "", id_docu: "", num_doc: "",
  nombres: "", paterno: "", materno: "", id_dist: "",
  tipourb: "", des_urb: "", tipovia: "", des_via: "",
  id_zona: "", id_urba: "", id_via: "", referencia: "",
  manzana: "", lote: "", sub_lote: "", numero: "",
  departam: "", id_tipocontri: "", id_subtipocontri: "",
  id_motivo_actualizacion: "", telefono1: "", anexo1: "",
  telefono2: "", anexo2: "", letra1: "", numero2: "",
  letra2: "", tipo_interior_id: "", tipo_agrupamiento_id: "",
  tipo_ingreso_id: "", tipo_edificacion_id: "", nombre_edificio: "",
  nombre_ingreso: "", nombre_agrupamiento: "", piso: "",
  letra_interno: "", numero_interno: "", correo_e: "",
  partida_defuncion: "", fecha_defuncion: "", flag_notificar: "",
  zona_nombre: "", urbanizacion_nombre: "", via_nombre: "",
};

interface Props {
  isOpen: boolean;
  codigo: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function InputField({
  label, value, onChange, placeholder, maxLength, required, error, readOnly, type,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number; required?: boolean;
  error?: string; readOnly?: boolean; type?: string;
}) {
  const inputId = `input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-[10px] font-bold text-slate-500 mb-0.5 leading-none">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`w-full rounded border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
            : readOnly
              ? "border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
              : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
        }`}
      />
      {error && <p className="mt-0.5 text-[9px] text-red-500">{error}</p>}
    </div>
  );
}

function SelectField({
  label, value, onChange, options, required, error, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean; error?: string; placeholder?: string;
}) {
  const selectId = `select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  return (
    <div>
      <label htmlFor={selectId} className="block text-[10px] font-bold text-slate-500 mb-0.5 leading-none">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
            : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
        }`}
      >
        <option value="">{placeholder ?? "[Seleccione]"}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-0.5 text-[9px] text-red-500">{error}</p>}
    </div>
  );
}

export default function RegistroSolicitudEditModal({ isOpen, codigo, onClose, onSaved }: Props) {
  const isEditing = !!codigo;
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validatingDni, setValidatingDni] = useState(false);
  const [dniValidated, setDniValidated] = useState(false);
  const [activeTab, setActiveTab] = useState<"datos" | "domicilio">("datos");
  const [isViasModalOpen, setIsViasModalOpen] = useState(false);
  const [dniWarning, setDniWarning] = useState<string | null>(null);

  const [tiposContribuyente, setTiposContribuyente] = useState<TipoContribuyenteItem[]>([]);
  const [subtiposContribuyente, setSubtiposContribuyente] = useState<SubtipoContribuyenteItem[]>([]);
  const [distritos, setDistritos] = useState<DistritoItem[]>([]);
  const [vias, setVias] = useState<ViaItem[]>([]);
  const [motivosActualizacion, setMotivosActualizacion] = useState<MotivoActualizacionItem[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<CatalogoItem[]>([]);
  const [tiposInterior, setTiposInterior] = useState<TipoInteriorItem[]>([]);
  const [tiposEdificacion, setTiposEdificacion] = useState<TipoEdificacionItem[]>([]);
  const [tiposIngreso, setTiposIngreso] = useState<TipoIngresoItem[]>([]);
  const [tiposAgrupamiento, setTiposAgrupamiento] = useState<TipoAgrupamientoItem[]>([]);

  // Representante state
  const [representanteData, setRepresentanteData] = useState<Record<string, any> | null>(null);
  const [hasRepresentante, setHasRepresentante] = useState(false);
  const [isRepresentanteModalOpen, setIsRepresentanteModalOpen] = useState(false);

  const setField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  useEffect(() => {
    if (!isOpen) return;
    const loadCatalogs = async () => {
      const [
        tiposRes, distritosRes, viasRes, motivosRes,
        docsRes, intRes, edifRes, ingRes, agrupRes,
      ] = await Promise.all([
        fetchTiposContribuyenteAction(), fetchDistritosAction(), fetchViasAction(),
        fetchMotivosActualizacionAction(), fetchDocumentosAction(),
        fetchTiposInteriorAction(), fetchTiposEdificacionAction(),
        fetchTiposIngresoAction(), fetchTiposAgrupamientoAction(),
      ]);
      if (tiposRes.success) setTiposContribuyente(tiposRes.data);
      if (distritosRes.success) setDistritos(distritosRes.data);
      if (viasRes.success) setVias(viasRes.data);
      if (motivosRes.success) setMotivosActualizacion(motivosRes.data);
      if (docsRes.success) setTiposDocumento(docsRes.data);
      if (intRes.success) setTiposInterior(intRes.data);
      if (edifRes.success) setTiposEdificacion(edifRes.data);
      if (ingRes.success) setTiposIngreso(ingRes.data);
      if (agrupRes.success) setTiposAgrupamiento(agrupRes.data);
    };
    loadCatalogs();
  }, [isOpen]);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getContribuyenteAction(id);
      if (res.success) {
        const d = res.data;
        setForm({
          codigo: d.codigo ?? "", id_pers: d.id_pers ?? "",
          id_docu: d.id_docu ?? "", num_doc: d.num_doc ?? "",
          nombres: d.nombres ?? "", paterno: d.paterno ?? "", materno: d.materno ?? "",
          id_dist: d.id_dist ?? "", tipourb: d.tipourb ?? "", des_urb: d.des_urb ?? "",
          tipovia: d.tipovia ?? "", des_via: d.des_via ?? "",
          id_zona: d.id_zona ?? "", id_urba: d.id_urba ?? "", id_via: d.id_via ?? "",
          referencia: d.referencia ?? "", manzana: d.manzana ?? "",
          lote: d.lote ?? "", sub_lote: d.sub_lote ?? "", numero: d.numero ?? "",
          departam: d.departam ?? "", id_tipocontri: d.id_tipocontri ?? "",
          id_subtipocontri: d.id_subtipocontri ?? "",
          id_motivo_actualizacion: d.id_motivo_actualizacion ?? "",
          telefono1: d.telefono1 ?? "", anexo1: d.anexo1 ?? "",
          telefono2: d.telefono2 ?? "", anexo2: d.anexo2 ?? "",
          letra1: d.letra1 ?? "", numero2: d.numero2 ?? "", letra2: d.letra2 ?? "",
          tipo_interior_id: d.tipo_interior_id ?? "",
          tipo_agrupamiento_id: d.tipo_agrupamiento_id ?? "",
          tipo_ingreso_id: d.tipo_ingreso_id ?? "",
          tipo_edificacion_id: d.tipo_edificacion_id ?? "",
          nombre_edificio: d.nombre_edificio ?? "", nombre_ingreso: d.nombre_ingreso ?? "",
          nombre_agrupamiento: d.nombre_agrupamiento ?? "",
          piso: d.piso ?? "", letra_interno: d.letra_interno ?? "",
          numero_interno: d.numero_interno ?? "", correo_e: d.correo_e ?? "",
          partida_defuncion: d.partida_defuncion ?? "",
          fecha_defuncion: d.fecha_defuncion ?? "",
          flag_notificar: d.flag_notificar ?? "",
          zona_nombre: d.zona ?? "",
          urbanizacion_nombre: [d.nombabr, d.nombre_urba].filter(Boolean).join(" "),
          via_nombre: d.nombre_via ?? "",
        });
        setDniValidated(true);
        if (d.id_tipocontri) loadSubtipos(d.id_tipocontri);
        // Load representante if exists
        if (d.codigo) {
          const repRes = await getRepresentantesByContribuyenteAction(d.codigo);
          if (repRes.success && repRes.data && repRes.data.length > 0) {
            setRepresentanteData(repRes.data[0]);
            setHasRepresentante(true);
          }
        }
      } else {
        setFetchError(res.error);
      }
    } catch {
      setFetchError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_FORM,
        id_dist: "012", // Default to "012" (ICA) for new registrations
      });
      setErrors({});
      setFetchError(null);
      setSaveError(null);
      setDniValidated(false);
      setDniWarning(null);
      setSubtiposContribuyente([]);
      setActiveTab("datos");
      setRepresentanteData(null);
      setHasRepresentante(false);
      if (codigo) loadDetail(codigo);
    }
  }, [isOpen, codigo, loadDetail]);

  const loadSubtipos = async (idTipo: string) => {
    const res = await fetchSubtiposContribuyenteAction(idTipo);
    if (res.success) setSubtiposContribuyente(res.data);
    else setSubtiposContribuyente([]);
  };

  const handleTipoContribuyenteChange = (value: string) => {
    setField("id_tipocontri", value);
    setField("id_subtipocontri", "");
    if (value) loadSubtipos(value);
    else setSubtiposContribuyente([]);
  };

  const handleDistritoChange = (value: string) => {
    setField("id_dist", value);
    if (value === "012") {
      setForm(prev => ({
        ...prev,
        id_dist: value,
        tipovia: "",
        des_via: "",
        tipourb: "",
        des_urb: "",
      }));
    } else {
      setForm(prev => ({
        ...prev,
        id_dist: value,
        id_zona: "",
        id_urba: "",
        id_via: "",
        zona_nombre: "",
        urbanizacion_nombre: "",
        via_nombre: "",
      }));
    }
  };

  const handleValidateDni = async () => {
    if (!form.num_doc.trim()) return;
    setValidatingDni(true);
    setDniWarning(null);
    try {
      const res = await validateDniAction(form.num_doc);
      if (res.success) {
        if (res.exists) {
          setDniWarning("El contribuyente con este documento ya se encuentra registrado.");
        }
        if (res.data) {
          setField("nombres", res.data.nombres ?? "");
          setField("paterno", res.data.paterno ?? "");
          setField("materno", res.data.materno ?? "");
          setDniValidated(true);
        }
      }
    } finally {
      setValidatingDni(false);
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.id_docu.trim()) errs.id_docu = "Tipo documento requerido";
    if (!form.num_doc.trim()) errs.num_doc = "N° documento requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Verify representante exists for juridico contribuyentes (only when codigo exists)
    if (form.id_tipocontri !== '' && form.id_tipocontri !== '01' && form.codigo) {
      const verRes = await verificarRepresentanteAction(form.codigo);
      if (verRes.success && !verRes.exists) {
        setSaveError("Debe agregar un representante legal antes de guardar");
        return;
      }
    }

    setSaving(true);
    setSaveError(null);
    try {
      const res = await saveContribuyenteAction({
        codigo: isEditing ? form.codigo : undefined,
        id_pers: form.id_pers || undefined,
        id_docu: form.id_docu,
        num_doc: form.num_doc,
        nombres: form.nombres || undefined,
        paterno: form.paterno || undefined,
        materno: form.materno || undefined,
        id_dist: form.id_dist || undefined,
        tipourb: form.tipourb || undefined,
        des_urb: form.des_urb || undefined,
        tipovia: form.tipovia || undefined,
        des_via: form.des_via || undefined,
        id_zona: form.id_zona || undefined,
        id_urba: form.id_urba || undefined,
        id_via: form.id_via || undefined,
        referencia: form.referencia || undefined,
        manzana: form.manzana || undefined,
        lote: form.lote || undefined,
        sub_lote: form.sub_lote || undefined,
        numero: form.numero || undefined,
        departam: form.departam || undefined,
        id_tipocontri: form.id_tipocontri || undefined,
        id_subtipocontri: form.id_subtipocontri || undefined,
        id_motivo_actualizacion: form.id_motivo_actualizacion || undefined,
        telefono1: form.telefono1 || undefined,
        anexo1: form.anexo1 || undefined,
        telefono2: form.telefono2 || undefined,
        anexo2: form.anexo2 || undefined,
        letra1: form.letra1 || undefined,
        numero2: form.numero2 || undefined,
        letra2: form.letra2 || undefined,
        tipo_interior_id: form.tipo_interior_id || undefined,
        tipo_agrupamiento_id: form.tipo_agrupamiento_id || undefined,
        tipo_ingreso_id: form.tipo_ingreso_id || undefined,
        tipo_edificacion_id: form.tipo_edificacion_id || undefined,
        nombre_edificio: form.nombre_edificio || undefined,
        nombre_ingreso: form.nombre_ingreso || undefined,
        nombre_agrupamiento: form.nombre_agrupamiento || undefined,
        piso: form.piso || undefined,
        letra_interno: form.letra_interno || undefined,
        numero_interno: form.numero_interno || undefined,
        correo_e: form.correo_e || undefined,
        partida_defuncion: form.partida_defuncion || undefined,
        fecha_defuncion: form.fecha_defuncion || undefined,
        flag_notificar: form.flag_notificar || undefined,
      });
      if (res.success) {
        onClose();
        onSaved();
      } else {
        setSaveError(res.error);
      }
    } catch {
      setSaveError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isEditing ? "Editar Contribuyente" : "Nuevo Contribuyente"}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4">
          <button
            type="button"
            onClick={() => setActiveTab("datos")}
            className={`px-4 py-2.5 text-xs font-bold transition focus:outline-none ${
              activeTab === "datos"
                ? "border-b-2 border-sat-cyan text-sat-cyan font-extrabold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Datos de Contribuyente
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("domicilio")}
            className={`px-4 py-2.5 text-xs font-bold transition focus:outline-none ${
              activeTab === "domicilio"
                ? "border-b-2 border-sat-cyan text-sat-cyan font-extrabold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Datos Domicilio fiscal
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin text-sat-cyan" />
                Cargando datos del contribuyente...
              </div>
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 rounded-full bg-red-100 p-3">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-600">{fetchError}</p>
              <button type="button" onClick={() => codigo && loadDetail(codigo)}
                className="mt-3 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !fetchError && (
            <div className="space-y-4">
              {/* Tab 1: Datos de Contribuyente */}
              {activeTab === "datos" && (
                <div className="space-y-4 animate-fade-in">
                  <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                    <legend className="ml-3 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Datos Personales:
                    </legend>
                    <div className="p-3 space-y-3">
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                          <InputField label="Código:" value={form.codigo} onChange={() => {}} readOnly placeholder="Autogenerado" />
                        </div>
                        <div className="md:col-span-9">
                          <InputField label="Nombre y/o Razón Social:" value={form.nombres} onChange={(v) => setField("nombres", v)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InputField label="Apellido Paterno:" value={form.paterno} onChange={(v) => setField("paterno", v)} />
                        <InputField label="Apellido Materno:" value={form.materno} onChange={(v) => setField("materno", v)} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4">
                          <SelectField
                            label="Documento:" value={form.id_docu} onChange={(v) => setField("id_docu", v)}
                            options={tiposDocumento.map((t) => ({ value: t.id, label: t.nombre }))}
                            required error={errors.id_docu}
                          />
                        </div>
                        <div className="md:col-span-6 relative">
                          <InputField
                            label="Número:" value={form.num_doc} onChange={(v) => { setField("num_doc", v); setDniValidated(false); setDniWarning(null); }}
                            required error={errors.num_doc}
                          />
                          {dniWarning && (
                            <p className="absolute left-0 -bottom-4 text-[10px] text-amber-600 font-semibold animate-fade-in whitespace-nowrap">
                              ⚠️ {dniWarning}
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <button
                            type="button"
                            onClick={handleValidateDni}
                            disabled={validatingDni || !form.num_doc.trim()}
                            className="w-full rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 text-[11px] font-medium transition active:scale-[0.98] flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {validatingDni ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                            Buscar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <SelectField
                          label="Tipo de Contribuyente:" value={form.id_tipocontri}
                          onChange={handleTipoContribuyenteChange}
                          options={tiposContribuyente.map((t) => ({ value: t.id_tipocontri, label: t.tipo_detalle }))}
                        />
                        <SelectField
                          label="SubTipo Contribuyente:" value={form.id_subtipocontri}
                          onChange={(v) => setField("id_subtipocontri", v)}
                          options={subtiposContribuyente.map((s) => ({ value: s.id_subtipocontri, label: s.subtipo_detalle }))}
                        />
                      </div>
                      {/* Representante button — visible only for juridico */}
                      {form.id_tipocontri !== '' && form.id_tipocontri !== '01' && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setIsRepresentanteModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded border border-sat-cyan bg-sat-cyan/10 hover:bg-sat-cyan/20 text-sat-cyan px-3 py-1.5 text-[11px] font-bold transition active:scale-[0.98]"
                          >
                            {hasRepresentante ? "Editar Representante" : "Agregar Representante"}
                          </button>
                          {hasRepresentante && representanteData && (
                            <span className="ml-2 text-[10px] text-slate-500">
                              {representanteData.nombres} {representanteData.paterno}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Motivo de Actualización */}
                      {!isEditing ? (
                        <input type="hidden" value="" />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <SelectField
                            label="Tipo de Contribuyente Actualizacion:" value={form.id_motivo_actualizacion}
                            onChange={(v) => setField("id_motivo_actualizacion", v)}
                            options={motivosActualizacion.map((m) => ({ value: m.motivo_actualizacion_id, label: m.descripcion }))}
                          />
                        </div>
                      )}

                      {form.id_subtipocontri === "02" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-dashed border-slate-200 animate-fade-in">
                          <InputField label="Partid. de Defuncion:" value={form.partida_defuncion} onChange={(v) => setField("partida_defuncion", v)} />
                          <InputField label="Fecha de Defuncion:" value={form.fecha_defuncion} onChange={(v) => setField("fecha_defuncion", v)} type="date" />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                        <InputField label="Correo Electronico (*):" value={form.correo_e} onChange={(v) => setField("correo_e", v)} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6">
                          <InputField label="Telefono1 (*):" value={form.telefono1} onChange={(v) => setField("telefono1", v)} />
                        </div>
                        <div className="md:col-span-6">
                          <InputField label="Anexo1:" value={form.anexo1} onChange={(v) => setField("anexo1", v)} />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                    <legend className="ml-3 px-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      Domicilio fiscal: (*)
                    </legend>
                    <div className="p-3 space-y-3">
                      <div>
                        <SelectField
                          label="Distrito:" value={form.id_dist} onChange={handleDistritoChange}
                          options={distritos.map((d) => ({ value: d.id_post, label: d.codpos }))}
                        />
                      </div>

                      {form.id_dist === "012" ? (
                        <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-3">
                              <InputField label="Zona (Código):" value={form.id_zona} onChange={(v) => setField("id_zona", v)} />
                            </div>
                            <div className="md:col-span-9">
                              <InputField label="Zona (Nombre):" value={form.zona_nombre} onChange={(v) => setField("zona_nombre", v)} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-3">
                              <InputField label="Urbanización (Código):" value={form.id_urba} onChange={(v) => setField("id_urba", v)} />
                            </div>
                            <div className="md:col-span-7">
                              <InputField label="Urbanización (Nombre):" value={form.urbanizacion_nombre} onChange={(v) => setField("urbanizacion_nombre", v)} />
                            </div>
                            <div className="md:col-span-2">
                              <button
                                type="button"
                                onClick={() => setIsViasModalOpen(true)}
                                className="w-full rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 text-[11px] font-medium transition active:scale-[0.98]"
                              >
                                Busqueda
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-3">
                              <InputField label="Vía (Código):" value={form.id_via} onChange={(v) => setField("id_via", v)} />
                            </div>
                            <div className="md:col-span-9">
                              <InputField label="Vía (Nombre):" value={form.via_nombre} onChange={(v) => setField("via_nombre", v)} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4">
                              <SelectField
                                label="Tipo Urb.:" value={form.tipourb} onChange={(v) => setField("tipourb", v)}
                                options={[]} // Empty or catalog if available
                              />
                            </div>
                            <div className="md:col-span-8">
                              <InputField label="Descripción Urb.:" value={form.des_urb} onChange={(v) => setField("des_urb", v)} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4">
                              <SelectField
                                label="Tipo Vía:" value={form.tipovia} onChange={(v) => setField("tipovia", v)}
                                options={vias.map((v) => ({ value: v.id_tipo, label: v.nombre }))}
                              />
                            </div>
                            <div className="md:col-span-8">
                              <InputField label="Descripción Vía:" value={form.des_via} onChange={(v) => setField("des_via", v)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </fieldset>
                </div>
              )}

              {/* Tab 2: Datos Domicilio fiscal */}
              {activeTab === "domicilio" && (
                <div className="space-y-4 animate-fade-in">
                  <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                    <legend className="ml-3 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Datos Domicilio fiscal:
                    </legend>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        <InputField label="Mz:" value={form.manzana} onChange={(v) => setField("manzana", v)} maxLength={12} />
                        <InputField label="Lote:" value={form.lote} onChange={(v) => setField("lote", v)} maxLength={12} />
                        <InputField label="Sub Lote:" value={form.sub_lote} onChange={(v) => setField("sub_lote", v)} maxLength={12} />
                        <InputField label="Número:" value={form.numero} onChange={(v) => setField("numero", v)} maxLength={12} />
                        <InputField label="Dpto:" value={form.departam} onChange={(v) => setField("departam", v)} maxLength={12} />
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <InputField label="Letra 1:" value={form.letra1} onChange={(v) => setField("letra1", v)} maxLength={10} />
                        <InputField label="Num 2:" value={form.numero2} onChange={(v) => setField("numero2", v)} maxLength={10} />
                        <InputField label="Letra 2:" value={form.letra2} onChange={(v) => setField("letra2", v)} maxLength={10} />
                        <InputField label="Piso:" value={form.piso} onChange={(v) => setField("piso", v)} maxLength={10} />
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <SelectField
                            label="Tipo de Interior:" value={form.tipo_interior_id}
                            onChange={(v) => setField("tipo_interior_id", v)}
                            options={tiposInterior.map((t) => ({ value: t.tipo_interior_id, label: t.descripcion }))}
                          />
                        </div>
                        <div className="col-span-4">
                          <InputField label="Num:" value={form.numero_interno} onChange={(v) => setField("numero_interno", v)} maxLength={10} />
                        </div>
                        <div className="col-span-4">
                          <InputField label="Letra:" value={form.letra_interno} onChange={(v) => setField("letra_interno", v)} maxLength={10} />
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <SelectField
                            label="Tipo de Edificación:" value={form.tipo_edificacion_id}
                            onChange={(v) => setField("tipo_edificacion_id", v)}
                            options={tiposEdificacion.map((t) => ({ value: t.tipo_edificacion_id, label: t.descripcion }))}
                          />
                        </div>
                        <div className="col-span-8">
                          <InputField label="Nombre de Edificación:" value={form.nombre_edificio} onChange={(v) => setField("nombre_edificio", v)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <SelectField
                            label="Tipo de Ingreso:" value={form.tipo_ingreso_id}
                            onChange={(v) => setField("tipo_ingreso_id", v)}
                            options={tiposIngreso.map((t) => ({ value: t.tipo_ingreso_id, label: t.descripcion }))}
                          />
                        </div>
                        <div className="col-span-8">
                          <InputField label="Nombre de Ingreso:" value={form.nombre_ingreso} onChange={(v) => setField("nombre_ingreso", v)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <SelectField
                            label="Tipo de Agrupamiento:" value={form.tipo_agrupamiento_id}
                            onChange={(v) => setField("tipo_agrupamiento_id", v)}
                            options={tiposAgrupamiento.map((t) => ({ value: t.tipo_agrupamiento_id, label: t.descripcion }))}
                          />
                        </div>
                        <div className="col-span-8">
                          <InputField label="Nombre de Agrupamiento:" value={form.nombre_agrupamiento} onChange={(v) => setField("nombre_agrupamiento", v)} />
                        </div>
                      </div>

                      <div>
                        <InputField label="Referencia:" value={form.referencia} onChange={(v) => setField("referencia", v)} />
                      </div>
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-1 gap-4">
                    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                      <legend className="ml-3 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Notificaciones
                      </legend>
                      <div className="p-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.flag_notificar === "1"}
                            onChange={(e) => setField("flag_notificar", e.target.checked ? "1" : "0")}
                            className="h-4 w-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/30"
                          />
                          <span className="text-[11px] font-medium text-slate-700">Notificar para declaración</span>
                        </label>
                      </div>
                    </fieldset>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 animate-fade-in">
                  <AlertCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-[11px] font-medium text-red-600">{saveError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && !fetchError && (
          <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md font-medium">
              <span>Operador: <strong>{form.codigo ? (form.correo_e ? form.correo_e.split("@")[0] : "Jmozo") : "Jmozo"}</strong></span>
              <span className="w-1 h-1 bg-slate-400 rounded-full" />
              <span>Estacion: <strong>NEW-SERVER</strong></span>
              <span className="w-1 h-1 bg-slate-400 rounded-full" />
              <span>Fecha: <strong>{new Date().toLocaleDateString("es-PE")}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Cerrar Formulario
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded border border-sat-cyan bg-sat-cyan hover:bg-cyan-600 px-4 py-2 text-[11px] font-bold text-white transition focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Grabar Datos
              </button>
            </div>
          </div>
        )}
      </div>

      <ViasSearchModal
        isOpen={isViasModalOpen}
        onClose={() => setIsViasModalOpen(false)}
        onSelect={(selected) => {
          setForm((prev) => ({
            ...prev,
            id_zona: selected.codzona,
            zona_nombre: selected.nomzona,
            id_urba: selected.codurba,
            urbanizacion_nombre: selected.nomurba,
            id_via: selected.codigo,
            via_nombre: selected.nomvia,
          }));
        }}
      />

      <RepresentanteModal
        isOpen={isRepresentanteModalOpen}
        onClose={() => setIsRepresentanteModalOpen(false)}
        onSaved={() => {
          // Refresh representante state after save
          if (form.codigo) {
            getRepresentantesByContribuyenteAction(form.codigo).then((res) => {
              if (res.success && res.data && res.data.length > 0) {
                setRepresentanteData(res.data[0]);
                setHasRepresentante(true);
              }
            });
          }
        }}
        codigoContribuyente={form.codigo || ''}
        existingData={representanteData}
      />
    </div>
  );
}
