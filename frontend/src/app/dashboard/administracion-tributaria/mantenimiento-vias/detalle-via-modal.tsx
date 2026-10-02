"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DetalleViaModal({ isOpen, onClose }: Props) {
  // Escape cierra SOLO este modal si es el tope de la pila.
  const modalId = useModalStack(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      tabIndex={-1}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200"
        data-testid="via-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
            <h2 className="text-sm font-bold text-white font-outfit tracking-tight">
              Detalle de Vía
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar vía"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — contenido TBD */}
        <div className="p-4">
          <p className="text-sm text-slate-500 text-center py-8">
            Contenido pendiente de definir
          </p>
        </div>
      </div>
    </div>
  );
}
