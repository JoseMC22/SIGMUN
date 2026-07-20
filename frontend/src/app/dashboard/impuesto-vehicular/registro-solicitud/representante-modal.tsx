"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, AlertCircle, Search } from "lucide-react";
import ViasSearchModal from "./vias-search-modal";
import {
  fetchTiposRelacionAction,
  fetchDocumentosAction,
  fetchDistritosAction,
  fetchViasAction,
  fetchTiposInteriorAction,
  fetchTiposEdificacionAction,
  fetchTiposIngresoAction,
  fetchTiposAgrupamientoAction,
  saveRepresentanteAction,
} from "@/actions/registro-solicitud";

interface CatalogoItem { id: string; nombre: string }
interface DistritoItem { id_post: string; codpos: string }
interface ViaItem { id_tipo: string; nombre: string }
interface TipoInteriorItem { tipo_interior_id: string; descripcion: string }
interface TipoEdificacionItem { tipo_edificacion_id: string; descripcion: string }
interface TipoIngresoItem { tipo_ingreso_id: string; descripcion: string }
interface TipoAgrupamientoItem { tipo_agrupamiento_id: string; descripcion: string }

interface TipoRelacionItem {
  tipo_relacion_id: string;
  descripcion: string;
}

interface RepresentanteFormData {
  id_representante: string;
  codigo_contribuyente: string;
  nombres: string;
  paterno: string;
  materno: string;
  id_documento: string;
  num_documento: string;
  tipo_relacion_id: string;
  id_dist: string;
  id_via: string;
  id_zona: string;
  id_urba: string;
  manzana: string;
  lote: string;
  sub_lote: string;
  numero: string;
  departam: string;
  referencia: string;
  piso: string;
  letra1: string;
  numero2: string;
  letra2: string;
  tipo_interior_id: string;
  numero_interno: string;
  letra_interno: string;
  tipo_edificacion_id: string;
  nombre_edificio: string;
  tipo_ingreso_id: string;
  nombre_ingreso: string;
  tipo_agrupamiento_id: string;
  nombre_agrupamiento: string;
}

const EMPTY_FORM: RepresentanteFormData = {
  id_representante: "", codigo_contribuyente: "",
  nombres: "", paterno: "", materno: "",
  id_documento: "", num_documento: "", tipo_relacion_id: "",
  id_dist: "", id_via: "", id_zona: "", id_urba: "",
  manzana: "", lote: "", sub_lote: "", numero: "", departam: "",
  referencia: "", piso: "", letra1: "", numero2: "", letra2: "",
  tipo_interior_id: "", numero_interno: "", letra_interno: "",
  tipo_edificacion_id: "", nombre_edificio: "",
  tipo_ingreso_id: "", nombre_ingreso: "",
  tipo_agrupamiento_id: "", nombre_agrupamiento: "",
};

function InputField({
  label, value, onChange, placeholder, maxLength, required, error, readOnly, type,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number; required?: boolean;
  error?: string; readOnly?: boolean; type?: string;
}) {
  const inputId = `rep-input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
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
  const selectId = `rep-select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  
  // Deduplicate options based on value
  const uniqueOptions = Array.from(
    new Map(options.map(opt => [opt.value, opt])).values()
  );
  
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
        {uniqueOptions.map((opt, index) => (
          <option key={`${opt.value}-${index}`} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-0.5 text-[9px] text-red-500">{error}</p>}
    </div>
  );
}

interface RepresentanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSavePending?: (data: any) => void;
  codigoContribuyente: string;
  existingData?: Record<string, any> | null;
}

export default function RepresentanteModal({
  isOpen, onClose, onSaved, onSavePending, codigoContribuyente, existingData,
}: RepresentanteModalProps) {
  const isEditing = !!existingData;
  const [form, setForm] = useState<RepresentanteFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof RepresentanteFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Catalog states
  const [tiposRelacion, setTiposRelacion] = useState<TipoRelacionItem[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<CatalogoItem[]>([]);
  const [distritos, setDistritos] = useState<DistritoItem[]>([]);
  const [vias, setVias] = useState<ViaItem[]>([]);
  const [tiposInterior, setTiposInterior] = useState<TipoInteriorItem[]>([]);
  const [tiposEdificacion, setTiposEdificacion] = useState<TipoEdificacionItem[]>([]);
  const [tiposIngreso, setTiposIngreso] = useState<TipoIngresoItem[]>([]);
  const [tiposAgrupamiento, setTiposAgrupamiento] = useState<TipoAgrupamientoItem[]>([]);

  const [isViasModalOpen, setIsViasModalOpen] = useState(false);
  const [zonaNombre, setZonaNombre] = useState("");
  const [urbaNombre, setUrbaNombre] = useState("");
  const [viaNombre, setViaNombre] = useState("");

  const setField = (field: keyof RepresentanteFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  // Load catalogs on open
  useEffect(() => {
    if (!isOpen) return;
    const loadCatalogs = async () => {
      const [
        relRes, docsRes, distRes, viasRes,
        intRes, edifRes, ingRes, agrupRes,
      ] = await Promise.all([
        fetchTiposRelacionAction(), fetchDocumentosAction(), fetchDistritosAction(), fetchViasAction(),
        fetchTiposInteriorAction(), fetchTiposEdificacionAction(),
        fetchTiposIngresoAction(), fetchTiposAgrupamientoAction(),
      ]);
      if (relRes.success) setTiposRelacion(relRes.data);
      if (docsRes.success) setTiposDocumento(docsRes.data);
      if (distRes.success) setDistritos(distRes.data);
      if (viasRes.success) setVias(viasRes.data);
      if (intRes.success) setTiposInterior(intRes.data);
      if (edifRes.success) setTiposEdificacion(edifRes.data);
      if (ingRes.success) setTiposIngreso(ingRes.data);
      if (agrupRes.success) setTiposAgrupamiento(agrupRes.data);
    };
    loadCatalogs();
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;
    console.log("[RepresentanteModal] useEffect, isOpen:", isOpen);
    console.log("[RepresentanteModal] existingData:", existingData);
    console.log("[RepresentanteModal] codigoContribuyente prop:", codigoContribuyente);
    if (existingData) {
      setForm({
        id_representante: existingData.id_representante ?? "",
        codigo_contribuyente: existingData.codigo_contribuyente ?? codigoContribuyente,
        nombres: existingData.nombres ?? "",
        paterno: existingData.paterno ?? "",
        materno: existingData.materno ?? "",
        id_documento: existingData.id_documento ?? "",
        num_documento: existingData.num_documento ?? "",
        tipo_relacion_id: existingData.tipo_relacion_id ?? "",
        id_dist: existingData.id_dist ?? "",
        id_via: existingData.id_via ?? "",
        id_zona: existingData.id_zona ?? "",
        id_urba: existingData.id_urba ?? "",
        manzana: existingData.manzana ?? "",
        lote: existingData.lote ?? "",
        sub_lote: existingData.sub_lote ?? "",
        numero: existingData.numero ?? "",
        departam: existingData.departam ?? "",
        referencia: existingData.referencia ?? "",
        piso: existingData.piso ?? "",
        letra1: existingData.letra1 ?? "",
        numero2: existingData.numero2 ?? "",
        letra2: existingData.letra2 ?? "",
        tipo_interior_id: existingData.tipo_interior_id ?? "",
        numero_interno: existingData.numero_interno ?? "",
        letra_interno: existingData.letra_interno ?? "",
        tipo_edificacion_id: existingData.tipo_edificacion_id ?? "",
        nombre_edificio: existingData.nombre_edificio ?? "",
        tipo_ingreso_id: existingData.tipo_ingreso_id ?? "",
        nombre_ingreso: existingData.nombre_ingreso ?? "",
        tipo_agrupamiento_id: existingData.tipo_agrupamiento_id ?? "",
        nombre_agrupamiento: existingData.nombre_agrupamiento ?? "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        codigo_contribuyente: codigoContribuyente,
        id_dist: "012",
      });
    }
    console.log("[RepresentanteModal] Set form to:", existingData ? existingData : { ...EMPTY_FORM, codigo_contribuyente: codigoContribuyente, id_dist: "012" });
    setErrors({});
    setSaveError(null);
    setZonaNombre("");
    setUrbaNombre("");
    setViaNombre("");
  }, [isOpen, existingData, codigoContribuyente]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof RepresentanteFormData, string>> = {};
    if (!form.nombres.trim()) errs.nombres = "Nombres requerido";
    if (!form.paterno.trim()) errs.paterno = "Apellido paterno requerido";
    if (!form.id_documento.trim()) errs.id_documento = "Tipo documento requerido";
    if (!form.num_documento.trim()) errs.num_documento = "N° documento requerido";
    if (!form.tipo_relacion_id.trim()) errs.tipo_relacion_id = "Tipo relación requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    console.log("[RepresentanteModal] handleSave called, form:", form);
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        id_representante: isEditing ? form.id_representante : undefined,
        codigo_contribuyente: form.codigo_contribuyente,
        nombres: form.nombres,
        paterno: form.paterno,
        materno: form.materno,
        id_documento: form.id_documento,
        num_documento: form.num_documento,
        tipo_relacion_id: form.tipo_relacion_id,
        id_dist: form.id_dist,
        id_via: form.id_via,
        id_zona: form.id_zona,
        id_urba: form.id_urba,
        manzana: form.manzana,
        lote: form.lote,
        sub_lote: form.sub_lote,
        numero: form.numero,
        departam: form.departam,
        referencia: form.referencia,
        piso: form.piso,
        letra1: form.letra1,
        numero2: form.numero2,
        letra2: form.letra2,
        tipo_interior_id: form.tipo_interior_id,
        numero_interno: form.numero_interno,
        letra_interno: form.letra_interno,
        tipo_edificacion_id: form.tipo_edificacion_id,
        nombre_edificio: form.nombre_edificio,
        tipo_ingreso_id: form.tipo_ingreso_id,
        nombre_ingreso: form.nombre_ingreso,
        tipo_agrupamiento_id: form.tipo_agrupamiento_id,
        nombre_agrupamiento: form.nombre_agrupamiento,
      };
      
      // Si no hay código contribuyente, usar el callback pendiente
      if (!form.codigo_contribuyente.trim() && onSavePending) {
        console.log("[RepresentanteModal] Saving as pending representante:", payload);
        onSavePending(payload);
        return;
      }
      
      console.log("[RepresentanteModal] Sending payload to saveRepresentanteAction:", payload);
      const res = await saveRepresentanteAction(payload);
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setSaveError(res.error ?? "Error al guardar representante");
      }
    } catch {
      setSaveError("Error al guardar representante");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isEditing ? "Editar Representante" : "Agregar Representante"}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!codigoContribuyente.trim() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-xs">
                ⓘ El representante se guardará automáticamente después de que guardes el contribuyente.
              </p>
            </div>
          )}
          {/* Section 1: Datos Personales + Tipo Relación */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
            <legend className="ml-3 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Datos Personales:
            </legend>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InputField label="Nombres:" value={form.nombres} onChange={(v) => setField("nombres", v)} required error={errors.nombres} />
                <InputField label="Apellido Paterno:" value={form.paterno} onChange={(v) => setField("paterno", v)} required error={errors.paterno} />
                <InputField label="Apellido Materno:" value={form.materno} onChange={(v) => setField("materno", v)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <SelectField
                    label="Tipo Documento:" value={form.id_documento} onChange={(v) => setField("id_documento", v)}
                    options={tiposDocumento.map((t) => ({ value: t.id, label: t.nombre }))}
                    required error={errors.id_documento}
                  />
                </div>
                <div className="md:col-span-5">
                  <InputField label="N° Documento:" value={form.num_documento} onChange={(v) => setField("num_documento", v)} required error={errors.num_documento} />
                </div>
                <div className="md:col-span-3">
                  <SelectField
                    label="Tipo Relación:" value={form.tipo_relacion_id} onChange={(v) => setField("tipo_relacion_id", v)}
                    options={tiposRelacion.map((t) => ({ value: t.tipo_relacion_id, label: t.descripcion }))}
                    required error={errors.tipo_relacion_id}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Section 2: Domicilio fiscal */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
            <legend className="ml-3 px-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">
              Domicilio fiscal:
            </legend>
            <div className="p-3 space-y-3">
              <div>
                <SelectField
                  label="Distrito:" value={form.id_dist} onChange={(v) => setField("id_dist", v)}
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
                      <InputField label="Zona (Nombre):" value={zonaNombre} onChange={() => {}} readOnly />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <InputField label="Urbanización (Código):" value={form.id_urba} onChange={(v) => setField("id_urba", v)} />
                    </div>
                    <div className="md:col-span-7">
                      <InputField label="Urbanización (Nombre):" value={urbaNombre} onChange={() => {}} readOnly />
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
                      <InputField label="Vía (Nombre):" value={viaNombre} onChange={() => {}} readOnly />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4">
                      <SelectField
                        label="Tipo Urb.:" value="" onChange={() => {}}
                        options={[]}
                      />
                    </div>
                    <div className="md:col-span-8">
                      <InputField label="Descripción Urb.:" value="" onChange={() => {}} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4">
                      <SelectField
                        label="Tipo Vía:" value="" onChange={() => {}}
                        options={vias.map((v) => ({ value: v.id_tipo, label: v.nombre }))}
                      />
                    </div>
                    <div className="md:col-span-8">
                      <InputField label="Descripción Vía:" value="" onChange={() => {}} />
                    </div>
                  </div>
                </div>
              )}

              {/* Datos Domicilio grid */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="grid grid-cols-5 gap-2">
                  <InputField label="Mz:" value={form.manzana} onChange={(v) => setField("manzana", v)} maxLength={12} />
                  <InputField label="Lote:" value={form.lote} onChange={(v) => setField("lote", v)} maxLength={12} />
                  <InputField label="Sub Lote:" value={form.sub_lote} onChange={(v) => setField("sub_lote", v)} maxLength={12} />
                  <InputField label="Número:" value={form.numero} onChange={(v) => setField("numero", v)} maxLength={12} />
                  <InputField label="Dpto:" value={form.departam} onChange={(v) => setField("departam", v)} maxLength={12} />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  <InputField label="Letra 1:" value={form.letra1} onChange={(v) => setField("letra1", v)} maxLength={10} />
                  <InputField label="Num 2:" value={form.numero2} onChange={(v) => setField("numero2", v)} maxLength={10} />
                  <InputField label="Letra 2:" value={form.letra2} onChange={(v) => setField("letra2", v)} maxLength={10} />
                  <InputField label="Piso:" value={form.piso} onChange={(v) => setField("piso", v)} maxLength={10} />
                </div>

                <div className="grid grid-cols-12 gap-2 items-end mt-3">
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

                <div className="grid grid-cols-12 gap-2 items-end mt-3">
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

                <div className="grid grid-cols-12 gap-2 items-end mt-3">
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

                <div className="grid grid-cols-12 gap-2 items-end mt-3">
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

                <div className="mt-3">
                  <InputField label="Referencia:" value={form.referencia} onChange={(v) => setField("referencia", v)} />
                </div>
              </div>
            </div>
          </fieldset>

          {saveError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 animate-fade-in">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-[11px] font-medium text-red-600">{saveError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button type="button" onClick={onClose}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded border border-sat-cyan bg-sat-cyan hover:bg-cyan-600 px-4 py-2 text-[11px] font-bold text-white transition focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Guardar
          </button>
        </div>
      </div>

      <ViasSearchModal
        isOpen={isViasModalOpen}
        onClose={() => setIsViasModalOpen(false)}
        onSelect={(selected) => {
          setForm((prev) => ({
            ...prev,
            id_zona: selected.codzona,
            id_urba: selected.codurba,
            id_via: selected.codigo,
          }));
          setZonaNombre(selected.nomzona);
          setUrbaNombre(selected.nomurba);
          setViaNombre(selected.nomvia);
        }}
      />
    </div>
  );
}
