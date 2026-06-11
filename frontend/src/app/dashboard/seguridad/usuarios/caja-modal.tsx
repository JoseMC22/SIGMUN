"use client";

import { useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { crearCajaAction } from "@/actions/usuarios";

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────

export default function CajaModal({ isOpen, onClose, onSaved }: Props) {
  const [caja, setCaja] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): string | null => {
    if (!caja || caja.length !== 3) return "Debe ingresar un código de 3 dígitos";
    if (!/^\d{3}$/.test(caja)) return "Solo se permiten números";
    return null;
  };

  const handleSave = async () => {
    const v = validate();
    if (v) { setError(v); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await crearCajaAction(caja);
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h3 className="text-xs font-bold text-white font-outfit tracking-tight">
              Nueva Caja
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
              Ingresar Caja
            </label>
            <input
              type="text"
              maxLength={3}
              value={caja}
              onChange={(e) => { setCaja(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              className={`w-full rounded-md border bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-300 focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
              }`}
              placeholder="069"
              autoFocus
            />
            {error && (
              <p className="mt-0.5 text-[9px] text-red-500">{error}</p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-white px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Salir
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? "Guardando..." : "Grabar"}
          </button>
        </div>
      </div>
    </div>
  );
}
