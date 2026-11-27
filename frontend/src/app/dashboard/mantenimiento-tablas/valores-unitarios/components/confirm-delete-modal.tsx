"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { ValorUnitarioRow } from "../types";

interface Props {
  isOpen: boolean;
  row: ValorUnitarioRow | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  row,
  onConfirm,
  onCancel,
}: Props) {
  const [saving, setSaving] = useState(false);

  if (!isOpen || !row) return null;

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vu-delete-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id="vu-delete-title" className="text-sm font-semibold text-slate-800">
            Confirmar eliminación
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 rounded-full bg-red-100 p-3">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              ¿Eliminar el valor{" "}
              <span className="font-bold">
                {row.region}-{row.anno}-{row.codi}
              </span>
              ?
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Esta acción elimina la fila físicamente.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 active:scale-[0.98] disabled:opacity-50"
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
