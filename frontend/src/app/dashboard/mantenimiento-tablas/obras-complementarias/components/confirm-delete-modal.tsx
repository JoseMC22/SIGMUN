"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { ObraComplementariaRow } from "../types";

interface Props {
  isOpen: boolean;
  row: ObraComplementariaRow | null;
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
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oc-delete-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onCancel();
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id="oc-delete-title" className="text-sm font-semibold text-slate-800">
            Confirmar baja lógica
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 rounded-full bg-red-100 p-3">
              <AlertTriangle size={24} className="text-red-700" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              ¿Dar de baja la obra{" "}
              <span className="font-bold">
                {row.id_instala}-{row.anno}-{row.categ?.trim() || "sin categoría"}
              </span>
              ?
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              La operación actualiza nestado = 0. La fila no se elimina
              físicamente y dejará de aparecer en el listado de activos.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sat-navy focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-red-700 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
              {saving ? "Dando de baja..." : "Sí, dar de baja"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
