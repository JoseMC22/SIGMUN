"use client";

import { X, Key } from "lucide-react";

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Modal Shell ──────────────────────────────────────────

export default function AccesoEditModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <Key size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              Acceso
            </span>
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

        {/* ── Body (placeholder) ── */}
        <div className="p-4">
          {/* Form fields will be added in a future phase */}
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 rounded-b-xl">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
