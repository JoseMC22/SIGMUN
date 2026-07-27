"use client";

import { useEffect } from "react";
import { X, FileText } from "lucide-react";
import type { AlcabalaItem } from "@/actions/alcabala/determinar-alcabala";

// ── Types ──────────────────────────────────────────────────

interface DetalleAlcabalaProps {
  open: boolean;
  onClose: () => void;
  alcabala: AlcabalaItem | null;
}

// ── Helpers ────────────────────────────────────────────────

function mapEstado(estado: string): string {
  const num = Number(estado);
  switch (num) {
    case 1:
      return "Activo";
    case 2:
      return "Anulado";
    case 0:
      return "Inactivo";
    default:
      return estado || "Sin estado";
  }
}

function estadoBadgeClass(estado: string): string {
  const num = Number(estado);
  switch (num) {
    case 1:
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case 2:
      return "bg-red-50 text-red-700 ring-red-600/20";
    case 0:
      return "bg-slate-100 text-slate-500 ring-slate-500/20";
    default:
      return "bg-slate-100 text-slate-500 ring-slate-500/20";
  }
}

// ── Style tokens ───────────────────────────────────────────

const fieldLabel =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 leading-none";

const fieldValue =
  "text-[12px] font-medium text-slate-700 bg-slate-50 rounded px-2.5 py-1.5 border border-slate-200 min-h-[30px] flex items-center";

// ── Component ──────────────────────────────────────────────

export default function DetalleAlcabala({
  open,
  onClose,
  alcabala,
}: DetalleAlcabalaProps) {
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

  if (!open || !alcabala) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sat-cyan/10">
              <FileText size={14} className="text-sat-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Detalle de Alcabala
              </h2>
              <p className="text-[10px] text-slate-400">
                ID {alcabala.idAlcabala}
              </p>
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
        <div className="overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* ID Alcabala */}
            <div>
              <span className={fieldLabel}>ID Alcabala</span>
              <div className={`${fieldValue} font-mono`}>
                {alcabala.idAlcabala}
              </div>
            </div>

            {/* Fecha Registro */}
            <div>
              <span className={fieldLabel}>Fecha Registro</span>
              <div className={fieldValue}>{alcabala.fechaRegistro}</div>
            </div>

            {/* Monto Alcabala */}
            <div>
              <span className={fieldLabel}>Monto Alcabala</span>
              <div className={`${fieldValue} font-mono`}>
                S/ {alcabala.montoAlcabala.toFixed(2)}
              </div>
            </div>

            {/* Código Predio */}
            <div>
              <span className={fieldLabel}>Código Predio</span>
              <div className={`${fieldValue} font-mono`}>
                {alcabala.codPred}
              </div>
            </div>

            {/* Año Predio */}
            <div>
              <span className={fieldLabel}>Año Predio</span>
              <div className={fieldValue}>{alcabala.anioPred}</div>
            </div>

            {/* Código Venta */}
            <div>
              <span className={fieldLabel}>Código Venta</span>
              <div className={`${fieldValue} font-mono`}>
                {alcabala.codigoVenta}
              </div>
            </div>

            {/* Estado */}
            <div className="col-span-2">
              <span className={fieldLabel}>Estado</span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${estadoBadgeClass(
                    alcabala.estado,
                  )}`}
                >
                  {mapEstado(alcabala.estado)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
