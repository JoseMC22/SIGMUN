"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { getPcName } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Validación inline (previa al POST; el backend re-valida con Zod).
interface FormErrors {
  criterio?: string;
  descripcion?: string;
  fdesde?: string;
  fhasta?: string;
}

// Contrato del POST /api/mantenimiento-tablas/ordenanzas (T5):
// { criterio, descripcion, fdesde, fhasta, observacion, estacion }.
// estacion se resuelve desde la sesión del cliente (patrón baja-predio-modal).
export default function NuevaOrdenanzaModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [criterio, setCriterio] = useState("11");
  const [descripcion, setDescripcion] = useState("");
  const [fdesde, setFdesde] = useState("");
  const [fhasta, setFhasta] = useState("");
  const [observacion, setObservacion] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [estacion, setEstacion] = useState("");

  // Reset del alta + resolución de estación al abrir (patrón
  // baja-predio-modal): primero el pcName de localStorage y, si la sesión
  // lo trae, el hostname de sesión (éste último gana).
  useEffect(() => {
    if (!isOpen) return;
    setCriterio("11");
    setDescripcion("");
    setFdesde("");
    setFhasta("");
    setObservacion("");
    setErrors({});
    setError(null);
    setSaving(false);
    setEstacion("");
    const pcFromStorage = getPcName?.() ?? "";
    if (pcFromStorage) setEstacion(pcFromStorage);
    checkSessionAction().then((s) => {
      if (s?.hostname) setEstacion(s.hostname);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (criterio.trim() === "") {
      errs.criterio = "El criterio es obligatorio";
    } else if (!Number.isInteger(Number(criterio))) {
      errs.criterio = "El criterio debe ser un número entero";
    }
    if (!descripcion.trim()) {
      errs.descripcion = "La descripción es obligatoria";
    }
    if (!fdesde) {
      errs.fdesde = "La vigencia desde es obligatoria";
    }
    if (!fhasta) {
      errs.fhasta = "La vigencia hasta es obligatoria";
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const errs = validate();
    setErrors(errs);
    setError(null);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/mantenimiento-tablas/ordenanzas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterio: Number(criterio),
          descripcion: descripcion.trim(),
          fdesde,
          fhasta,
          observacion,
          estacion,
        }),
      });

      if (!res.ok) {
        // 4xx del backend → mensaje del body (Zod/NestJS: message string o
        // string[] de errores de validación); sin body JSON → genérico.
        let msg = "Error al guardar la ordenanza";
        try {
          const body = await res.json();
          const m = body?.message;
          if (typeof m === "string" && m.trim()) {
            msg = m;
          } else if (Array.isArray(m) && m.length > 0) {
            msg = m.join("; ");
          }
        } catch {
          // Body no JSON: mensaje genérico
        }
        setError(msg);
        return;
      }

      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 transition focus:outline-none ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
        : "border-slate-300 bg-white focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Nueva ordenanza</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}

          {/* Criterio */}
          <div>
            <label
              htmlFor="nueva-criterio"
              className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
            >
              Criterio *
            </label>
            <input
              id="nueva-criterio"
              type="number"
              step="1"
              value={criterio}
              onChange={(e) => setCriterio(e.target.value)}
              placeholder="Ej: 11"
              className={inputClass(errors.criterio)}
              autoFocus
            />
            {errors.criterio && (
              <p className="mt-1 text-[10px] font-medium text-red-500">
                {errors.criterio}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="nueva-descripcion"
              className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
            >
              Descripción *
            </label>
            <input
              id="nueva-descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Pronto Pago"
              className={inputClass(errors.descripcion)}
            />
            {errors.descripcion && (
              <p className="mt-1 text-[10px] font-medium text-red-500">
                {errors.descripcion}
              </p>
            )}
          </div>

          {/* Vigencia (desde / hasta) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="nueva-fdesde"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Vigencia desde *
              </label>
              <input
                id="nueva-fdesde"
                type="date"
                value={fdesde}
                onChange={(e) => setFdesde(e.target.value)}
                className={inputClass(errors.fdesde)}
              />
              {errors.fdesde && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.fdesde}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="nueva-fhasta"
                className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Vigencia hasta *
              </label>
              <input
                id="nueva-fhasta"
                type="date"
                value={fhasta}
                onChange={(e) => setFhasta(e.target.value)}
                className={inputClass(errors.fhasta)}
              />
              {errors.fhasta && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  {errors.fhasta}
                </p>
              )}
            </div>
          </div>

          {/* Observación (opcional) */}
          <div>
            <label
              htmlFor="nueva-observacion"
              className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
            >
              Observación
            </label>
            <textarea
              id="nueva-observacion"
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Opcional"
              className={`${inputClass()} resize-none`}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
