"use client";

import { useEffect, useState } from "react";
import { X, Loader2, FileText, Printer } from "lucide-react";

// ── Props ──────────────────────────────────────────────────

interface DeclaracionPdfModalProps {
  open: boolean;
  html: string | null;
  idAlcabala: number;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────

export default function DeclaracionPdfModal({
  open,
  html,
  idAlcabala,
  onClose,
}: DeclaracionPdfModalProps) {
  const [win, setWin] = useState<Window | null>(null);

  // Escape closes only this modal (topmost layer).
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

  // Abrir HTML en ventana nueva cuando hay contenido
  useEffect(() => {
    if (!html) return;
    const newWin = window.open(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      "DeclaracionAlcabala",
      "width=800,height=600,scrollbars=yes,resize=yes"
    );
    if (newWin) setWin(newWin);
    else {
      // Fallback: si bloqueador de popups, mostrar en iframe dentro del modal
      const newWin2 = window.open("", "_blank");
      if (newWin2) setWin(newWin2);
    }
    return () => {
      if (win) win.close();
      setWin(null);
    };
  }, [html, win]);

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
          {html ? (
            <div className="p-4">
              {win ? (
                <>
                  <p className="text-sm text-slate-500">Ventana abierta — usa el botón imprimir de la ventana.</p>
                  <hr className="my-3 border-b border-slate-200" />
                  <button
                    type="button"
                    onClick={() => win?.print()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
                    aria-label="Imprimir declaración"
                  >
                    <Printer size={13} /> Imprimir desde ventana
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition:hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
                    aria-label="Cerrar"
                  >
                    Cerrar ventana
                  </button>
                </>
              ) : (
                <Loader2 size={20} className="animate-spin text-sat-cyan" />
                <span className="ml-2 text-xs text-slate-500">Cargando documento...</span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs text-slate-500">Cargando documento...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}