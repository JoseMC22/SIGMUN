"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy, Loader2, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  sourceAnno: string;
  years: string[];
  endpoint: string;
  onClose: () => void;
  onSuccess: (targetAnno: string) => void;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder-slate-500 transition-colors focus-visible:border-sat-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-1";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-600";

function validate(annoOrigen: string, annoDestino: string): string | null {
  if (!/^\d{4}$/.test(annoOrigen.trim())) {
    return "El año origen debe tener 4 dígitos";
  }
  if (!/^\d{4}$/.test(annoDestino.trim())) {
    return "El año destino debe tener 4 dígitos";
  }
  if (annoOrigen.trim() === annoDestino.trim()) {
    return "El año origen y destino deben ser distintos";
  }
  return null;
}

export default function CopyYearModal({
  isOpen,
  sourceAnno,
  years,
  endpoint,
  onClose,
  onSuccess,
}: Props) {
  const [annoOrigen, setAnnoOrigen] = useState(sourceAnno);
  const [annoDestino, setAnnoDestino] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAnnoOrigen(sourceAnno);
    setAnnoDestino("");
    setError(null);
    setCopying(false);
  }, [isOpen, sourceAnno]);

  if (!isOpen) return null;

  const titleId = "copy-year-modal-title";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationMessage = validate(annoOrigen, annoDestino);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setCopying(true);
    try {
      const res = await fetch(`${endpoint}/copy-year`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anno_origen: annoOrigen.trim(),
          anno_destino: annoDestino.trim(),
        }),
      });

      if (res.status === 400) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message ?? "Año origen o destino inválido");
        return;
      }
      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message ?? "El año destino ya tiene registros");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message ?? "Error al copiar el año");
        return;
      }
      onSuccess(annoDestino.trim());
    } catch {
      setError("Error de conexión");
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !copying) onClose();
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-slate-800">
            Copiar año
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={copying}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
            >
              <AlertCircle
                size={14}
                className="shrink-0 text-red-700"
                aria-hidden="true"
              />
              <span className="text-[11px] text-red-700">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="oc-copy-origen" className={labelClass}>
              Año origen
            </label>
            <select
              id="oc-copy-origen"
              value={annoOrigen}
              onChange={(event) => setAnnoOrigen(event.target.value)}
              className={inputClass}
              disabled={copying}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="oc-copy-destino" className={labelClass}>
              Año destino
            </label>
            <input
              id="oc-copy-destino"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={annoDestino}
              onChange={(event) => setAnnoDestino(event.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 2028"
              className={inputClass}
              disabled={copying}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={copying}
              className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={copying}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-sat-navy px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy disabled:opacity-50"
            >
              {copying ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )}
              {copying ? "Copiando..." : "Copiar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
