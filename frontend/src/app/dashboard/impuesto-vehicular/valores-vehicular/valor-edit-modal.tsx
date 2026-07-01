"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Save, AlertCircle,
} from "lucide-react";
import {
  fetchValorDetailAction,
  fetchCategoriasAction,
  fetchMarcasAction,
  fetchModelosFiltradosAction,
  fetchAniosEjercicioAction,
  fetchAniosAction,
  saveValorAction,
} from "@/actions/valores";

// ── Types ────────────────────────────────────────────────

interface CatalogoOption { id: string; nombre: string }

interface ModeloOption extends CatalogoOption {
  codmodelo?: string;
}

interface ValorDetalle {
  id: string;
  id_anio: string;
  id_categoria: string;
  id_marca: string;
  id_modelo: string;
  xidmod?: string;
  anio: string;
  monto: number;
  estado: string;
  [key: string]: unknown;
}

interface FormData {
  id: string;
  id_anio: string;
  id_categoria: string;
  id_marca: string;
  id_modelo: string;    // internal model code (from txtIdModelo in PHP)
  modelo_display: string; // xidmod (from cbModelo combo — the combobox value)
  anio: string;
  monto: string;          // numeric input as string
  estado: string;         // "0" | "1"
}

interface FormErrors {
  id_anio?: string;
  id_categoria?: string;
  id_marca?: string;
  modelo_display?: string;
  anio?: string;
  monto?: string;
}

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  valorId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Default form ─────────────────────────────────────────

const EMPTY_FORM: FormData = {
  id: "", id_anio: "", id_categoria: "", id_marca: "",
  id_modelo: "", modelo_display: "", anio: "", monto: "", estado: "1",
};

// ── Validation ───────────────────────────────────────────

const REQUIRED_FIELDS: (keyof FormErrors)[] = [
  "id_anio", "id_categoria", "id_marca", "modelo_display", "anio", "monto",
];

const FIELD_LABELS: Record<keyof FormErrors, string> = {
  id_anio: "Año Ejercicio",
  id_categoria: "Categoría",
  id_marca: "Marca",
  modelo_display: "Modelo",
  anio: "Año",
  monto: "Monto",
};

function validateForm(form: FormData): FormErrors {
  const errors: FormErrors = {};
  for (const field of REQUIRED_FIELDS) {
    if (!form[field as keyof FormData]?.toString().trim()) {
      (errors as Record<string, string>)[field] = `${FIELD_LABELS[field]} es requerido`;
    }
  }
  if (form.monto && (isNaN(Number(form.monto)) || Number(form.monto) <= 0)) {
    errors.monto = "Monto debe ser un número positivo";
  }
  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ── Component ────────────────────────────────────────────

export default function ValorEditModal({ isOpen, valorId, onClose, onSaved }: Props) {
  const isEditing = !!valorId;
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [categorias, setCategorias] = useState<CatalogoOption[]>([]);
  const [marcas, setMarcas] = useState<CatalogoOption[]>([]);
  const [modelos, setModelos] = useState<ModeloOption[]>([]);
  const [aniosEjercicio, setAniosEjercicio] = useState<CatalogoOption[]>([]);
  const [anios, setAnios] = useState<CatalogoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelosLoading, setModelosLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load catalogs once on mount ──

  useEffect(() => {
    const loadCatalogs = async () => {
      const [categoriasRes, marcasRes, aniosRes, aniosEjercicioRes] = await Promise.all([
        fetchCategoriasAction(),
        fetchMarcasAction(),
        fetchAniosAction(),
        fetchAniosEjercicioAction(),
      ]);
      if (categoriasRes.success) setCategorias(categoriasRes.data);
      if (marcasRes.success) setMarcas(marcasRes.data);
      if (aniosRes.success) setAnios(aniosRes.data);
      if (aniosEjercicioRes.success) setAniosEjercicio(aniosEjercicioRes.data);
    };
    loadCatalogs();
  }, []);

  // ── Load valor detail when editing ──

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    setErrors({});
    try {
      const res = await fetchValorDetailAction(id);
      if (res.success) {
        const d = res.data as ValorDetalle;
        setForm({
          id: d.id ?? id,
          id_anio: d.id_anio ?? "",
          id_categoria: d.id_categoria ?? "",
          id_marca: d.id_marca ?? "",
          id_modelo: d.id_modelo ?? "",
          modelo_display: d.xidmod ?? "",
          anio: d.anio ?? "",
          monto: d.monto != null ? String(d.monto) : "",
          estado: d.estado === "ACTIVO" ? "1" : "0",
        });
      } else {
        setFetchError(res.error);
      }
    } catch {
      setFetchError("Error al cargar datos del valor");
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
      setModelos([]);
      if (valorId) loadDetail(valorId);
    }
  }, [isOpen, valorId, loadDetail]);

  // ── Cascading modelos: fetch when BOTH categoria and marca are selected ──

  useEffect(() => {
    if (form.id_categoria && form.id_marca) {
      setModelosLoading(true);
      const fetchModelos = async () => {
        try {
          const res = await fetchModelosFiltradosAction(form.id_categoria, form.id_marca);
          if (res.success) {
            setModelos(res.data);
          }
        } finally {
          setModelosLoading(false);
        }
      };
      fetchModelos();
    } else {
      setModelos([]);
    }
  }, [form.id_categoria, form.id_marca]);

  // ── Field change handler ──

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear modelo selection when cascading parent changes
      if (field === "id_categoria" || field === "id_marca") {
        next.id_modelo = "";
        next.modelo_display = "";
      }
      return next;
    });
    if (field in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete (next as Record<string, string>)[field as string];
        return next;
      });
    }
  };

  // ── Modelo selection handler (sets both modelo_display and id_modelo) ──

  const handleModeloChange = (value: string) => {
    const selected = modelos.find((m) => m.id === value);
    setForm((prev) => ({
      ...prev,
      modelo_display: value,
      id_modelo: selected?.codmodelo ?? value,
    }));
    if ("modelo_display" in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.modelo_display;
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
      const payload: Record<string, string | number | undefined> = {
        id_anio: form.id_anio,
        id_categoria: form.id_categoria,
        id_marca: form.id_marca,
        id_modelo: form.id_modelo,
        anio: form.anio,
        monto: Number(form.monto),
        estado: form.estado,
        xidmod: form.modelo_display,
      };
      if (isEditing) payload.id = form.id;

      const res = await saveValorAction(
        payload as {
          id?: string;
          id_anio: string;
          id_categoria: string;
          id_marca: string;
          id_modelo?: string;
          anio: string;
          monto: number;
          estado: string;
          xidmod: string;
        },
      );
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

  // ── Shared input class helper ──

  const inputClass = (field: keyof FormErrors, extra?: string) =>
    `w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:outline-none ${
      errors[field]
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
        : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
    }${extra ? ` ${extra}` : ""}`;

  // ── Render ──

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isEditing ? "Editar Valor" : "Nuevo Valor"}
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
                Cargando datos del valor...
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
                onClick={() => valorId && loadDetail(valorId)}
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

              {/* Año Ejercicio */}
              <div>
                <label htmlFor="edit-id_anio" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Año Ejercicio <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-id_anio"
                  value={form.id_anio}
                  onChange={(e) => handleChange("id_anio", e.target.value)}
                  className={inputClass("id_anio")}
                >
                  <option value="">Seleccionar</option>
                  {aniosEjercicio.map((item, i) => (
                    <option key={item.id || `ae-${i}`} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
                {errors.id_anio && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.id_anio}</p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label htmlFor="edit-id_categoria" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Categoría <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-id_categoria"
                  value={form.id_categoria}
                  onChange={(e) => handleChange("id_categoria", e.target.value)}
                  className={inputClass("id_categoria")}
                >
                  <option value="">Seleccionar</option>
                  {categorias.map((item, i) => (
                    <option key={item.id || `cat-${i}`} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
                {errors.id_categoria && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.id_categoria}</p>
                )}
              </div>

              {/* Marca */}
              <div>
                <label htmlFor="edit-id_marca" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Marca <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-id_marca"
                  value={form.id_marca}
                  onChange={(e) => handleChange("id_marca", e.target.value)}
                  className={inputClass("id_marca")}
                >
                  <option value="">Seleccionar</option>
                  {marcas.map((item, i) => (
                    <option key={item.id || `mar-${i}`} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
                {errors.id_marca && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.id_marca}</p>
                )}
              </div>

              {/* Modelo (cascading combo) */}
              <div>
                <label htmlFor="edit-modelo_display" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Modelo <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    id="edit-modelo_display"
                    value={form.modelo_display}
                    onChange={(e) => handleModeloChange(e.target.value)}
                    disabled={!form.id_categoria || !form.id_marca || modelosLoading}
                    className={inputClass("modelo_display", modelosLoading ? "opacity-60" : "")}
                  >
                    <option value="">
                      {modelosLoading
                        ? "Cargando modelos..."
                        : !form.id_categoria || !form.id_marca
                          ? "Seleccione categoría y marca primero"
                          : "Seleccionar"}
                    </option>
                    {modelos.map((item, i) => (
                      <option key={item.id || `mod-${i}`} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                  {modelosLoading && (
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <Loader2 size={12} className="animate-spin text-sat-cyan" />
                    </div>
                  )}
                </div>
                {errors.modelo_display && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.modelo_display}</p>
                )}
              </div>

              {/* Año */}
              <div>
                <label htmlFor="edit-anio" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Año <span className="text-red-400">*</span>
                </label>
                <select
                  id="edit-anio"
                  value={form.anio}
                  onChange={(e) => handleChange("anio", e.target.value)}
                  className={inputClass("anio")}
                >
                  <option value="">Seleccionar</option>
                  {anios.map((item, i) => (
                    <option key={item.id || `an-${i}`} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
                {errors.anio && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.anio}</p>
                )}
              </div>

              {/* Monto */}
              <div>
                <label htmlFor="edit-monto" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                  Monto <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">S/</span>
                  <input
                    id="edit-monto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.monto}
                    onChange={(e) => handleChange("monto", e.target.value)}
                    className={`${inputClass("monto")} pl-7`}
                    placeholder="0.00"
                  />
                </div>
                {errors.monto && (
                  <p className="mt-0.5 text-[9px] text-red-500">{errors.monto}</p>
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
