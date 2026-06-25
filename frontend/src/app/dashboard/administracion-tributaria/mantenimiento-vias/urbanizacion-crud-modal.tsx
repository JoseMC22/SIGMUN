"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { X, Loader2, Save, Settings } from "lucide-react";
import {
  getTiposUrbanizacionAction,
  createUrbanizacionAction,
  getUrbanizacionAction,
  updateUrbanizacionAction,
  type TipoUrbanizacionOption,
} from "@/actions/mantenimiento-vias";
import { getStoredUser, getPcName, fetchPcName, setPcName } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────

export type ModalMode = "create" | "edit";

interface UrbanizacionFormData {
  id_urba: string;
  tipourb: string;
  nombre: string;
  nestado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  idUrba?: string; // solo en edit mode
  onSaved: () => void; // callback para refrescar la tabla
}

const emptyForm: UrbanizacionFormData = {
  id_urba: "",
  tipourb: "",
  nombre: "",
  nestado: "1",
  operador: "",
  estacion: "",
  fech_ing: "",
};

// ─── Component ─────────────────────────────────────────────

export default function UrbanizacionCrudModal({ isOpen, onClose, mode, idUrba, onSaved }: Props) {
  const [form, setForm] = useState<UrbanizacionFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoUrbOptions, setTipoUrbOptions] = useState<TipoUrbanizacionOption[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [originalForm, setOriginalForm] = useState<UrbanizacionFormData | null>(null);

  const isEdit = mode === "edit";

  // ── Load combos on open ──
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setCombosLoading(true);

    getTiposUrbanizacionAction().then((res) => {
      if (cancelled) return;
      if (res.success) setTipoUrbOptions(res.data);
      setCombosLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen]);

  // ── Fetch PC name from backend on open ──
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchPcName().then((pcName) => {
      if (cancelled) return;
      setForm((prev) => ({
        ...prev,
        estacion: isEdit ? prev.estacion : pcName,
      }));
    });
    return () => { cancelled = true; };
  }, [isOpen, isEdit]);

  // ── Load data for edit ──
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && idUrba) {
      setLoading(true);
      setError(null);
      getUrbanizacionAction(idUrba).then((res) => {
        if (res.success) {
          const loadedForm = {
            id_urba: String(res.data.id_urba ?? ""),
            tipourb: String(res.data.tipourb ?? ""),
            nombre: String(res.data.nombre ?? ""),
            nestado: String(res.data.nestado ?? "1"),
            operador: String(res.data.operador ?? ""),
            estacion: String(res.data.estacion ?? ""),
            fech_ing: String(res.data.fech_ing ?? ""),
          };
          setForm(loadedForm);
          setOriginalForm(loadedForm);
        } else {
          setError(res.error);
        }
        setLoading(false);
      });
    } else {
      // Create mode — reset form with PC name and logged-in user
      setForm({
        ...emptyForm,
        estacion: getPcName(),
        operador: getStoredUser()?.username || "",
      });
      setError(null);
    }
  }, [isOpen, isEdit, idUrba]);

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // ── Field change ──
  const handleChange = (field: keyof UrbanizacionFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Check if form has changes ──
  const hasChanges = (): boolean => {
    if (!originalForm) return true;
    return (
      form.id_urba !== originalForm.id_urba ||
      form.tipourb !== originalForm.tipourb ||
      form.nombre !== originalForm.nombre ||
      form.nestado !== originalForm.nestado
    );
  };

  // ── Submit ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // In edit mode, check for changes first
    if (isEdit && !hasChanges()) {
      setError("No se detectaron cambios. Modifique algún dato antes de actualizar.");
      return;
    }

    // Confirmation dialog
    const confirmed = confirm(
      isEdit
        ? "¿Está seguro de actualizar esta urbanización?"
        : "¿Está seguro de registrar esta urbanización?",
    );
    if (!confirmed) return;

    setSaving(true);

    try {
      // Normalizar campos antes de enviar
      const nombreNormalized = form.nombre.toUpperCase();

      if (isEdit && idUrba) {
        // Fetch fresh PC name from backend at update time
        const pcName = await fetchPcName();
        const res = await updateUrbanizacionAction(idUrba, {
          tipourb: form.tipourb,
          nombre: nombreNormalized,
          nestado: form.nestado,
          operador: getStoredUser()?.username || '',
          estacion: pcName || getPcName(),
        });
        if (!res.success) {
          setError(res.error);
          setSaving(false);
          return;
        }
      } else {
        const res = await createUrbanizacionAction({
          id_urba: form.id_urba,
          tipourb: form.tipourb,
          nombre: nombreNormalized,
          nestado: form.nestado,
          operador: form.operador,
          estacion: form.estacion,
        });
        if (!res.success) {
          setError(res.error);
          setSaving(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // ── Mostrar fecha tal cual viene de la BD ──
  function formatDateTime(raw: string | null | undefined): string {
    if (!raw || raw === 'null' || raw === 'undefined') return 'Sin datos';
    return raw;
  }

  if (!isOpen) return null;

  // ── Input helpers ──

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  const labelClass =
    "block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
        data-testid="urbanizacion-crud-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isEdit ? "Editar Urbanización" : "Nueva Urbanización"}
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
        <div className="overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-sm text-slate-500">Cargando...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              {/* ── Grid fields ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>ID Urbanización</label>
                  <input
                    type="text"
                    placeholder={isEdit ? "ID" : "Auto-generado por SP"}
                    maxLength={4}
                    value={form.id_urba}
                    onChange={(e) => handleChange("id_urba", e.target.value.toUpperCase())}
                    className={inputClass}
                    required={isEdit}
                    disabled={isEdit}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tipo Urb.</label>
                  <select
                    value={form.tipourb}
                    onChange={(e) => handleChange("tipourb", e.target.value)}
                    className={inputClass}
                    required
                    disabled={combosLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {tipoUrbOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {/* <div>
                  <label className={labelClass}>Nomb. Abreviado</label>
                  <input
                    type="text"
                    placeholder="Nombre abreviado"
                    maxLength={30}
                    value={form.nombabr}
                    onChange={(e) => handleChange("nombabr", e.target.value.toUpperCase())}
                    className={inputClass}
                    required
                  />
                </div> */}
              </div>

              <div>
                <label className={labelClass}>Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Nombre completo de la urbanización"
                  maxLength={200}
                  value={form.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value.toUpperCase())}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={form.nestado}
                  onChange={(e) => handleChange("nestado", e.target.value)}
                  className={inputClass}
                >
                  <option value="1">ACTIVO</option>
                  <option value="0">INACTIVO</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Operador</label>
                  <input
                    type="text"
                    value={form.operador}
                    disabled
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Estación</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={form.estacion}
                      disabled
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = getPcName();
                        const name = prompt("Nombre de la PC:", current);
                        if (name && name.trim()) {
                          setPcName(name.trim());
                          setForm((prev) => ({ ...prev, estacion: name.trim() }));
                        }
                      }}
                      className="shrink-0 rounded-md border border-slate-300 p-1.5 text-slate-400 transition hover:border-sat-cyan hover:text-sat-cyan"
                      title="Configurar nombre de PC"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Fecha Ingreso</label>
                  <input
                    type="text"
                    value={isEdit ? formatDateTime(form.fech_ing) : "Auto (SP)"}
                    disabled
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      {isEdit ? "Actualizar" : "Registrar"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
