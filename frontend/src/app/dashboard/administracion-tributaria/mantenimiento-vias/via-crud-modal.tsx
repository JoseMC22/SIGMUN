"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { X, Loader2, Save, Settings } from "lucide-react";
import { getViaAction, createViaAction, updateViaAction, getTiposViaAction, getUrbanizacionesAction, getZonasAction, type TipoViaOption, type UrbanizacionOption, type ZonaOption } from "@/actions/administracion-tributaria/mantenimiento-vias";
import { getStoredUser, getPcName, fetchPcName, setPcName } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────

export type ModalMode = "create" | "edit";

interface ViaFormData {
  id_urba: string;
  tipovia: string;
  vcuadra: string;
  id_zona: string;
  nombre_via: string;
  id_tipozona: string;
  nestado: string;
  vlado: string;
  operador: string;
  estacion: string;
  fech_ing: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  codVia?: string; // solo en edit mode
  onSaved: () => void; // callback para refrescar la tabla
}

const emptyForm: ViaFormData = {
  id_urba: "",
  tipovia: "",
  vcuadra: "",
  id_zona: "",
  nombre_via: "",
  id_tipozona: "",
  nestado: "1",
  vlado: "",
  operador: "",
  estacion: "",
  fech_ing: "",
};

// ─── Helpers ───────────────────────────────────────────────

function padCuadra(val: string): string {
  const num = parseInt(val, 10);
  if (isNaN(num)) return val;
  return String(num).padStart(2, "0");
}

function formatFecha(fecha: string): string {
  if (!fecha) return "";
  // Si es ISO UTC (termina en Z o tiene +00:00), parseamos manual
  // para evitar que Date aplique timezone shift
  const isoMatch = fecha.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd, hh, min, ss] = isoMatch;
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  }
  // Fallback para otros formatos
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mm}:${ss}`;
}

// ─── Component ─────────────────────────────────────────────

export default function ViaCrudModal({ isOpen, onClose, mode, codVia, onSaved }: Props) {
  const [form, setForm] = useState<ViaFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codViaDisplay, setCodViaDisplay] = useState("");
  const [tipoViaOptions, setTipoViaOptions] = useState<TipoViaOption[]>([]);
  const [urbanizacionOptions, setUrbanizacionOptions] = useState<UrbanizacionOption[]>([]);
  const [zonaOptions, setZonaOptions] = useState<ZonaOption[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [originalForm, setOriginalForm] = useState<ViaFormData | null>(null);

  const isEdit = mode === "edit";

  // ── Load combos on open ──
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setCombosLoading(true);

    Promise.all([getTiposViaAction(), getUrbanizacionesAction(), getZonasAction()]).then(
      ([tiposRes, urbRes, zonaRes]) => {
        if (cancelled) return;
        if (tiposRes.success) setTipoViaOptions(tiposRes.data);
        if (urbRes.success) setUrbanizacionOptions(urbRes.data);
        if (zonaRes.success) setZonaOptions(zonaRes.data);
        setCombosLoading(false);
      },
    );

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

    if (isEdit && codVia) {
      setLoading(true);
      setError(null);
      getViaAction(codVia).then((res) => {
        if (res.success) {
          const loadedForm = {
            id_urba: String(res.data.id_urba ?? ""),
            tipovia: String(res.data.tipovia ?? ""),
            vcuadra: String(res.data.vcuadra ?? ""),
            id_zona: String(res.data.id_zona ?? ""),
            nombre_via: String(res.data.nombre_via ?? ""),
            id_tipozona: String(res.data.id_tipozona ?? ""),
            nestado: String(res.data.nestado ?? "1"),
            vlado: String(res.data.lado_via ?? ""),
            operador: getStoredUser()?.username || '',
            estacion: String(res.data.estacion ?? ""),
            fech_ing: String(res.data.fech_ing ?? ""),
          };
          setForm(loadedForm);
          setOriginalForm(loadedForm);
          setCodViaDisplay(res.data.cod_via ?? "");
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
        operador: getStoredUser()?.username || '',
      });
      setCodViaDisplay("");
      setError(null);
    }
  }, [isOpen, isEdit, codVia]);

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // ── Field change ──
  const handleChange = (field: keyof ViaFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Check if form has changes ──
  const hasChanges = (): boolean => {
    if (!originalForm) return true;
    return (
      form.id_urba !== originalForm.id_urba ||
      form.tipovia !== originalForm.tipovia ||
      form.vcuadra !== originalForm.vcuadra ||
      form.id_zona !== originalForm.id_zona ||
      form.nombre_via !== originalForm.nombre_via ||
      form.id_tipozona !== originalForm.id_tipozona ||
      form.nestado !== originalForm.nestado ||
      form.vlado !== originalForm.vlado
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
        ? "¿Está seguro de actualizar esta vía?"
        : "¿Está seguro de registrar esta vía?"
    );
    if (!confirmed) return;

    setSaving(true);

    try {
      // Normalizar campos antes de enviar
      const vcuadraNormalized = padCuadra(form.vcuadra);
      const nombreViaNormalized = form.nombre_via.toUpperCase();

      if (isEdit && codVia) {
        // Fetch fresh PC name from backend at update time
        const pcName = await fetchPcName();
        const res = await updateViaAction(codVia, {
          id_urba: form.id_urba,
          tipovia: form.tipovia,
          vcuadra: vcuadraNormalized,
          id_zona: form.id_zona,
          nombre_via: nombreViaNormalized,
          id_tipozona: form.id_tipozona,
          nestado: form.nestado,
          vlado: form.vlado,
          estacion: pcName || getPcName(),
        });
        if (!res.success) {
          setError(res.error);
          setSaving(false);
          return;
        }
      } else {
        const res = await createViaAction({
          id_urba: form.id_urba,
          tipovia: form.tipovia,
          vcuadra: vcuadraNormalized,
          id_zona: form.id_zona,
          nombre_via: nombreViaNormalized,
          id_tipozona: form.id_tipozona,
          nestado: form.nestado,
          vlado: form.vlado,
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
        data-testid="via-crud-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isEdit ? "Editar Vía" : "Nueva Vía"}
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

              {/* ── Read-only info ── */}
              {isEdit && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3 mb-4">
                  <div>
                    <label htmlFor="via-codigo" className={labelClass}>Código de Vía</label>
                    <input
                      id="via-codigo"
                      type="text"
                      value={codViaDisplay}
                      disabled
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Nombre de Vía</label>
                <input
                  type="text"
                  placeholder="Nombre de la vía"
                  maxLength={200}
                  value={form.nombre_via}
                  onChange={(e) => handleChange("nombre_via", e.target.value.toUpperCase())}
                  className={inputClass}
                  required
                />
              </div>


              {/* ── Grid fields ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="via-tipovia" className={labelClass}>Tipo Vía</label>
                  <select
                    id="via-tipovia"
                    value={form.tipovia}
                    onChange={(e) => handleChange("tipovia", e.target.value)}
                    className={inputClass}
                    required
                    disabled={combosLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {tipoViaOptions.map((t) => (
                      <option key={t.id_tipo} value={t.id_tipo}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="via-cuadra" className={labelClass}>Cuadra</label>
                  <input
                    id="via-cuadra"
                    type="text"
                    inputMode="numeric"
                    value={form.vcuadra}
                    onChange={(e) => {
                      const soloNumeros = e.target.value.replace(/\D/g, "");
                      handleChange("vcuadra", soloNumeros);
                    }}
                    maxLength={2}
                    disabled={isEdit}
                    placeholder="N° de cuadra"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="via-lado" className={labelClass}>Lado</label>
                  <select
                    id="via-lado"
                    value={form.vlado}
                    onChange={(e) => handleChange("vlado", e.target.value)}
                    disabled={isEdit}
                    className={inputClass}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="1">1 — Derecha</option>
                    <option value="2">2 — Izquierda</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="via-urba" className={labelClass}>Urbanización</label>
                  <select
                    id="via-urba"
                    value={form.id_urba}
                    onChange={(e) => handleChange("id_urba", e.target.value)}
                    className={inputClass}
                    required
                    disabled={combosLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {urbanizacionOptions.map((u) => (
                      <option key={u.id_urba} value={u.id_urba}>
                        {u.nombres}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="via-zona" className={labelClass}>Zona</label>
                  <select
                    id="via-zona"
                    value={form.id_zona}
                    onChange={(e) => handleChange("id_zona", e.target.value)}
                    className={inputClass}
                    required
                    disabled={combosLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {zonaOptions.map((z) => (
                      <option key={z.id_zona} value={z.id_zona}>
                        {z.nombres}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="via-tipozona" className={labelClass}>Tipo Zona</label>
                  <select
                    id="via-tipozona"
                    value={form.id_tipozona}
                    onChange={(e) => handleChange("id_tipozona", e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="1">Alta</option>
                    <option value="2">Bajo</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="via-estado" className={labelClass}>Estado</label>
                <select
                  id="via-estado"
                  value={form.nestado}
                  onChange={(e) => handleChange("nestado", e.target.value)}
                  className={inputClass}
                >
                  <option value="1">ACTIVADO</option>
                  <option value="0">INACTIVO</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="via-operador" className={labelClass}>Operador</label>
                  <input
                    id="via-operador"
                    type="text"
                    value={form.operador}
                    disabled
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="via-estacion" className={labelClass}>Estación</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="via-estacion"
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
                  <label htmlFor="via-fecha" className={labelClass}>Fecha Ingreso</label>
                  <input
                    id="via-fecha"
                    type="text"
                    value={isEdit ? formatFecha(form.fech_ing) : "Auto (SP)"}
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
