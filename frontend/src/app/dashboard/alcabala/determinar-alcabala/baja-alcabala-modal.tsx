"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type {
  AlcabalaItem,
  BajaAlcabalaResult,
} from "@/actions/alcabala/determinar-alcabala";

// ── Props ──────────────────────────────────────────────────

interface BajaAlcabalaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<BajaAlcabalaResult> | void;
  alcabala: AlcabalaItem | null;
}

// ── Style tokens (matching crear-alcabala-modal) ───────────

const fieldLabel =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

const primaryBtnClass =
  "inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed";

const secondaryBtnClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]";

// ── Component ──────────────────────────────────────────────

export default function BajaAlcabalaModal({
  open,
  onClose,
  onConfirm,
  alcabala,
}: BajaAlcabalaModalProps) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setMotivo("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  // Escape key: close only this modal (stop propagation to parents).
  // Ignored while submitting so an in-flight baja cannot be interrupted.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (submitting) return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (submitting || !motivo.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await onConfirm(motivo.trim());
      const success =
        result && typeof result === "object" ? result.success : result !== false;
      if (!success) {
        const backendError =
          result && typeof result === "object" ? result.error : undefined;
        setError(
          backendError ||
            "No se pudo dar de baja la alcabala. Intente nuevamente.",
        );
        setSubmitting(false);
      } else {
        // Parent closes the modal on success.
        setSubmitting(false);
      }
    } catch {
      setError("Error de conexión");
      setSubmitting(false);
    }
  };

  const handleBackdrop = () => {
    if (!submitting) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdrop}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">
            Dar de baja alcabala
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          {alcabala && (
            <p className="text-[11px] text-slate-500">
              ID Alcabala:{" "}
              <span className="font-mono font-medium text-slate-700">
                {alcabala.idAlcabala}
              </span>
            </p>
          )}

          <div>
            <label htmlFor="motivoBaja" className={fieldLabel}>
              Motivo de baja
            </label>
            <textarea
              id="motivoBaja"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="Ingrese el motivo de la baja"
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={secondaryBtnClass}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !motivo.trim()}
            aria-label="Confirmar baja"
            className={primaryBtnClass}
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Procesando...
              </>
            ) : (
              "Confirmar baja"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
