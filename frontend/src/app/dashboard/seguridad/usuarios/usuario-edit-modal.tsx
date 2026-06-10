"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Save, AlertCircle, KeyRound, Eye, EyeOff,
} from "lucide-react";
import {
  fetchUsuarioDetailAction,
  fetchTiposDocumentoAction,
  fetchCajerosAction,
  fetchAreasAction,
  fetchPerfilesAction,
  updateUsuarioAction,
  cambiarClaveAction,
} from "@/actions/usuarios";

// ── Types ────────────────────────────────────────────────

interface AreaOption { area: string; nombre: string }
interface PerfilOption { id_perfil: string; nombre: string }
interface TipoDocumentoOption { codigo: string; nombre: string; maxLength: number }
interface CajeroOption { codigo: string; nombre: string }

interface UsuarioDetalle {
  id_usuario: string; nombres: string; apellidos: string;
  area: string; vlogin: string; id_perfil: string;
  id_doc: string; num_doc: string; cargo: string;
  cajero: string | null; nestado: string;
}

interface FormData {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  area: string;
  id_doc: string;
  num_doc: string;
  vlogin: string;
  cargo: string;
  cajero_flag: string;  // "1" or "0"
  caja: string;
  id_perfil: string;
  nestado: string;      // "0" | "1"
}

interface FormErrors {
  nombres?: string;
  apellidos?: string;
  area?: string;
  id_doc?: string;
  num_doc?: string;
  vlogin?: string;
  id_perfil?: string;
}

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Default form ─────────────────────────────────────────

const EMPTY_FORM: FormData = {
  id_usuario: "", nombres: "", apellidos: "", area: "",
  id_doc: "", num_doc: "", vlogin: "", cargo: "",
  cajero_flag: "0", caja: "", id_perfil: "", nestado: "1",
};

// ── Validation ───────────────────────────────────────────

const REQUIRED_FIELDS: (keyof FormErrors)[] = [
  "nombres", "apellidos", "area", "id_doc", "num_doc", "vlogin", "id_perfil",
];

const FIELD_LABELS: Record<keyof FormErrors, string> = {
  nombres: "Nombres",
  apellidos: "Apellidos",
  area: "Área",
  id_doc: "Tipo Documento",
  num_doc: "N° Documento",
  vlogin: "Usuario",
  id_perfil: "Perfil",
};

function validateForm(form: FormData): FormErrors {
  const errors: FormErrors = {};
  for (const field of REQUIRED_FIELDS) {
    if (!form[field as keyof FormData]?.trim()) {
      (errors as any)[field] = `${FIELD_LABELS[field]} es requerido`;
    }
  }
  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ── Component ────────────────────────────────────────────

export default function UsuarioEditModal({ isOpen, userId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilOption[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOption[]>([]);
  const [cajeros, setCajeros] = useState<CajeroOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Password sub-modal state ──
  const [showPassModal, setShowPassModal] = useState(false);
  const [passForm, setPassForm] = useState({ password: "", confir: "" });
  const [passErrors, setPassErrors] = useState<{ password?: string; confir?: string }>({});
  const [savingPass, setSavingPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfir, setShowConfir] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  // ── Load catalogs once ──

  useEffect(() => {
    const loadCatalogs = async () => {
      const [areasRes, perfilesRes, tiposRes, cajerosRes] = await Promise.all([
        fetchAreasAction(), fetchPerfilesAction(),
        fetchTiposDocumentoAction(), fetchCajerosAction(),
      ]);
      if (areasRes.success) setAreas(areasRes.data);
      if (perfilesRes.success) setPerfiles(perfilesRes.data);
      if (tiposRes.success) setTiposDocumento(tiposRes.data);
      if (cajerosRes.success) setCajeros(cajerosRes.data);
    };
    loadCatalogs();
  }, []);

  // ── Load user detail when modal opens ──

  const loadUserDetail = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    setErrors({});
    try {
      const res = await fetchUsuarioDetailAction(id);
      if (res.success) {
        const d = res.data;
        setForm({
          id_usuario: id,//userId ?? d.id_usuario ?? "",
          nombres: d.nombres ?? "",
          apellidos: d.apellidos ?? "",
          area: d.area ?? "",
          id_doc: (d.id_doc ?? "").split("/")[0] ?? "",
          num_doc: d.num_doc ?? "",
          vlogin: d.vlogin ?? "",
          cargo: d.cargo ?? "",
          cajero_flag: d.cajero && d.cajero !== "" ? "1" : "0",
          caja: d.cajero ?? "",
          id_perfil: d.id_perfil ?? "",
          nestado: d.nestado === "1" ? "1" : "0",
        });
      } else {
        setFetchError(res.error);
      }
    } catch {
      setFetchError("Error al cargar datos del usuario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      setForm(EMPTY_FORM);
      setErrors({});
      setFetchError(null);
      setSaveError(null);
      loadUserDetail(userId);
    }
  }, [isOpen, userId, loadUserDetail]);

  // ── Field change handler ──

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (field in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete (next as any)[field];
        return next;
      });
    }
  };

  // ── Save handler ──

  const handleSave = async () => {
    const v = validateForm(form);
    setErrors(v);
    if (hasErrors(v)) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateUsuarioAction({
        id_usuario: form.id_usuario,
        nombres: form.nombres,
        apellidos: form.apellidos,
        area: form.area,
        id_doc: form.id_doc,
        num_doc: form.num_doc,
        vlogin: form.vlogin,
        password: "",
        confir: "",
        cargo: form.cargo,
        cajero: form.cajero_flag,
        caja: form.caja,
        id_perfil: form.id_perfil,
        nestado: form.nestado,
      });
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setSaveError(res.error);
      }
    } catch {
      setSaveError("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  // ── Password sub-modal ──

  const openPassModal = () => {
    setPassForm({ password: "", confir: "" });
    setPassErrors({});
    setPassSuccess(null);
    setSavingPass(false);
    setShowPassModal(true);
  };

  const validatePassForm = () => {
    const e: { password?: string; confir?: string } = {};
    if (!passForm.password.trim()) e.password = "Debe ingresar la contraseña";
    if (!passForm.confir.trim()) e.confir = "Debe confirmar la contraseña";
    if (passForm.password && passForm.confir && passForm.password !== passForm.confir) {
      e.confir = "Las contraseñas no coinciden";
    }
    setPassErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSavePass = async () => {
    if (!validatePassForm()) return;
    if (!userId) return;

    setSavingPass(true);
    setPassSuccess(null);
    try {
      const res = await cambiarClaveAction({
        id_usuario: userId,
        password: passForm.password,
        confir: passForm.confir,
      });
      if (res.success) {
        setPassSuccess("Contraseña actualizada correctamente");
        setTimeout(() => setShowPassModal(false), 1200);
      } else {
        setPassErrors({ password: res.error, confir: res.error });
      }
    } catch {
      setPassErrors({ password: "Error al guardar la contraseña" });
    } finally {
      setSavingPass(false);
    }
  };

  // ── Keyboard ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !showPassModal) onClose();
  };

  if (!isOpen) return null;

  const docMatch = tiposDocumento.find((t) => t.codigo === form.id_doc);
  const docMaxLength = docMatch?.maxLength || 20;

  // ── Render ──

  return (
    <>
      {/* ────────── MAIN MODAL ────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="relative w-full max-w-xl max-h-[70vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
          {/* ── Header ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-sat-cyan rounded-full" />
              <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
                Editar Usuario
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
          <div className="p-3 space-y-3">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin text-sat-cyan" />
                  Cargando datos del usuario...
                </div>
              </div>
            )}

            {/* Fetch error */}
            {!loading && fetchError && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-3 rounded-full bg-red-100 p-3">
                  <AlertCircle size={20} className="text-red-400" />
                </div>
                <p className="text-sm font-medium text-red-600">{fetchError}</p>
                <button
                  type="button"
                  onClick={() => userId && loadUserDetail(userId)}
                  className="mt-3 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Form */}
            {!loading && !fetchError && (
              <div className="space-y-3">
                {/* ── Fieldset: Datos Trabajador ── */}
                <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                  <legend className="ml-3 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Datos Trabajador
                  </legend>
                    <div className="p-2.5 space-y-2">
                    {/* Código */}
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Código
                      </label>
                      <input
                        type="text"
                        value={form.id_usuario}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* Nombres + Apellidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="edit-nombres" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                          Nombres <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="edit-nombres" type="text" maxLength={100}
                          value={form.nombres}
                          onChange={(e) => handleChange("nombres", e.target.value)}
                          className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
                            errors.nombres
                              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                              : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                          }`}
                        />
                        {errors.nombres && (
                          <p className="mt-0.5 text-[9px] text-red-500">{errors.nombres}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="edit-apellidos" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                          Apellidos <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="edit-apellidos" type="text" maxLength={50}
                          value={form.apellidos}
                          onChange={(e) => handleChange("apellidos", e.target.value)}
                          className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
                            errors.apellidos
                              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                              : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                          }`}
                        />
                        {errors.apellidos && (
                          <p className="mt-0.5 text-[9px] text-red-500">{errors.apellidos}</p>
                        )}
                      </div>
                    </div>

                    {/* Área */}
                    <div>
                      <label htmlFor="edit-area" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Área <span className="text-red-400">*</span>
                      </label>
                      <select
                        id="edit-area"
                        value={form.area}
                        onChange={(e) => handleChange("area", e.target.value)}
                        className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
                          errors.area
                            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                            : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                        }`}
                      >
                        <option value="">Seleccionar</option>
                        {areas.map((a) => (
                          <option key={a.area} value={a.area}>{a.nombre}</option>
                        ))}
                      </select>
                      {errors.area && (
                        <p className="mt-0.5 text-[9px] text-red-500">{errors.area}</p>
                      )}
                    </div>

                    {/* Tipo Doc + N° Doc */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="edit-id_doc" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                          Tipo Doc. <span className="text-red-400">*</span>
                        </label>
                        <select
                          id="edit-id_doc"
                          value={form.id_doc}
                          onChange={(e) => handleChange("id_doc", e.target.value)}
                          className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
                            errors.id_doc
                              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                              : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                          }`}
                        >
                          <option value="">Seleccionar</option>
                          {tiposDocumento.map((t) => (
                            <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                          ))}
                        </select>
                        {errors.id_doc && (
                          <p className="mt-0.5 text-[9px] text-red-500">{errors.id_doc}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="edit-num_doc" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                          N° Documento <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="edit-num_doc" type="text" maxLength={docMaxLength || 20}
                          value={form.num_doc}
                          onChange={(e) => handleChange("num_doc", e.target.value)}
                          className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
                            errors.num_doc
                              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                              : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                          }`}
                        />
                        {errors.num_doc && (
                          <p className="mt-0.5 text-[9px] text-red-500">{errors.num_doc}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* ── Fieldset: Datos Usuario ── */}
                <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40">
                  <legend className="ml-3 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Datos Usuario
                  </legend>
                    <div className="p-2.5 space-y-2">
                    {/* Usuario + Generar Clave */}
                    <div>
                      <label htmlFor="edit-vlogin" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Usuario <span className="text-red-400">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="edit-vlogin" type="text" maxLength={100}
                          value={form.vlogin}
                          onChange={(e) => handleChange("vlogin", e.target.value)}
                          className={`flex-1 rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
                            errors.vlogin
                              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                              : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={openPassModal}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                          <KeyRound size={12} />
                          Generar Clave
                        </button>
                      </div>
                      {errors.vlogin && (
                        <p className="mt-0.5 text-[9px] text-red-500">{errors.vlogin}</p>
                      )}
                    </div>

                    {/* Perfil */}
                    <div>
                      <label htmlFor="edit-perfil" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Perfil <span className="text-red-400">*</span>
                      </label>
                      <select
                        id="edit-perfil"
                        value={form.id_perfil}
                        onChange={(e) => handleChange("id_perfil", e.target.value)}
                        className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
                          errors.id_perfil
                            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                            : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                        }`}
                      >
                        <option value="">Seleccionar</option>
                        {perfiles.map((p) => (
                          <option key={p.id_perfil} value={p.id_perfil}>{p.nombre}</option>
                        ))}
                      </select>
                      {errors.id_perfil && (
                        <p className="mt-0.5 text-[9px] text-red-500">{errors.id_perfil}</p>
                      )}
                    </div>

                    {/* Cargo */}
                    <div>
                      <label htmlFor="edit-cargo" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                        Cargo
                      </label>
                      <input
                        id="edit-cargo" type="text" maxLength={100}
                        value={form.cargo}
                        onChange={(e) => handleChange("cargo", e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                      />
                    </div>

                    {/* Cajero */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.cajero_flag === "1"}
                          onChange={(e) => handleChange("cajero_flag", e.target.checked ? "1" : "0")}
                          className="rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/30"
                        />
                        <span className="text-[11px] font-medium text-slate-700">Cajero</span>
                      </label>
                      {form.cajero_flag === "1" && (
                        <div>
                          <label htmlFor="edit-caja" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                            N° Caja
                          </label>
                          <select
                            id="edit-caja"
                            value={form.caja}
                            onChange={(e) => handleChange("caja", e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                          >
                            <option value="">Seleccionar</option>
                            {cajeros.map((c) => (
                              <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Estado */}
                    <div>
                      <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                        Estado usuario
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="radio" name="edit-estado" value="1"
                            checked={form.nestado === "1"}
                            onChange={(e) => handleChange("nestado", e.target.value)}
                            className="text-sat-cyan focus:ring-sat-cyan/30"
                          />
                          <span className="text-[11px] font-medium text-slate-700">Activado</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="radio" name="edit-estado" value="0"
                            checked={form.nestado === "0"}
                            onChange={(e) => handleChange("nestado", e.target.value)}
                            className="text-slate-400 focus:ring-slate-300"
                          />
                          <span className="text-[11px] font-medium text-slate-700">Desactivado</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Save error */}
                {saveError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-[11px] font-medium text-red-600">{saveError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {!loading && !fetchError && (
            <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-white px-4 py-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-200 px-3.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "Guardando..." : "Guardar Datos"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ────────── PASSWORD SUB-MODAL ────────── */}
      {showPassModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPassModal(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowPassModal(false); }}
          tabIndex={-1}
        >
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
                <h3 className="text-xs font-bold text-white font-outfit tracking-tight">
                  Generar Contraseña
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Success */}
              {passSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="text-[11px] font-medium text-emerald-700">{passSuccess}</span>
                </div>
              )}

              {/* Password */}
              <div>
                <label htmlFor="pass-nueva" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Nueva Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="pass-nueva"
                    type={showPass ? "text" : "password"}
                    maxLength={100}
                    value={passForm.password}
                    onChange={(e) => {
                      setPassForm((p) => ({ ...p, password: e.target.value }));
                      setPassErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className={`w-full rounded-md border bg-white px-2 py-1.5 pr-8 text-[11px] text-slate-700 transition focus:outline-none ${
                      passErrors.password
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {passErrors.password && (
                  <p className="mt-0.5 text-[9px] text-red-500">{passErrors.password}</p>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label htmlFor="pass-confir" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Confirmar Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="pass-confir"
                    type={showConfir ? "text" : "password"}
                    maxLength={100}
                    value={passForm.confir}
                    onChange={(e) => {
                      setPassForm((p) => ({ ...p, confir: e.target.value }));
                      setPassErrors((p) => ({ ...p, confir: undefined }));
                    }}
                    className={`w-full rounded-md border bg-white px-2 py-1.5 pr-8 text-[11px] text-slate-700 transition focus:outline-none ${
                      passErrors.confir
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfir(!showConfir)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfir ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {passErrors.confir && (
                  <p className="mt-0.5 text-[9px] text-red-500">{passErrors.confir}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-white px-4 py-2.5">
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="rounded-md border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Salir
              </button>
              <button
                type="button"
                onClick={handleSavePass}
                disabled={savingPass || !!passSuccess}
                className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-3 py-1 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingPass ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                {savingPass ? "Guardando..." : "Grabar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
