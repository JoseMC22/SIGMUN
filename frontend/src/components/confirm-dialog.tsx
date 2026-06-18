"use client";

import { X, AlertTriangle } from "lucide-react";

// ── Props ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ── Dialog ────────────────────────────────────────────────

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Sí",
  cancelLabel = "No",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !loading) onCancel();
      }}
      tabIndex={-1}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <AlertTriangle size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              {title}
            </span>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
