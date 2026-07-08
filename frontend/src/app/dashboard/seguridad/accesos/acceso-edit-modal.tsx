"use client";

import { useState, useEffect, useRef } from "react";
import { X, Key, Loader2, Save } from "lucide-react";
import {
  fetchAccesoAction,
  saveAccesoAction,
  fetchMenusAction,
  fetchModulosAction,
} from "@/actions/seguridad/accesos";
import type { MenuOption, ModuloOption } from "@/actions/seguridad/accesos";

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  accesoId?: string | null;
}

// ── Form state ────────────────────────────────────────────

interface FormState {
  id_acceso: string;
  id_acceso_old: string;
  orden: string;
  menu: string;
  pantalla: string;
  nombre: string;
  icono: string;
  doform: string;
  id_objeto: string;
  nestado: boolean;
}

const EMPTY_FORM: FormState = {
  id_acceso: "",
  id_acceso_old: "",
  orden: "",
  menu: "",
  pantalla: "",
  nombre: "",
  icono: "",
  doform: "",
  id_objeto: "",
  nestado: true,
};

// ── Modal ─────────────────────────────────────────────────

export default function AccesoEditModal({
  isOpen,
  onClose,
  onSaved,
  accesoId,
}: Props) {
  const isEdit = !!accesoId;

  // ── State ──────────────────────────────────────────────

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [modulos, setModulos] = useState<ModuloOption[]>([]);
  const [modulosLoading, setModulosLoading] = useState(false);

  const menuAbortRef = useRef<AbortController | null>(null);

  // ── Helpers ─────────────────────────────────────────────

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Load catálogos ──────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    fetchMenusAction().then((res) => {
      if (res.success) setMenus(res.data);
    });
    setModulos([]);
  }, [isOpen]);

  // ── Load data on edit ───────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    if (!accesoId) {
      setForm(EMPTY_FORM);
      setError(null);
      setModulos([]);
      return;
    }

    setLoading(true);
    setError(null);
    fetchAccesoAction(accesoId).then((res) => {
      if (res.success) {
        setForm({
          id_acceso: res.data.id_acceso,
          id_acceso_old: res.data.id_acceso,
          orden: res.data.orden,
          menu: "",
          pantalla: "",
          nombre: res.data.nombre,
          icono: res.data.icono,
          doform: res.data.doform,
          id_objeto: res.data.id_objeto,
          nestado: res.data.nestado === "1",
        });
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accesoId]);

  // ── Cascada Menú → Módulo ──────────────────────────────

  const handleMenuChange = (menuId: string) => {
    updateField("menu", menuId);
    updateField("pantalla", "");
    setModulos([]);

    if (!menuId) return;

    if (menuAbortRef.current) {
      menuAbortRef.current.abort();
    }
    const controller = new AbortController();
    menuAbortRef.current = controller;

    setModulosLoading(true);
    fetchModulosAction(menuId).then((res) => {
      if (controller.signal.aborted) return;
      if (res.success) setModulos(res.data);
      setModulosLoading(false);
    });
  };

  // ── Save ────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.id_acceso.trim()) {
      setError("El código de acceso es requerido");
      return;
    }
    if (!form.orden) {
      setError("Seleccione un tipo");
      return;
    }
    if (!form.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await saveAccesoAction({
      id_acceso: form.id_acceso,
      id_acceso_old: isEdit ? form.id_acceso_old : "",
      orden: form.orden,
      menu: form.menu,
      pantalla: form.pantalla,
      nombre: form.nombre,
      icono: form.icono,
      doform: form.doform,
      id_objeto: form.id_objeto,
      nestado: form.nestado,
    });

    setSaving(false);

    if (result.success) {
      onSaved();
      onClose();
    } else {
      setError(result.error);
    }
  };

  // ── Render ──────────────────────────────────────────────

  if (!isOpen) return null;

  const isTipoO = form.orden === "O";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <Key size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              {isEdit ? "Editar Acceso" : "Nuevo Acceso"}
            </span>
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

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-16" data-testid="modal-loading">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* ── Form ── */}
        {!loading && (
          <div className="p-4">
            <div className="space-y-3">
              {/* Tipo */}
              <div>
                <label
                  htmlFor="cmbTipox"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Tipo
                </label>
                <select
                  id="cmbTipox"
                  value={form.orden}
                  onChange={(e) => updateField("orden", e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                >
                  <option value="">Todos</option>
                  <option value="M">Menu</option>
                  <option value="O">Tipo</option>
                </select>
              </div>

              {/* Menú */}
              <div>
                <label
                  htmlFor="cmbMenux"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Menú
                </label>
                <select
                  id="cmbMenux"
                  value={form.menu}
                  onChange={(e) => handleMenuChange(e.target.value)}
                  disabled={isTipoO}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">Todos</option>
                  {menus.map((m) => (
                    <option key={m.id_acceso} value={m.id_acceso}>
                      {m.nommenu}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pantalla */}
              <div>
                <label
                  htmlFor="cmbPantallax"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Pantalla
                </label>
                <select
                  id="cmbPantallax"
                  value={form.pantalla}
                  onChange={(e) => updateField("pantalla", e.target.value)}
                  disabled={isTipoO || (modulos.length === 0 && !modulosLoading)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">Todos</option>
                  {modulosLoading ? (
                    <option value="" disabled>
                      Cargando...
                    </option>
                  ) : (
                    modulos.map((m) => (
                      <option key={m.id_acceso} value={m.id_acceso}>
                        {m.nommenu}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Acceso */}
              <div>
                <label
                  htmlFor="txtidacceso"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Acceso
                </label>
                <input
                  id="txtidacceso"
                  type="text"
                  value={form.id_acceso}
                  onChange={(e) => updateField("id_acceso", e.target.value)}
                  maxLength={8}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>

              {/* Nombre */}
              <div>
                <label
                  htmlFor="txtNomacceso"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Nombre
                </label>
                <input
                  id="txtNomacceso"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => updateField("nombre", e.target.value)}
                  maxLength={100}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>

              {/* Ícono */}
              <div>
                <label
                  htmlFor="txtIcono"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Ícono
                </label>
                <input
                  id="txtIcono"
                  type="text"
                  value={form.icono}
                  onChange={(e) => updateField("icono", e.target.value)}
                  maxLength={50}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>

              {/* Formulario */}
              <div>
                <label
                  htmlFor="txtDoform"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Formulario
                </label>
                <input
                  id="txtDoform"
                  type="text"
                  value={form.doform}
                  onChange={(e) => updateField("doform", e.target.value)}
                  maxLength={50}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>

              {/* Id Objeto */}
              <div>
                <label
                  htmlFor="txtIdobjeto"
                  className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
                >
                  Id Objeto
                </label>
                <input
                  id="txtIdobjeto"
                  type="text"
                  value={form.id_objeto}
                  onChange={(e) => updateField("id_objeto", e.target.value)}
                  maxLength={50}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="chkestado"
                  type="checkbox"
                  checked={form.nestado}
                  onChange={(e) => updateField("nestado", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <label
                  htmlFor="chkestado"
                  className="text-[11px] font-medium text-slate-600 select-none"
                >
                  Estado
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 rounded-b-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              {saving ? "Guardando..." : "Grabar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
