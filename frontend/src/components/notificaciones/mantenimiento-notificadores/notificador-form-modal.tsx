"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, AlertCircle } from "lucide-react";
import {
  guardarNotificadorAction,
  actualizarNotificadorAction,
  type NotificadorRow,
} from "@/actions/notificaciones/mantenimiento-notificadores";

// ─── Props ───────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  mode: "nuevo" | "modificar";
  initial?: NotificadorRow;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Modal ───────────────────────────────────────────────────

export default function NotificadorFormModal({
  isOpen,
  mode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const [iniciales, setIniciales] = useState("");
  const [notificador, setNotificador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIniciales(initial?.iniciales ?? "");
      setNotificador(initial?.notificador ?? "");
      setError(null);
      setSaving(false);
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ini = iniciales.trim();
    const nom = notificador.trim();

    // Required validation — block before any server call.
    if (!ini) {
      setError("El campo Iniciales es requerido");
      return;
    }
    if (!nom) {
      setError("El campo Notificador es requerido");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res =
        mode === "nuevo"
          ? await guardarNotificadorAction({ iniciales: ini, notificador: nom })
          : await actualizarNotificadorAction({
              id_notificador: initial!.codigo_autoridad,
              notificador: nom,
            });

      if (res.success) {
        onSaved();
        onClose();
      } else {
        setError(res.error ?? "Error al guardar el notificador");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <span className="text-sm font-semibold text-white tracking-tight">
            {mode === "nuevo" ? "Nuevo Notificador" : "Modificar Notificador"}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertCircle size={14} />
              <span className="text-[11px] font-medium">{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="iniciales"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Iniciales
            </label>
            <input
              id="iniciales"
              type="text"
              value={iniciales}
              disabled={mode === "modificar"}
              onChange={(e) => setIniciales(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              placeholder="Ej. ABC"
            />
          </div>

          <div>
            <label
              htmlFor="notificador"
              className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none"
            >
              Notificador
            </label>
            <input
              id="notificador"
              type="text"
              value={notificador}
              onChange={(e) => setNotificador(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              placeholder="Nombre del notificador"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
