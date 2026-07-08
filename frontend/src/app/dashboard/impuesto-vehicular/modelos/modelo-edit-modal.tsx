"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Save, AlertCircle,
} from "lucide-react";
import {
  fetchModeloDetailAction,
  fetchMarcasAction,
  fetchCategoriasAction,
  saveModeloAction,
} from "@/actions/impuesto-vehicular/modelos";

// ── Types ────────────────────────────────────────────────

interface CatalogoOption { id: string; nombre: string }

interface ModeloDetalle {
  id: string; codmodelo: string; nombre: string;
  id_marca: string; marca: string;
  id_categoria: string; categoria: string;
  estado: string;
}

interface FormData {
  id: string;
  nombre: string;
  id_categoria: string;
  id_marca: string;
  estado: string;   // "0" | "1"
}

interface FormErrors {
  nombre?: string;
  id_categoria?: string;
  id_marca?: string;
}

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  modeloId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Default form ─────────────────────────────────────────

const EMPTY_FORM: FormData = {
  id: "", nombre: "", id_categoria: "", id_marca: "", estado: "1",
};

// ── Validation ───────────────────────────────────────────

const REQUIRED_FIELDS: (keyof FormErrors)[] = ["nombre", "id_categoria", "id_marca"];

const FIELD_LABELS: Record<keyof FormErrors, string> = {
  nombre: "Modelo",
  id_categoria: "Categoría",
  id_marca: "Marca",
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

export default function ModeloEditModal({ isOpen, modeloId, onClose, onSaved }: Props) {
  const isEditing = !!modeloId;
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [marcas, setMarcas] = useState<CatalogoOption[]>([]);
  const [categorias, setCategorias] = useState<CatalogoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load catalogs once on mount ──

  useEffect(() => {
    const loadCatalogs = async () => {
      const [marcasRes, categoriasRes] = await Promise.all([
        fetchMarcasAction(),
        fetchCategoriasAction(),
      ]);
      if (marcasRes.success) setMarcas(marcasRes.data);
      if (categoriasRes.success) setCategorias(categoriasRes.data);
    };
    loadCatalogs();
  }, []);

  // ── Load modelo detail when editing ──

  const loadModeloDetail = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    setErrors({});
    try {
      const res = await fetchModeloDetailAction(id);
      if (res.success) {
        const d = res.data;
        setForm({
          id: d.id ?? id,
          nombre: d.nombre ?? "",
          id_categoria: d.id_categoria ?? "",
          id_marca: d.id_marca ?? "",
          estado: d.estado === "ACTIVO" ? "1" : "0",
        });
      } else {
        setFetchError(res.error);
      }
    } catch {
      setFetchError("Error al cargar datos del modelo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
      setFetchError(null);
      setSaveError(null);
      if (modeloId) loadModeloDetail(modeloId);
    }
  }, [isOpen, modeloId, loadModeloDetail]);

  // ── Field change handler ──

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      const payload: {
        id?: string;
        nombre: string;
        id_categoria: string;
        id_marca: string;
        estado: string;
      } = {
        nombre: form.nombre,
        id_categoria: form.id_categoria,
        id_marca: form.id_marca,
        estado: form.estado,
      };
      if (isEditing) payload.id = form.id;

      const res = await saveModeloAction(payload);
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

  // ── Keyboard ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  // ── Render ──

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isEditing ? "Editar Modelo" : "Nuevo Modelo"}
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
                Cargando datos del modelo...
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
                onClick={() => modeloId && loadModeloDetail(modeloId)}
                className="mt-3 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Form */}
          {!loading && !fetchError && (
            <div className="space-y-3">

              {/* Código (read-only when editing) */}
              {isEditing && (
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                    Código
                  </label>
                  <input
                    type="text"
                    value={form.id}
                    readOnly
                    className="w-full rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] text-slate-500 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Nombre */}
              <div>
                <label htmlFor="edit-nombre" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Modelo <span className="text-red-400">*</span>
                </label>
                <input
                  id="edit-nombre" type="text" maxLength={100}
                  value={form.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
                    errors.nombre
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                  }`}
                  placeholder="Nombre del modelo"
                />
                {errors.nombre && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.nombre}</p>
                )}
              </div>

              {/* Marca */}
              <div>
                <label htmlFor="edit-marca" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Marca <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-marca"
                  value={form.id_marca}
                  onChange={(e) => handleChange("id_marca", e.target.value)}
                  className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
                    errors.id_marca
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                  }`}
                >
                  <option value="">Seleccionar</option>
                  {marcas.map((m, i) => (
                    <option key={m.id || `marca-${i}`} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                {errors.id_marca && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.id_marca}</p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label htmlFor="edit-categoria" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Categoría <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-categoria"
                  value={form.id_categoria}
                  onChange={(e) => handleChange("id_categoria", e.target.value)}
                  className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
                    errors.id_categoria
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
                  }`}
                >
                  <option value="">Seleccionar</option>
                  {categorias.map((c, i) => (
                    <option key={c.id || `categoria-${i}`} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {errors.id_categoria && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.id_categoria}</p>
                )}
              </div>

              {/* Estado */}
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                  Estado
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="radio" name="edit-estado" value="1"
                      checked={form.estado === "1"}
                      onChange={(e) => handleChange("estado", e.target.value)}
                      className="text-sat-cyan focus:ring-sat-cyan/30"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Activo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="radio" name="edit-estado" value="0"
                      checked={form.estado === "0"}
                      onChange={(e) => handleChange("estado", e.target.value)}
                      className="text-slate-400 focus:ring-slate-300"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Inactivo</span>
                  </label>
                </div>
              </div>

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
  );
}
