"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  anno: number | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ isOpen, anno, onConfirm, onCancel }: Props) {
  const [saving, setSaving] = useState(false);

  if (!isOpen || anno === null) return null;

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Confirmar eliminación</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="mb-3 rounded-full bg-red-100 p-3">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              ¿Estás seguro de eliminar la UIT del año <span className="font-bold">{anno}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Esta acción desactivará el registro (cambio de estado)
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
