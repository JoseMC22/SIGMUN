"use client";

import { useEffect, useState } from "react";
import { X, Loader2, FileText } from "lucide-react";

// ── Props ──────────────────────────────────────────────────

interface DeclaracionPdfModalProps {
  open: boolean;
  base64: string | null;
  idAlcabala: number;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────

export default function DeclaracionPdfModal({
  open,
  base64,
  idAlcabala,
  onClose,
}: DeclaracionPdfModalProps) {
  const [url, setUrl] = useState<string | null>(null);

  // Build a blob URL from the base64 PDF and revoke it on cleanup.
  useEffect(() => {
    if (!open || !base64) {
      setUrl(null);
      return;
    }
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => {
        URL.revokeObjectURL(u);
        setUrl(null);
      };
    } catch {
      setUrl(null);
    }
  }, [open, base64]);

  // Escape closes only this modal (topmost layer). stopPropagation prevents
  // the underlying AlcabalasModal from also closing.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <FileText size={14} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Declaración de Alcabala
              </h2>
              <p className="text-[10px] text-slate-400">ID {idAlcabala}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          {url ? (
            <iframe
              src={url}
              title="Declaración de Alcabala PDF"
              className="h-[75vh] w-full border-0"
            />
          ) : (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs text-slate-500">
                Cargando documento...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
