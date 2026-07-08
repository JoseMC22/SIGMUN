"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Save } from "lucide-react";
import { getArancelDetalleAction, saveArancelAction } from "@/actions/administracion-tributaria/mantenimiento-vias";
import type { ArancelDetalleRow } from "@/actions/administracion-tributaria/mantenimiento-vias";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  codVia: string;
  idTbl: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2000 + 1 }, (_, i) => String(2000 + i));

interface ArancelForm {
  anno: string;
  arancel: string;
  nestado: string;
}

export default function ArancelEditModal({ isOpen, onClose, onSaved, codVia, idTbl }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arancel, setArancel] = useState<ArancelDetalleRow | null>(null);
  const [form, setForm] = useState<ArancelForm>({ anno: String(CURRENT_YEAR), arancel: "", nestado: "1" });

  const isCreate = !idTbl;

  // ── Reset state and load data on open ──
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSaving(false);

    if (isCreate) {
      // Nuevo: año actual por defecto, arancel null, no loading
      setArancel(null);
      setForm({ anno: String(CURRENT_YEAR), arancel: "", nestado: "1" });
      setLoading(false);
      return;
    }

    // Editar: cargar detalle
    let cancelled = false;
    setLoading(true);

    getArancelDetalleAction(codVia, idTbl).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setArancel(res.data);
        setForm({
          anno: res.data.anno,
          arancel: String(res.data.arancel ?? ""),
          nestado: String(res.data.nestado ?? 1),
        });
      } else {
        setError(res.error);
      }
    }).catch(() => {
      if (!cancelled) setError("Error de conexión");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, idTbl, codVia]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const handleChange = (field: keyof ArancelForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await saveArancelAction(codVia, {
        id_tbl: String(idTbl),
        anno: form.anno,
        arancel: form.arancel,
        nestado: form.nestado,
      });

      if (!res.success) {
        setError(res.error);
        setSaving(false);
        return;
      }

      setSaving(false);
      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  const selectClass =
    "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  const labelClass =
    "block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200"
        data-testid="arancel-edit-modal"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              {isCreate ? "Nuevo Arancel" : "Editar Arancel"}
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
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-sm text-slate-500">Cargando...</span>
            </div>
          ) : error && !arancel && !isCreate ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-red-600">{error}</p>
            </div>
          ) : arancel || isCreate ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSave(); }}
              className="space-y-3"
            >
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              {/* Read-only: ID y Código Vía (desde props, no del SP) */}
              <div className={isCreate ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
                {!isCreate && (
                  <div>
                    <label className={labelClass}>ID</label>
                    <input type="text" value={idTbl} disabled className={inputClass} />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Código Vía</label>
                  <input type="text" value={codVia} disabled className={inputClass} />
                </div>
              </div>

              {/* Editables: Año y Arancel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Año</label>
                  <select
                    value={form.anno}
                    onChange={(e) => handleChange("anno", e.target.value)}
                    className={selectClass}
                    required
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Arancel</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.arancel}
                    onChange={(e) => handleChange("arancel", e.target.value)}
                    className={inputClass}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={form.nestado}
                  onChange={(e) => handleChange("nestado", e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="1">1 — Activo</option>
                  <option value="0">0 — Inactivo</option>
                </select>
              </div>

              {/* Footer in-form */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
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
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
