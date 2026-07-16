"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2, AlertCircle, FileText, Check, CheckCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function NuevoConvenioEstadoModal({ isOpen, onClose, onSaved }: Props) {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    } else {
      setCodigo("");
      setDescripcion("");
      setActivo(true);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!codigo.trim() || !descripcion.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (codigo.length < 3 || codigo.length > 10) {
      setError("El código debe tener entre 3 y 10 caracteres");
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(codigo)) {
      setError("El código solo puede contener letras y números");
      return;
    }

    if (descripcion.length > 255) {
      setError("La descripción no puede exceder 255 caracteres");
      return;
    }

    if (/[<>]/.test(descripcion)) {
      setError("No se permiten etiquetas HTML en la descripción");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/mantenimiento-tablas/mantenimiento-estado-convenios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigo.toUpperCase(),
          descripcion: descripcion.trim(),
          activo: activo ? "1" : "0",
        }),
      });

      if (res.status === 409) {
        setError(`El código '${codigo.toUpperCase()}' ya existe`);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar el registro");
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Nuevo Estado de Convenio</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || success}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4" ref={formRef}>
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 animate-fade-in">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-700">Estado de convenio creado correctamente</span>
            </div>
          )}

          {error && !success && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 animate-fade-in">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}

          {/* Código */}
          <div>
            <label htmlFor="nuevo-codigo" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Código *
            </label>
            <input
              ref={firstInputRef}
              id="nuevo-codigo"
              type="text"
              value={codigo.toUpperCase()}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={10}
              required
              disabled={success}
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 uppercase placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
              placeholder="Ej: ACT"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">3-10 caracteres, solo letras y números</p>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="nuevo-descripcion" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Descripción *
            </label>
            <input
              id="nuevo-descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={255}
              required
              disabled={success}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
              placeholder="Descripción del estado del convenio"
            />
          </div>

          {/* Activo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo-nuevo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              disabled={success}
              className="w-4 h-4 rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
            />
            <label htmlFor="activo-nuevo" className="text-[11px] text-slate-600 cursor-pointer select-none">
              Activo
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || success}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success || !codigo.trim() || !descripcion.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sat-cyan text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
              {saving ? "Guardando..." : success ? "¡Guardado!" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}